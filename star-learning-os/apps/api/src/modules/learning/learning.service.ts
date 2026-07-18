import { createHash } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import type { Activity, Competency, Prisma } from '@prisma/client';
import type { SessionResponse, SubmissionRequest, SubmissionResult, TodayResponse } from '@star/contracts';
import {
  MASTERY_RULES,
  computeNextReviewAt,
  evaluateMastery,
  firstReviewIntervalDays,
  nextReviewIntervalDays,
  scoreGapFill,
  scoreMcq,
  scoreWritingHeuristic,
  usageAlertLevel,
  type EvidenceForMastery,
  type MasteryRuleConfig,
} from '@star/domain';
import { AccessService, type EnrollmentWithLearner } from '../../common/access.service';
import { AppError, notFound } from '../../common/errors';
import type { SessionUser } from '../../common/session';
import { AuditService } from '../audit/audit.service';
import { OutboxService } from '../audit/outbox.service';
import { EconomyService } from '../economy/economy.service';
import { PrismaService } from '../../prisma/prisma.service';
import { weeklyVoiceMinutesUsed } from '../voice/voice-usage';

const DETERMINISTIC_CONFIDENCE = 0.95;
const LOW_CONFIDENCE_REVIEW_THRESHOLD = 0.5;
const MINUTES_PER_REVIEW = 2;
const AT_RISK_OVERDUE_REVIEWS = 10;
const SUBMISSION_CORRECT_NOVAS = 10;
const COMBO_STREAK_MIN = 3;
const COMBO_BONUS_NOVAS = 5;
const LESSON_COMPLETE_NOVAS = 25;

interface ScoreOutcome {
  score: number;
  correct: boolean | null;
  confidence: number;
  dimensionScores: Record<string, number> | null;
  feedback: string;
}

@Injectable()
export class LearningService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessService: AccessService,
    private readonly outboxService: OutboxService,
    private readonly auditService: AuditService,
    private readonly economyService: EconomyService,
  ) {}

  // ---------------- Hoy ----------------

  async today(enrollment: EnrollmentWithLearner): Promise<TodayResponse> {
    if (enrollment.status !== 'active') {
      throw new AppError('ENROLLMENT_NOT_ACTIVE', 409, 'Completa el diagnóstico para ver tu plan del día');
    }

    const now = new Date();
    const [dueCount, lessons, states, entitlement, usedMinutes] = await Promise.all([
      this.prisma.reviewItem.count({
        where: { enrollmentId: enrollment.id, completedAt: null, dueAt: { lte: now } },
      }),
      this.prisma.lessonContract.findMany({
        // Solo contenido publicado por el docente llega al alumno (§8.1).
        where: { programVersionId: enrollment.programVersionId, status: 'published' },
        include: {
          unit: true,
          lessonCompetencies: { include: { competency: true } },
          activities: { select: { kind: true } },
        },
        orderBy: [{ unit: { orderIndex: 'asc' } }, { orderIndex: 'asc' }],
      }),
      this.prisma.competencyStateRecord.findMany({ where: { enrollmentId: enrollment.id } }),
      this.prisma.entitlement.findUnique({ where: { enrollmentId: enrollment.id } }),
      weeklyVoiceMinutesUsed(this.prisma, enrollment.id),
    ]);

    const stateByCompetency = new Map(states.map((state) => [state.competencyId, state.state]));
    const lessonPending = (lesson: (typeof lessons)[number]): boolean =>
      lesson.lessonCompetencies.some(
        (lc) => (stateByCompetency.get(lc.competencyId) ?? 'not_seen') !== 'mastered',
      );

    const mainLesson = lessons.find(
      (lesson) => lessonPending(lesson) && lesson.activities.some((a) => a.kind !== 'voice_mission'),
    );
    const voiceLesson = lessons.find(
      (lesson) => lessonPending(lesson) && lesson.activities.some((a) => a.kind === 'voice_mission'),
    );

    const blocks: TodayResponse['blocks'] = [];
    if (dueCount > 0) {
      blocks.push({
        kind: 'review',
        title: 'Repasos de hoy',
        description: `Tienes ${dueCount} competencias por recuperar antes de avanzar`,
        estimatedMinutes: dueCount * MINUTES_PER_REVIEW,
        href: `/v1/enrollments/${enrollment.id}/review-queue`,
        lessonContractId: null,
        dueCount,
      });
    }
    if (mainLesson) {
      blocks.push({
        kind: 'lesson',
        title: `${mainLesson.unit.name}`,
        description: mainLesson.objective,
        estimatedMinutes: Math.round(mainLesson.timeboxSeconds / 60),
        href: null,
        lessonContractId: mainLesson.id,
      });
    }
    if (voiceLesson && blocks.length < 3) {
      blocks.push({
        kind: 'voice_mission',
        title: 'Misión de voz con tu Mentor',
        description: voiceLesson.objective,
        estimatedMinutes: Math.round(voiceLesson.timeboxSeconds / 60),
        href: null,
        lessonContractId: voiceLesson.id,
      });
    }

    const includedMinutes = entitlement?.weeklyVoiceMinutes ?? 0;
    const criticalRemaining = await this.prisma.competency.count({
      where: {
        programVersionId: enrollment.programVersionId,
        criticality: 'critical',
        id: { notIn: states.filter((s) => s.state === 'mastered').map((s) => s.competencyId) },
      },
    });

    return {
      enrollmentId: enrollment.id,
      trajectoryStatus: dueCount > AT_RISK_OVERDUE_REVIEWS ? 'at_risk' : 'on_track',
      blocks: blocks.slice(0, 3),
      weeklyGoalHours: entitlement?.weeklyStudyHours ?? 0,
      voice: {
        includedMinutes,
        usedMinutes,
        alertLevel: usageAlertLevel(includedMinutes === 0 ? 1 : usedMinutes / includedMinutes),
      },
      dueReviews: dueCount,
      nextMilestone:
        criticalRemaining > 0
          ? `Dominar ${criticalRemaining} competencias críticas para tu próxima puerta de etapa`
          : 'Puerta de etapa lista para revisión',
    };
  }

  // ---------------- Sesiones ----------------

  async startSession(enrollment: EnrollmentWithLearner, lessonContractId: string): Promise<SessionResponse> {
    if (enrollment.status !== 'active') {
      throw new AppError('ENROLLMENT_NOT_ACTIVE', 409, 'La inscripción no está activa');
    }
    const lesson = await this.prisma.lessonContract.findFirst({
      where: { id: lessonContractId, programVersionId: enrollment.programVersionId, status: 'published' },
    });
    if (!lesson) throw notFound('Lección no encontrada en tu versión del programa');

    const session = await this.prisma.learningSession.create({
      data: { enrollmentId: enrollment.id, lessonContractId },
    });
    await this.auditService.record({
      actorId: enrollment.learnerId,
      action: 'lesson.started',
      objectType: 'learning_session',
      objectId: session.id,
    });
    return this.sessionResponse(session.id);
  }

  async getSessionForActor(actor: SessionUser, sessionId: string) {
    const session = await this.prisma.learningSession.findUnique({
      where: { id: sessionId },
      include: { enrollment: { include: { learner: true } } },
    });
    if (!session) throw notFound('Sesión no encontrada');
    await this.accessService.assertEnrollmentAccess(actor, session.enrollmentId);
    return session;
  }

  async sessionResponse(sessionId: string): Promise<SessionResponse> {
    const session = await this.prisma.learningSession.findUniqueOrThrow({
      where: { id: sessionId },
      include: {
        lessonContract: {
          include: { activities: { orderBy: { orderIndex: 'asc' } } },
        },
      },
    });
    const lesson = session.lessonContract;
    return {
      id: session.id,
      lessonContract: {
        id: lesson.id,
        code: lesson.code,
        objective: lesson.objective,
        immersionRatio: lesson.immersionRatio,
        timeboxSeconds: lesson.timeboxSeconds,
        mentorMode: lesson.mentorMode,
      },
      // El cliente recibe el contrato y los prompts; JAMÁS la clave de respuesta (PRF-08).
      activities: lesson.activities
        .filter((activity) => activity.kind !== 'voice_mission')
        .map((activity) => ({
          id: activity.id,
          code: activity.code,
          kind: activity.kind,
          skill: activity.skill,
          orderIndex: activity.orderIndex,
          isTransferVariant: activity.isTransferVariant,
          prompt: activity.prompt as Record<string, unknown>,
        })),
      status: session.status,
    };
  }

  async completeSession(actor: SessionUser, sessionId: string): Promise<{ ok: true }> {
    const session = await this.getSessionForActor(actor, sessionId);
    if (session.status === 'active') {
      await this.prisma.$transaction(async (tx) => {
        await tx.learningSession.update({
          where: { id: sessionId },
          data: { status: 'completed', endedAt: new Date() },
        });
        // Recompensa idempotente: refId = sessionId, repetir no duplica Novas.
        await this.economyService.grantNovasInTx(tx, {
          userId: actor.id,
          kind: 'lesson_complete',
          amount: LESSON_COMPLETE_NOVAS,
          refId: sessionId,
        });
      });
    }
    return { ok: true };
  }

  // ---------------- Entrega de actividades (núcleo del STAR Loop) ----------------

  async submit(
    actor: SessionUser,
    sessionId: string,
    activityId: string,
    request: SubmissionRequest,
  ): Promise<SubmissionResult> {
    const session = await this.getSessionForActor(actor, sessionId);
    if (session.status !== 'active') {
      throw new AppError('VOICE_SESSION_INVALID_STATE', 409, 'La sesión ya fue cerrada');
    }

    const activity = await this.prisma.activity.findUnique({
      where: { id: activityId },
      include: { competency: true },
    });
    if (!activity || activity.lessonContractId !== session.lessonContractId) {
      throw new AppError('ACTIVITY_NOT_IN_LESSON', 400, 'La actividad no pertenece a esta lección');
    }
    if (activity.kind === 'voice_mission') {
      throw new AppError('ACTIVITY_NOT_IN_LESSON', 400, 'Las misiones de voz se realizan desde el flujo de voz');
    }
    if (activity.kind !== request.response.kind) {
      throw new AppError('VALIDATION_FAILED', 400, 'El tipo de respuesta no corresponde a la actividad');
    }

    const outcome = this.scoreActivity(activity, request);
    const usedAids = request.usedAids || activity.supportLevel === 'guided';
    const inputHash = createHash('sha256')
      .update(activityId + JSON.stringify(request.response))
      .digest('hex');

    const now = new Date();
    const competency = activity.competency;
    const masteryConfig: MasteryRuleConfig = {
      globalThreshold: competency.globalThreshold,
      dimensionFloors: (competency.dimensionFloors as Record<string, number> | null) ?? {},
      freshnessDays: competency.freshnessDays,
    };

    const result = await this.prisma.$transaction(async (tx) => {
      const duplicate = await tx.evidence.findFirst({
        where: { enrollmentId: session.enrollmentId, activityId, inputHash },
      });

      let reviewInfo: { isDelayedRetrieval: boolean; reviewItemId: string | null } = {
        isDelayedRetrieval: false,
        reviewItemId: null,
      };
      if (request.reviewItemId) {
        reviewInfo = await this.resolveReviewItem(tx, session.enrollmentId, request.reviewItemId, activity, outcome.score, now);
      }

      let evidenceId = duplicate?.id ?? null;
      if (!duplicate) {
        const evidence = await tx.evidence.create({
          data: {
            enrollmentId: session.enrollmentId,
            learningSessionId: session.id,
            competencyId: competency.id,
            activityId,
            rubricVersionId: activity.rubricVersionId,
            sourceType: 'practice',
            usedAids,
            isTransfer: activity.isTransferVariant,
            isDelayedRetrieval: reviewInfo.isDelayedRetrieval,
            score: outcome.score,
            dimensionScores: (outcome.dimensionScores ?? undefined) as Prisma.InputJsonObject | undefined,
            confidence: outcome.confidence,
            normalizedPayload: request.response as unknown as Prisma.InputJsonObject,
            provenance: {
              scorer: activity.kind === 'writing_prompt' ? 'writing-heuristic-v1' : 'deterministic-v1',
              engine: '@star/domain@0.1.0',
            } as Prisma.InputJsonObject,
            inputHash,
          },
        });
        evidenceId = evidence.id;
      }

      const history = await tx.evidence.findMany({
        where: { enrollmentId: session.enrollmentId, competencyId: competency.id },
        orderBy: { createdAt: 'asc' },
      });
      const evaluation = evaluateMastery(
        history.map(
          (item): EvidenceForMastery => ({
            at: item.createdAt,
            sourceType: item.sourceType,
            usedAids: item.usedAids,
            isTransfer: item.isTransfer,
            isDelayedRetrieval: item.isDelayedRetrieval,
            score: item.score,
            dimensionScores: (item.dimensionScores as Record<string, number> | null) ?? undefined,
            confidence: item.confidence,
            hasCriticalAlert: item.alerts !== null,
          }),
        ),
        masteryConfig,
        now,
      );

      const previousState = await tx.competencyStateRecord.findUnique({
        where: {
          enrollmentId_competencyId: { enrollmentId: session.enrollmentId, competencyId: competency.id },
        },
      });

      const nextReview = await this.ensureReviewScheduled(tx, session.enrollmentId, competency, activity, now, request.reviewItemId != null, outcome.score >= competency.globalThreshold);

      await tx.competencyStateRecord.upsert({
        where: {
          enrollmentId_competencyId: { enrollmentId: session.enrollmentId, competencyId: competency.id },
        },
        create: {
          enrollmentId: session.enrollmentId,
          competencyId: competency.id,
          state: evaluation.state,
          masteryScore: evaluation.masteryScore,
          confidence: evaluation.confidence,
          freshness: evaluation.freshness,
          evidenceCount: evaluation.validEvidenceCount,
          lastEvidenceAt: now,
          nextReviewAt: nextReview,
        },
        update: {
          state: evaluation.state,
          masteryScore: evaluation.masteryScore,
          confidence: evaluation.confidence,
          freshness: evaluation.freshness,
          evidenceCount: evaluation.validEvidenceCount,
          lastEvidenceAt: now,
          nextReviewAt: nextReview,
        },
      });

      if (!duplicate && outcome.score >= competency.globalThreshold) {
        await this.rewardSubmissionInTx(tx, actor, session.id, evidenceId as string);
      }

      let humanReviewCreated = false;
      if (
        activity.kind === 'writing_prompt' &&
        competency.criticality === 'critical' &&
        outcome.confidence < LOW_CONFIDENCE_REVIEW_THRESHOLD &&
        !duplicate
      ) {
        await tx.humanReview.create({
          data: {
            enrollmentId: session.enrollmentId,
            learnerId: session.enrollment.learnerId,
            caseType: 'low_confidence',
            payload: {
              evidenceId,
              activityCode: activity.code,
              score: outcome.score,
              dimensionScores: outcome.dimensionScores,
            } as unknown as Prisma.InputJsonObject,
          },
        });
        await this.outboxService.emitInTx(tx, {
          aggregateType: 'enrollment',
          aggregateId: session.enrollmentId,
          eventType: 'human_review.requested',
          payload: { caseType: 'low_confidence' },
        });
        humanReviewCreated = true;
      }

      if (!duplicate) {
        await this.outboxService.emitInTx(tx, {
          aggregateType: 'enrollment',
          aggregateId: session.enrollmentId,
          eventType: 'evidence.created',
          payload: { competencyCode: competency.code, sourceType: 'practice', score: outcome.score },
        });
      }
      await this.outboxService.emitInTx(tx, {
        aggregateType: 'enrollment',
        aggregateId: session.enrollmentId,
        eventType: 'mastery.updated',
        payload: { competencyCode: competency.code, state: evaluation.state },
      });
      if (previousState?.state !== 'mastered' && evaluation.state === 'mastered') {
        await this.outboxService.emitInTx(tx, {
          aggregateType: 'enrollment',
          aggregateId: session.enrollmentId,
          eventType: 'competency.mastered',
          payload: { competencyCode: competency.code },
        });
      }
      await this.auditService.recordInTx(tx, {
        actorId: actor.id,
        action: 'evidence.submitted',
        objectType: 'competency',
        objectId: competency.id,
        metadata: { activityCode: activity.code, score: outcome.score },
      });

      return { evidenceId: evidenceId as string, evaluation, nextReview, humanReviewCreated };
    });

    return {
      evidenceId: result.evidenceId,
      score: outcome.score,
      correct: outcome.correct,
      feedback: result.humanReviewCreated
        ? `${outcome.feedback} Un revisor académico confirmará esta evaluación.`
        : outcome.feedback,
      competencyState: result.evaluation.state,
      masteryScore: Math.round(result.evaluation.masteryScore * 100) / 100,
      nextReviewAt: result.nextReview ? result.nextReview.toISOString() : null,
      humanReviewCreated: result.humanReviewCreated,
    };
  }

  // ---------------- Cola de repaso ----------------

  async reviewQueue(enrollment: EnrollmentWithLearner): Promise<unknown> {
    const items = await this.prisma.reviewItem.findMany({
      where: { enrollmentId: enrollment.id, completedAt: null, dueAt: { lte: new Date() } },
      orderBy: { dueAt: 'asc' },
      take: 20,
      include: { competency: true, activity: true },
    });
    return {
      enrollmentId: enrollment.id,
      dueItems: items.map((item) => ({
        reviewItemId: item.id,
        competencyCode: item.competency.code,
        competencyDescriptor: item.competency.descriptor,
        activityId: item.activity?.id ?? null,
        lessonContractId: item.activity?.lessonContractId ?? null,
        dueAt: item.dueAt.toISOString(),
        intervalDays: item.intervalDays,
      })),
    };
  }

  // ---------------- Helpers ----------------

  /** Premio en Novas por submission correcta: 10 base + 5 de combo si la sesión encadena ≥3 correctas. */
  private async rewardSubmissionInTx(
    tx: Prisma.TransactionClient,
    actor: SessionUser,
    sessionId: string,
    evidenceId: string,
  ): Promise<void> {
    const streak = await this.sessionCorrectStreak(tx, sessionId);
    const comboBonus = streak >= COMBO_STREAK_MIN ? COMBO_BONUS_NOVAS : 0;
    await this.economyService.grantNovasInTx(tx, {
      userId: actor.id,
      kind: 'submission_correct',
      amount: SUBMISSION_CORRECT_NOVAS + comboBonus,
      refId: evidenceId,
    });
  }

  /** Evidencias correctas consecutivas de la sesión (score ≥ umbral de su competencia), incluyendo la actual. */
  private async sessionCorrectStreak(tx: Prisma.TransactionClient, sessionId: string): Promise<number> {
    const evidences = await tx.evidence.findMany({
      where: { learningSessionId: sessionId },
      orderBy: { createdAt: 'desc' },
      select: { score: true, competency: { select: { globalThreshold: true } } },
    });
    let streak = 0;
    for (const item of evidences) {
      if (item.score < item.competency.globalThreshold) break;
      streak += 1;
    }
    return streak;
  }

  private scoreActivity(activity: Activity & { competency: Competency }, request: SubmissionRequest): ScoreOutcome {
    const answerKey = activity.answerKey as Record<string, unknown>;
    const response = request.response;

    if (response.kind === 'mcq') {
      const correctIndex = Number(answerKey.correctIndex ?? -1);
      const explanation = typeof answerKey.explanation === 'string' ? answerKey.explanation : '';
      const { score, correct } = scoreMcq(response.selectedIndex, correctIndex);
      return {
        score,
        correct,
        confidence: DETERMINISTIC_CONFIDENCE,
        dimensionScores: null,
        feedback: correct ? `¡Correcto! ${explanation}`.trim() : `Todavía no. ${explanation}`.trim(),
      };
    }

    if (response.kind === 'gap_fill') {
      const accepted = (answerKey.accepted as string[][] | undefined) ?? [];
      const { score, perGap } = scoreGapFill(response.answers, accepted);
      const correctCount = perGap.filter(Boolean).length;
      return {
        score,
        correct: score === 1,
        confidence: DETERMINISTIC_CONFIDENCE,
        dimensionScores: null,
        feedback:
          score === 1
            ? '¡Excelente! Completaste todos los espacios correctamente.'
            : `Acertaste ${correctCount} de ${perGap.length}. Revisa los espacios marcados y vuelve a intentarlo.`,
      };
    }

    const rubricSpec = (answerKey.rubricSpec as { minWords: number; requiredElements: string[] } | undefined) ?? {
      minWords: 40,
      requiredElements: [],
    };
    const writing = scoreWritingHeuristic(response.text, rubricSpec);
    const missing =
      writing.missingElements.length > 0
        ? ` Incluye también: ${writing.missingElements.join(', ')}.`
        : '';
    return {
      score: writing.score,
      correct: null,
      confidence: writing.confidence,
      dimensionScores: writing.dimensionScores,
      feedback: `Escribiste ${writing.wordCount} palabras. Puntaje provisional ${Math.round(writing.score * 100)}%.${missing}`,
    };
  }

  private async resolveReviewItem(
    tx: Prisma.TransactionClient,
    enrollmentId: string,
    reviewItemId: string,
    activity: Activity,
    score: number,
    now: Date,
  ): Promise<{ isDelayedRetrieval: boolean; reviewItemId: string }> {
    const item = await tx.reviewItem.findFirst({
      where: { id: reviewItemId, enrollmentId, completedAt: null },
    });
    if (!item || item.competencyId !== activity.competencyId) {
      throw new AppError('VALIDATION_FAILED', 400, 'El repaso no corresponde a esta actividad');
    }
    const pass = score >= 0.8;
    await tx.reviewItem.update({
      where: { id: item.id },
      data: { completedAt: now, lapses: pass ? item.lapses : item.lapses + 1 },
    });
    const nextInterval = nextReviewIntervalDays(item.intervalDays, pass ? 'pass' : 'fail');
    await tx.reviewItem.create({
      data: {
        enrollmentId,
        competencyId: item.competencyId,
        activityId: item.activityId ?? activity.id,
        dueAt: computeNextReviewAt(now, nextInterval),
        intervalDays: nextInterval,
      },
    });
    return {
      isDelayedRetrieval: pass && item.intervalDays >= MASTERY_RULES.DELAYED_RETRIEVAL_MIN_DAYS,
      reviewItemId: item.id,
    };
  }

  private async ensureReviewScheduled(
    tx: Prisma.TransactionClient,
    enrollmentId: string,
    competency: Competency,
    activity: Activity,
    now: Date,
    wasReviewSubmission: boolean,
    _passed: boolean,
  ): Promise<Date | null> {
    const pending = await tx.reviewItem.findFirst({
      where: { enrollmentId, competencyId: competency.id, completedAt: null },
      orderBy: { dueAt: 'asc' },
    });
    if (pending) return pending.dueAt;
    if (wasReviewSubmission) {
      const created = await tx.reviewItem.findFirst({
        where: { enrollmentId, competencyId: competency.id, completedAt: null },
        orderBy: { createdAt: 'desc' },
      });
      return created?.dueAt ?? null;
    }
    const interval = firstReviewIntervalDays();
    const item = await tx.reviewItem.create({
      data: {
        enrollmentId,
        competencyId: competency.id,
        activityId: activity.id,
        dueAt: computeNextReviewAt(now, interval),
        intervalDays: interval,
      },
    });
    return item.dueAt;
  }
}
