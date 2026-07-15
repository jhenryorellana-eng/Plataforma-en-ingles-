import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { DiagnosticAttemptResponse } from '@star/contracts';
import { estimatePlacement, isMinor, type PlacementResponse } from '@star/domain';
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

    const answerKey = item.answerKey as unknown as DiagnosticAnswerKey;
    const correct = selectedIndex === answerKey.correctIndex;

    await this.prisma.diagnosticResponse.upsert({
      where: { attemptId_itemCode: { attemptId, itemCode } },
      create: { attemptId, itemCode, skill: item.skill, selectedIndex, correct },
      update: { selectedIndex, correct },
    });

    const [answeredCount, totalItems] = await Promise.all([
      this.prisma.diagnosticResponse.count({ where: { attemptId } }),
      this.prisma.diagnosticItem.count(),
    ]);
    return { answeredCount, totalItems };
  }

  async complete(actor: SessionUser, attemptId: string): Promise<{ enrollmentId: string }> {
    const attempt = await this.getAttemptForActor(actor, attemptId);
    if (attempt.status !== 'in_progress') {
      throw new AppError('DIAGNOSTIC_ALREADY_COMPLETED', 409, 'Este intento ya está cerrado');
    }

    const [responses, totalItems] = await Promise.all([
      this.prisma.diagnosticResponse.findMany({ where: { attemptId } }),
      this.prisma.diagnosticItem.count(),
    ]);

    // MAP-04: evidencia insuficiente deja el estado provisional, no inventa un nivel.
    if (responses.length < Math.ceil(totalItems * MIN_ANSWER_RATIO)) {
      await this.prisma.diagnosticAttempt.update({
        where: { id: attemptId },
        data: { status: 'insufficient' },
      });
      throw new AppError('VALIDATION_FAILED', 422, 'Faltan respuestas para estimar tu nivel con confianza', {
        answered: responses.length,
        required: Math.ceil(totalItems * MIN_ANSWER_RATIO),
      });
    }

    const placementInput: PlacementResponse[] = responses.map((response) => ({
      skill: response.skill,
      correct: response.correct,
    }));
    const estimate = estimatePlacement(placementInput);

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
    const items = await this.prisma.diagnosticItem.findMany({ orderBy: { orderIndex: 'asc' } });
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
