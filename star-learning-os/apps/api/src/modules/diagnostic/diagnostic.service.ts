import { Injectable } from '@nestjs/common';
import type { DiagnosticItem, Prisma } from '@prisma/client';
import type { DiagnosticAttemptResponse, DiagnosticNextResponse } from '@star/contracts';
import {
  estimatePlacement,
  isMinor,
  levelFromWritingScore,
  minCefr,
  scoreWritingHeuristic,
  type CefrLevel,
  type PlacementResponse,
} from '@star/domain';
import type { EnrollmentWithLearner } from '../../common/access.service';
import { AppError, notFound } from '../../common/errors';
import type { SessionUser } from '../../common/session';
import { AuditService } from '../audit/audit.service';
import { OutboxService } from '../audit/outbox.service';
import { PrismaService } from '../../prisma/prisma.service';

interface DiagnosticItemPrompt {
  stem: string;
  options: string[];
}

interface DiagnosticAnswerKey {
  correctIndex: number;
}

const MIN_ANSWER_RATIO = 0.75;

@Injectable()
export class DiagnosticService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly outboxService: OutboxService,
    private readonly auditService: AuditService,
  ) {}

  async startOrResume(enrollment: EnrollmentWithLearner): Promise<DiagnosticAttemptResponse> {
    if (enrollment.status !== 'pending_diagnostic') {
      throw new AppError('DIAGNOSTIC_ALREADY_COMPLETED', 409, 'El diagnóstico de esta inscripción ya se completó');
    }

    let attempt = await this.prisma.diagnosticAttempt.findFirst({
      where: { enrollmentId: enrollment.id, status: 'in_progress' },
    });
    if (!attempt) {
      attempt = await this.prisma.diagnosticAttempt.create({
        data: { enrollmentId: enrollment.id },
      });
      await this.auditService.record({
        actorId: enrollment.learnerId,
        action: 'diagnostic.started',
        objectType: 'diagnostic_attempt',
        objectId: attempt.id,
      });
    }
    return this.toResponse(attempt.id);
  }

  async answer(
    actor: SessionUser,
    attemptId: string,
    itemCode: string,
    selectedIndex: number,
  ): Promise<{ answeredCount: number; totalItems: number }> {
    const attempt = await this.getAttemptForActor(actor, attemptId);
    if (attempt.status !== 'in_progress') {
      throw new AppError('DIAGNOSTIC_ALREADY_COMPLETED', 409, 'Este intento ya está cerrado');
    }
    const item = await this.prisma.diagnosticItem.findUnique({ where: { code: itemCode } });
    if (!item) throw notFound('Ítem de diagnóstico no encontrado');
    if (item.stage === 'writing') {
      throw new AppError('VALIDATION_FAILED', 400, 'La muestra de escritura se envía por su propio paso');
    }

    const answerKey = item.answerKey as unknown as DiagnosticAnswerKey;
    const correct = selectedIndex === answerKey.correctIndex;

    await this.prisma.diagnosticResponse.upsert({
      where: { attemptId_itemCode: { attemptId, itemCode } },
      create: { attemptId, itemCode, skill: item.skill, selectedIndex, correct },
      update: { selectedIndex, correct },
    });

    const [answeredCount, totalItems] = await Promise.all([
      this.prisma.diagnosticResponse.count({ where: { attemptId } }),
      this.prisma.diagnosticItem.count({ where: { stage: 'router' } }),
    ]);
    return { answeredCount, totalItems };
  }

  /** Muestra de Writing del StarMap (§7.1/§7.2), con score heurístico provisional. */
  async submitWriting(
    actor: SessionUser,
    attemptId: string,
    itemCode: string,
    text: string,
  ): Promise<{ wordCount: number; received: true }> {
    const attempt = await this.getAttemptForActor(actor, attemptId);
    if (attempt.status !== 'in_progress') {
      throw new AppError('DIAGNOSTIC_ALREADY_COMPLETED', 409, 'Este intento ya está cerrado');
    }
    const item = await this.prisma.diagnosticItem.findUnique({ where: { code: itemCode } });
    if (!item || item.stage !== 'writing') throw notFound('Tarea de escritura no encontrada');

    const spec = (item.answerKey as { rubricSpec?: { minWords: number; requiredElements: string[] } })
      .rubricSpec ?? { minWords: 40, requiredElements: [] };
    const result = scoreWritingHeuristic(text, spec);

    await this.prisma.diagnosticResponse.upsert({
      where: { attemptId_itemCode: { attemptId, itemCode } },
      create: {
        attemptId,
        itemCode,
        skill: 'writing',
        textResponse: text,
        score: result.score,
      },
      update: { textResponse: text, score: result.score },
    });
    // No se revela el nivel por muestra: el resultado llega completo al final (§7.3).
    return { wordCount: result.wordCount, received: true };
  }

  /**
   * Paso multietapa (§7.2): router → módulo ajustado al nivel → writing → done.
   */
  async nextItems(actor: SessionUser, attemptId: string): Promise<DiagnosticNextResponse> {
    const attempt = await this.getAttemptForActor(actor, attemptId);
    const [items, responses] = await Promise.all([
      this.prisma.diagnosticItem.findMany({ orderBy: { orderIndex: 'asc' } }),
      this.prisma.diagnosticResponse.findMany({ where: { attemptId } }),
    ]);
    const answered = new Set(responses.map((r) => r.itemCode));
    const router = items.filter((i) => i.stage === 'router');
    const routerPending = router.filter((i) => !answered.has(i.code));

    const band = this.routerBand(router, responses);
    const moduleItems = items.filter((i) => i.stage === 'module' && i.level === band);
    const modulePending = moduleItems.filter((i) => !answered.has(i.code));
    const writingItems = items.filter((i) => i.stage === 'writing');
    const writingPending = writingItems.filter((i) => !answered.has(i.code));

    const totalPlanned = router.length + moduleItems.length + writingItems.length;
    const answeredCount = totalPlanned - routerPending.length - modulePending.length - writingPending.length;

    let stage: DiagnosticNextResponse['stage'];
    let stageLabel: string;
    let pending: DiagnosticItem[];
    if (attempt.status !== 'in_progress') {
      stage = 'done';
      stageLabel = 'Diagnóstico completado';
      pending = [];
    } else if (routerPending.length > 0) {
      stage = 'router';
      stageLabel = 'Etapa 1 · Exploración general';
      pending = routerPending;
    } else if (modulePending.length > 0) {
      stage = 'module';
      stageLabel = `Etapa 2 · Ajustada a tu nivel (${band})`;
      pending = modulePending;
    } else if (writingPending.length > 0) {
      stage = 'writing';
      stageLabel = 'Etapa 3 · Muestra de escritura';
      pending = writingPending;
    } else {
      stage = 'done';
      stageLabel = 'Listo para calcular tu resultado';
      pending = [];
    }

    return {
      attemptId,
      stage,
      stageLabel,
      items: pending.map((item) => {
        const prompt = item.prompt as { stem?: string; options?: string[]; instructions?: string; minWords?: number };
        return {
          code: item.code,
          skill: item.skill,
          kind: item.stage === 'writing' ? ('writing' as const) : ('mcq' as const),
          prompt: prompt.stem ?? prompt.instructions ?? '',
          options: prompt.options ?? [],
          minWords: prompt.minWords ?? null,
        };
      }),
      answeredCount,
      totalPlanned,
    };
  }

  /** Banda provisional del router para elegir el módulo (inferior/central/superior). */
  private routerBand(
    router: DiagnosticItem[],
    responses: Array<{ itemCode: string; correct: boolean | null; skill: DiagnosticItem['skill'] }>,
  ): 'A2' | 'B1' | 'B2' {
    const routerCodes = new Set(router.map((i) => i.code));
    const mcq = responses.filter((r) => routerCodes.has(r.itemCode) && r.correct !== null);
    if (mcq.length === 0) return 'B1';
    const estimate = estimatePlacement(
      mcq.map((r): PlacementResponse => ({ skill: r.skill, correct: r.correct === true })),
    );
    if (estimate.overall === 'B2' || estimate.overall === 'C1') return 'B2';
    if (estimate.overall === 'B1') return 'B1';
    return 'A2';
  }

  async complete(actor: SessionUser, attemptId: string): Promise<{ enrollmentId: string }> {
    const attempt = await this.getAttemptForActor(actor, attemptId);
    if (attempt.status !== 'in_progress') {
      throw new AppError('DIAGNOSTIC_ALREADY_COMPLETED', 409, 'Este intento ya está cerrado');
    }

    const [responses, items] = await Promise.all([
      this.prisma.diagnosticResponse.findMany({ where: { attemptId } }),
      this.prisma.diagnosticItem.findMany(),
    ]);
    const router = items.filter((i) => i.stage === 'router');
    const answered = new Set(responses.map((r) => r.itemCode));
    const band = this.routerBand(router, responses);
    const moduleItems = items.filter((i) => i.stage === 'module' && i.level === band);
    const writingResponse = responses.find((r) => r.textResponse !== null);

    // MAP-04: evidencia insuficiente deja el estado provisional, no inventa un nivel.
    const routerMissing = router.filter((i) => !answered.has(i.code)).length;
    const moduleMissing = moduleItems.filter((i) => !answered.has(i.code)).length;
    const required = Math.ceil(router.length * MIN_ANSWER_RATIO);
    if (router.length - routerMissing < required || moduleMissing > 0 || !writingResponse) {
      await this.prisma.diagnosticAttempt.update({
        where: { id: attemptId },
        data: { status: 'insufficient' },
      });
      throw new AppError('VALIDATION_FAILED', 422, 'Faltan etapas para estimar tu nivel con confianza', {
        routerMissing,
        moduleMissing,
        writingMissing: !writingResponse,
      });
    }

    const placementInput: PlacementResponse[] = responses
      .filter((response) => response.correct !== null)
      .map((response) => ({
        skill: response.skill,
        correct: response.correct === true,
      }));
    const mcqEstimate = estimatePlacement(placementInput);

    // La muestra de Writing entra al perfil por habilidad y a la regla de mínimo (§7.4).
    const writingLevel = levelFromWritingScore(writingResponse.score ?? 0);
    const overall: CefrLevel = minCefr(mcqEstimate.overall, writingLevel);
    const estimate = {
      ...mcqEstimate,
      overall,
      perSkill: { ...mcqEstimate.perSkill, writing: writingLevel },
      confidence: Math.min(1, mcqEstimate.confidence + 0.15),
    };

    const enrollment = await this.prisma.enrollment.findUniqueOrThrow({
      where: { id: attempt.enrollmentId },
      include: { learner: true },
    });
    const minor = enrollment.learner.ageBand ? isMinor(enrollment.learner.ageBand) : false;

    await this.prisma.$transaction(async (tx) => {
      await tx.diagnosticAttempt.update({
        where: { id: attemptId },
        data: {
          status: 'completed',
          completedAt: new Date(),
          result: estimate as unknown as Prisma.InputJsonObject,
        },
      });
      await tx.enrollment.update({
        where: { id: enrollment.id },
        data: {
          status: 'active',
          startedAt: new Date(),
          placement: estimate as unknown as Prisma.InputJsonObject,
          // El placement definitivo de un menor espera revisión pedagógica humana (MAP-10).
          placementProvisional: minor ? true : false,
          rowVersion: { increment: 1 },
        },
      });
      if (minor) {
        await tx.humanReview.create({
          data: {
            enrollmentId: enrollment.id,
            learnerId: enrollment.learnerId,
            caseType: 'placement',
            payload: {
              proposed: estimate,
              source: 'diagnostic_attempt',
              attemptId,
            } as unknown as Prisma.InputJsonObject,
          },
        });
        await this.outboxService.emitInTx(tx, {
          aggregateType: 'enrollment',
          aggregateId: enrollment.id,
          eventType: 'human_review.requested',
          payload: { caseType: 'placement' },
        });
      }
      await this.outboxService.emitInTx(tx, {
        aggregateType: 'enrollment',
        aggregateId: enrollment.id,
        eventType: 'placement.provisional',
        payload: { overall: estimate.overall, confidence: estimate.confidence },
      });
      await this.auditService.recordInTx(tx, {
        actorId: actor.id,
        action: 'diagnostic.completed',
        objectType: 'enrollment',
        objectId: enrollment.id,
        metadata: { overall: estimate.overall },
      });
    });

    return { enrollmentId: enrollment.id };
  }

  async toResponse(attemptId: string): Promise<DiagnosticAttemptResponse> {
    const attempt = await this.prisma.diagnosticAttempt.findUniqueOrThrow({
      where: { id: attemptId },
      include: { responses: true },
    });
    const items = await this.prisma.diagnosticItem.findMany({
      where: { stage: 'router' },
      orderBy: { orderIndex: 'asc' },
    });
    return {
      id: attempt.id,
      status: attempt.status,
      items: items.map((item) => {
        const prompt = item.prompt as unknown as DiagnosticItemPrompt;
        return { code: item.code, skill: item.skill, prompt: prompt.stem, options: prompt.options };
      }),
      answeredCount: attempt.responses.length,
    };
  }

  private async getAttemptForActor(actor: SessionUser, attemptId: string) {
    const attempt = await this.prisma.diagnosticAttempt.findUnique({
      where: { id: attemptId },
      include: { enrollment: true },
    });
    if (!attempt) throw notFound('Intento de diagnóstico no encontrado');
    if (actor.role !== 'staff' && attempt.enrollment.learnerId !== actor.id) {
      throw new AppError('FORBIDDEN', 403, 'No tienes acceso a este intento');
    }
    return attempt;
  }
}
