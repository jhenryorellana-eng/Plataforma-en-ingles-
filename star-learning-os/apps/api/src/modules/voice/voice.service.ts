import { createHmac } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { CreateVoiceSessionRequest, EndVoiceSessionRequest, ErrorCode, VoiceSessionResponse } from '@star/contracts';
import { crossedAlertLevel, evaluateVoicePolicy, usageAlertLevel, type VoiceDenyReason } from '@star/domain';
import type { EnrollmentWithLearner } from '../../common/access.service';
import { AppError, notFound } from '../../common/errors';
import type { SessionUser } from '../../common/session';
import { loadConfig } from '../../config/config';
import { AuditService } from '../audit/audit.service';
import { OutboxService } from '../audit/outbox.service';
import { EconomyService } from '../economy/economy.service';
import { PrismaService } from '../../prisma/prisma.service';
import { composeMentorInstructions, POLICY_VERSION, PROMPT_VERSION, type MissionSpec } from './prompt-composer';
import { MockVoiceProvider, OpenAiRealtimeProvider } from './openai-realtime.provider';
import type { VoiceProvider } from './voice-provider';
import { weeklyVoiceMinutesUsed, weeklyVoiceSecondsUsed } from './voice-usage';

const DENY_STATUS: Record<VoiceDenyReason, { code: ErrorCode; message: string }> = {
  ENROLLMENT_NOT_ACTIVE: { code: 'ENROLLMENT_NOT_ACTIVE', message: 'Tu inscripción no está activa' },
  GUARDIAN_LINK_REQUIRED: { code: 'GUARDIAN_LINK_REQUIRED', message: 'Necesitas un apoderado vinculado para usar voz' },
  CONSENT_REQUIRED: { code: 'CONSENT_REQUIRED', message: 'Tu apoderado aún no autoriza las sesiones de voz con IA' },
  ASSENT_REQUIRED: { code: 'ASSENT_REQUIRED', message: 'Primero confirma que entiendes cómo funciona el Mentor' },
  ZDR_REQUIRED: {
    code: 'ZDR_REQUIRED',
    message: 'Las sesiones de voz para tu edad se habilitan cuando Starbiz complete la configuración de protección de datos (ZDR)',
  },
  VOICE_QUOTA_EXCEEDED: { code: 'VOICE_QUOTA_EXCEEDED', message: 'No te quedan minutos de voz esta semana' },
};

const HEARTBEAT_MAX_DELTA_SECONDS = 60;
const VOICE_SESSION_NOVAS = 30;

@Injectable()
export class VoiceService {
  private readonly provider: VoiceProvider;

  constructor(
    private readonly prisma: PrismaService,
    private readonly outboxService: OutboxService,
    private readonly auditService: AuditService,
    private readonly economyService: EconomyService,
  ) {
    const config = loadConfig();
    this.provider = config.openaiApiKey
      ? new OpenAiRealtimeProvider(config.openaiApiKey)
      : new MockVoiceProvider();
  }

  async create(
    actor: SessionUser,
    enrollment: EnrollmentWithLearner,
    request: CreateVoiceSessionRequest,
  ): Promise<VoiceSessionResponse> {
    const config = loadConfig();
    const learner = enrollment.learner;

    const [link, consents, assent, entitlement, usedMinutes] = await Promise.all([
      this.prisma.guardianLearnerLink.findFirst({
        where: { learnerId: learner.id, status: 'active' },
      }),
      this.prisma.consentGrant.findMany({
        where: { learnerId: learner.id, status: 'granted' },
        select: { purpose: true },
      }),
      this.prisma.youthAssent.findFirst({ where: { learnerId: learner.id } }),
      this.prisma.entitlement.findUnique({ where: { enrollmentId: enrollment.id } }),
      weeklyVoiceMinutesUsed(this.prisma, enrollment.id),
    ]);

    // Bloqueo técnico, no política (Stack §1.1): la política juvenil decide en dominio puro.
    const policy = evaluateVoicePolicy({
      ageBand: learner.ageBand ?? 'a18_plus',
      enrollmentStatus: enrollment.status,
      hasActiveGuardianLink: link !== null,
      consents: consents.map((c) => c.purpose),
      hasAssent: assent !== null,
      zdrVerified: config.zdrVerified,
      weeklyMinutesIncluded: entitlement?.weeklyVoiceMinutes ?? 0,
      weeklyMinutesUsed: usedMinutes,
    });
    if (!policy.allowed) {
      const reason = policy.denyReasons[0];
      const deny = DENY_STATUS[reason];
      await this.auditService.record({
        actorId: actor.id,
        action: 'voice.session_denied',
        objectType: 'enrollment',
        objectId: enrollment.id,
        metadata: { reasons: policy.denyReasons },
      });
      throw new AppError(deny.code, 403, deny.message, { reasons: policy.denyReasons });
    }

    const lesson = await this.prisma.lessonContract.findFirst({
      where: {
        id: request.lessonContractId,
        programVersionId: enrollment.programVersionId,
        status: 'published',
      },
      include: { activities: { where: { kind: 'voice_mission' } }, unit: true },
    });
    if (!lesson || lesson.activities.length === 0) {
      throw notFound('Esta lección no tiene una misión de voz');
    }
    const missionActivity = lesson.activities[0];
    const missionPrompt = missionActivity.prompt as Record<string, unknown>;
    const mission: MissionSpec = {
      objective: String(missionPrompt.objective ?? lesson.objective),
      scenario: String(missionPrompt.scenario ?? ''),
      openingLine: String(missionPrompt.openingLine ?? 'Hello! Ready to start?'),
      vocabulary: Array.isArray(missionPrompt.vocabulary) ? (missionPrompt.vocabulary as string[]) : [],
    };

    const program = await this.prisma.languageProgram.findUniqueOrThrow({
      where: { id: enrollment.programId },
    });

    const instructions = composeMentorInstructions({
      ageBand: learner.ageBand,
      learnerFirstName: learner.displayName.split(' ')[0],
      targetLanguage: program.targetLanguage,
      supportLanguage: enrollment.supportLanguage,
      targetVariety: enrollment.targetVariety,
      immersionRatio: lesson.immersionRatio,
      correctionPolicy: lesson.correctionPolicy,
      translationPolicy: lesson.translationPolicy,
      mission,
    });

    // Identificador seudónimo estable, no reversible (Arquitectura §15.6).
    const safetyIdentifier = createHmac('sha256', config.sessionSecret)
      .update(learner.id)
      .digest('hex')
      .slice(0, 32);

    const ephemeral = await this.provider.createEphemeralSession({
      model: config.realtimeModelTutorPrimary,
      voice: config.realtimeVoice,
      instructions,
      safetyIdentifier,
    });

    const mode = this.provider.name === 'mock' ? 'mock' : 'realtime';
    const voiceSession = await this.prisma.$transaction(async (tx) => {
      const created = await tx.voiceSession.create({
        data: {
          enrollmentId: enrollment.id,
          lessonContractId: lesson.id,
          mode,
          providerCallId: ephemeral.providerCallId,
          modelAlias: 'realtime_tutor_primary',
          modelSnapshot: config.realtimeModelTutorPrimary,
          promptVersion: PROMPT_VERSION,
          policyVersion: POLICY_VERSION,
          targetLanguage: program.targetLanguage,
          supportLanguage: enrollment.supportLanguage,
          targetVariety: enrollment.targetVariety,
          immersionRatio: lesson.immersionRatio,
          status: 'created',
          startedAt: new Date(),
        },
      });
      await this.outboxService.emitInTx(tx, {
        aggregateType: 'voice_session',
        aggregateId: created.id,
        eventType: 'voice.session_started',
        payload: { mode, modelAlias: 'realtime_tutor_primary' },
      });
      await this.auditService.recordInTx(tx, {
        actorId: actor.id,
        action: 'voice.session_created',
        objectType: 'voice_session',
        objectId: created.id,
        metadata: { mode },
      });
      return created;
    });

    return {
      voiceSessionId: voiceSession.id,
      mode,
      provider: this.provider.name,
      realtimeModelAlias: 'realtime_tutor_primary',
      ephemeralClientSecret: mode === 'realtime' ? ephemeral.clientSecret : null,
      realtimeCallUrl: mode === 'realtime' ? `${ephemeral.callUrl}?model=${config.realtimeModelTutorPrimary}` : null,
      expiresAt: mode === 'realtime' ? ephemeral.expiresAt : null,
      sessionPolicy: {
        targetLanguage: program.targetLanguage,
        supportLanguage: enrollment.supportLanguage,
        targetVariety: enrollment.targetVariety,
        immersionRatio: lesson.immersionRatio,
        maxDurationSeconds: lesson.timeboxSeconds,
        translationMode: lesson.translationPolicy,
      },
      mission: {
        objective: mission.objective,
        scenario: mission.scenario,
        openingLine: mission.openingLine,
        ...(mode === 'mock' && Array.isArray(missionPrompt.mockScript)
          ? { mockLines: missionPrompt.mockScript as string[] }
          : {}),
      },
      usage: {
        includedMinutes: entitlement?.weeklyVoiceMinutes ?? 0,
        usedMinutes,
      },
    };
  }

  async heartbeat(
    actor: SessionUser,
    voiceSessionId: string,
    activeSecondsDelta: number,
  ): Promise<{ shouldEnd: boolean; reason: string | null; usedMinutes: number }> {
    const session = await this.getForActor(actor, voiceSessionId);
    if (session.status === 'completed' || session.status === 'terminated') {
      return { shouldEnd: true, reason: 'session_closed', usedMinutes: 0 };
    }
    const delta = Math.min(Math.max(0, Math.floor(activeSecondsDelta)), HEARTBEAT_MAX_DELTA_SECONDS);
    const updated = await this.prisma.voiceSession.update({
      where: { id: session.id },
      data: { status: 'connected', activeSeconds: { increment: delta } },
    });

    const [entitlement, weeklySeconds, lesson] = await Promise.all([
      this.prisma.entitlement.findUnique({ where: { enrollmentId: session.enrollmentId } }),
      weeklyVoiceSecondsUsed(this.prisma, session.enrollmentId),
      this.prisma.lessonContract.findUniqueOrThrow({ where: { id: session.lessonContractId } }),
    ]);
    const includedSeconds = (entitlement?.weeklyVoiceMinutes ?? 0) * 60;

    if (updated.activeSeconds >= lesson.timeboxSeconds) {
      return { shouldEnd: true, reason: 'timebox_reached', usedMinutes: Math.ceil(weeklySeconds / 60) };
    }
    if (weeklySeconds >= includedSeconds) {
      return { shouldEnd: true, reason: 'quota_exhausted', usedMinutes: Math.ceil(weeklySeconds / 60) };
    }
    return { shouldEnd: false, reason: null, usedMinutes: Math.ceil(weeklySeconds / 60) };
  }

  async end(actor: SessionUser, voiceSessionId: string, request: EndVoiceSessionRequest): Promise<unknown> {
    const session = await this.getForActor(actor, voiceSessionId);
    if (session.status === 'completed' || session.status === 'terminated') {
      return { ok: true, alreadyClosed: true };
    }

    const lesson = await this.prisma.lessonContract.findUniqueOrThrow({
      where: { id: session.lessonContractId },
    });
    const entitlement = await this.prisma.entitlement.findUnique({
      where: { enrollmentId: session.enrollmentId },
    });
    const includedMinutes = entitlement?.weeklyVoiceMinutes ?? 0;
    const previousSeconds = await weeklyVoiceSecondsUsed(this.prisma, session.enrollmentId);

    // COM-04: solo tiempo activo, acotado por el timebox del contrato.
    const finalActiveSeconds = Math.min(
      Math.max(session.activeSeconds, request.activeSeconds),
      lesson.timeboxSeconds + 120,
    );

    await this.prisma.$transaction(async (tx) => {
      await tx.voiceSession.update({
        where: { id: session.id },
        data: {
          status: request.reason === 'safety' ? 'terminated' : 'completed',
          endedAt: new Date(),
          activeSeconds: finalActiveSeconds,
          endReason: request.reason,
        },
      });
      await tx.aiUsageRecord.create({
        data: {
          enrollmentId: session.enrollmentId,
          voiceSessionId: session.id,
          costCenter: 'learning',
          modelAlias: session.modelAlias,
          detail: {
            mode: session.mode,
            activeSeconds: finalActiveSeconds,
            note: 'tokens reales por response.done pendientes de sideband endurecido',
          } as Prisma.InputJsonObject,
        },
      });
      if (finalActiveSeconds > 0) {
        // Recompensa idempotente: refId = voiceSessionId, cerrar dos veces no duplica.
        await this.economyService.grantNovasInTx(tx, {
          userId: actor.id,
          kind: 'voice_session',
          amount: VOICE_SESSION_NOVAS,
          refId: session.id,
        });
      }
      await this.outboxService.emitInTx(tx, {
        aggregateType: 'voice_session',
        aggregateId: session.id,
        eventType: 'voice.session_ended',
        payload: { reason: request.reason, activeSeconds: finalActiveSeconds },
      });

      const newSeconds = previousSeconds - session.activeSeconds + finalActiveSeconds;
      const crossed = crossedAlertLevel(
        includedMinutes === 0 ? 1 : previousSeconds / 60 / includedMinutes,
        includedMinutes === 0 ? 1 : newSeconds / 60 / includedMinutes,
      );
      if (crossed !== null) {
        // D05: avisos al adulto al 70/90/100%; nunca cobro automático oculto.
        await this.outboxService.emitInTx(tx, {
          aggregateType: 'enrollment',
          aggregateId: session.enrollmentId,
          eventType: 'usage.threshold_reached',
          payload: { threshold: crossed },
        });
      }
    });

    const usedMinutes = await weeklyVoiceMinutesUsed(this.prisma, session.enrollmentId);
    return {
      ok: true,
      usedMinutes,
      includedMinutes,
      alertLevel: usageAlertLevel(includedMinutes === 0 ? 1 : usedMinutes / includedMinutes),
    };
  }

  async usage(enrollment: EnrollmentWithLearner): Promise<unknown> {
    const [entitlement, usedMinutes] = await Promise.all([
      this.prisma.entitlement.findUnique({ where: { enrollmentId: enrollment.id } }),
      weeklyVoiceMinutesUsed(this.prisma, enrollment.id),
    ]);
    const includedMinutes = entitlement?.weeklyVoiceMinutes ?? 0;
    return {
      enrollmentId: enrollment.id,
      includedMinutes,
      usedMinutes,
      remainingMinutes: Math.max(0, includedMinutes - usedMinutes),
      alertLevel: usageAlertLevel(includedMinutes === 0 ? 1 : usedMinutes / includedMinutes),
    };
  }

  private async getForActor(actor: SessionUser, voiceSessionId: string) {
    const session = await this.prisma.voiceSession.findUnique({
      where: { id: voiceSessionId },
      include: { enrollment: true },
    });
    if (!session) throw notFound('Sesión de voz no encontrada');
    if (actor.role !== 'staff' && session.enrollment.learnerId !== actor.id) {
      throw new AppError('FORBIDDEN', 403, 'No tienes acceso a esta sesión de voz');
    }
    return session;
  }
}
