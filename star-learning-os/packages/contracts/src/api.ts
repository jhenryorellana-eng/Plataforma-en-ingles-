import { z } from 'zod';
import {
  zActivityKind,
  zAgeBand,
  zCefrLevel,
  zCompetencyState,
  zConsentPurpose,
  zEnrollmentStatus,
  zPaceCode,
  zReviewDecision,
  zSafetyCategory,
  zSkill,
  zUserRole,
} from './enums';

// ---------- Auth (proveedor dev; Identity Platform en producción vía adaptador) ----------

export const zDevLoginRequest = z.object({
  profile: z.enum(['learner_teen', 'learner_young', 'guardian', 'staff']).optional(),
  displayName: z.string().min(2).max(60).optional(),
  role: zUserRole.optional(),
  ageBand: zAgeBand.optional(),
});
export type DevLoginRequest = z.infer<typeof zDevLoginRequest>;

export const zMeResponse = z.object({
  id: z.string().uuid(),
  displayName: z.string(),
  role: zUserRole,
  ageBand: zAgeBand.nullable(),
});
export type MeResponse = z.infer<typeof zMeResponse>;

// ---------- Registro y onboarding familiar (Stack §5.2–5.3) ----------

export const zRegisterLearnerRequest = z.object({
  displayName: z.string().min(2).max(60),
  email: z.string().email(),
  birthYear: z.number().int().min(1940).max(2020),
});
export type RegisterLearnerRequest = z.infer<typeof zRegisterLearnerRequest>;

export const zRegisterGuardianRequest = z.object({
  displayName: z.string().min(2).max(60),
  email: z.string().email(),
});
export type RegisterGuardianRequest = z.infer<typeof zRegisterGuardianRequest>;

export const zCreateInvitationRequest = z.object({
  guardianEmail: z.string().email(),
});
export type CreateInvitationRequest = z.infer<typeof zCreateInvitationRequest>;

export const zInvitationResponse = z.object({
  code: z.string(),
  guardianEmail: z.string(),
  status: z.enum(['pending', 'accepted', 'expired']),
});
export type InvitationResponse = z.infer<typeof zInvitationResponse>;

export const zAcceptInvitationRequest = z.object({
  code: z.string().min(4).max(12),
});
export type AcceptInvitationRequest = z.infer<typeof zAcceptInvitationRequest>;

export const zOnboardingStatus = z.object({
  ageBand: zAgeBand.nullable(),
  isMinor: z.boolean(),
  hasActiveLink: z.boolean(),
  consents: z.array(zConsentPurpose),
  hasAssent: z.boolean(),
  invitation: zInvitationResponse.nullable(),
  readyToEnroll: z.boolean(),
});
export type OnboardingStatus = z.infer<typeof zOnboardingStatus>;

export const zRevokeConsentRequest = z.object({
  learnerId: z.string().uuid(),
  purpose: zConsentPurpose,
});
export type RevokeConsentRequest = z.infer<typeof zRevokeConsentRequest>;

// ---------- Consentimiento y familia ----------

export const zGrantConsentsRequest = z.object({
  learnerId: z.string().uuid(),
  purposes: z.array(zConsentPurpose).min(1),
  noticeVersion: z.string().default('2026-07'),
});
export type GrantConsentsRequest = z.infer<typeof zGrantConsentsRequest>;

export const zRecordAssentRequest = z.object({
  noticeVersion: z.string().default('2026-07'),
});
export type RecordAssentRequest = z.infer<typeof zRecordAssentRequest>;

// ---------- Catálogo e inscripción ----------

export const zCreateEnrollmentRequest = z.object({
  programCode: z.string().min(2),
  /** Opcional: la Metodología §7.5 elige el ritmo DESPUÉS del diagnóstico. */
  paceCode: zPaceCode.optional(),
  supportLanguage: z.string().min(2).max(10).default('es'),
  interfaceLocale: z.string().min(2).max(12).default('es-PE'),
  targetVariety: z.string().min(2).max(12).default('en-US'),
});
export type CreateEnrollmentRequest = z.infer<typeof zCreateEnrollmentRequest>;

export const zUpdatePaceRequest = z.object({
  paceCode: zPaceCode,
});
export type UpdatePaceRequest = z.infer<typeof zUpdatePaceRequest>;

export const zPaceOption = z.object({
  code: zPaceCode,
  name: z.string(),
  weeklyStudyHours: z.number(),
  weeklyVoiceMinutes: z.number(),
  monthsMin: z.number(),
  monthsMax: z.number(),
  recommended: z.boolean(),
  allowed: z.boolean(),
  note: z.string().nullable(),
});
export type PaceOption = z.infer<typeof zPaceOption>;

export const zPaceOptionsResponse = z.object({
  enrollmentId: z.string().uuid(),
  entryLevel: zCefrLevel,
  remainingHoursMin: z.number(),
  remainingHoursMax: z.number(),
  options: z.array(zPaceOption),
});
export type PaceOptionsResponse = z.infer<typeof zPaceOptionsResponse>;

export const zEnrollmentResponse = z.object({
  id: z.string().uuid(),
  program: z.object({
    code: z.string(),
    version: z.string(),
    targetLanguage: z.string(),
  }),
  paceCode: zPaceCode,
  /** false hasta que el alumno confirme su ritmo tras el diagnóstico (§7.5). */
  paceConfirmed: z.boolean(),
  status: zEnrollmentStatus,
  placement: z
    .object({
      overall: zCefrLevel,
      perSkill: z.record(z.string(), zCefrLevel),
      confidence: z.number(),
      provisional: z.boolean(),
    })
    .nullable(),
  nextAction: z.object({
    type: z.enum(['start_diagnostic', 'continue_diagnostic', 'choose_pace', 'today']),
    href: z.string(),
  }),
});
export type EnrollmentResponse = z.infer<typeof zEnrollmentResponse>;

// ---------- Diagnóstico ----------

export const zDiagnosticItem = z.object({
  code: z.string(),
  skill: zSkill,
  prompt: z.string(),
  options: z.array(z.string()),
});
export type DiagnosticItemDto = z.infer<typeof zDiagnosticItem>;

export const zDiagnosticAttemptResponse = z.object({
  id: z.string().uuid(),
  status: z.enum(['in_progress', 'completed', 'insufficient']),
  items: z.array(zDiagnosticItem),
  answeredCount: z.number(),
});
export type DiagnosticAttemptResponse = z.infer<typeof zDiagnosticAttemptResponse>;

export const zDiagnosticAnswerRequest = z.object({
  itemCode: z.string(),
  selectedIndex: z.number().int().min(0),
});
export type DiagnosticAnswerRequest = z.infer<typeof zDiagnosticAnswerRequest>;

export const zDiagnosticWritingRequest = z.object({
  itemCode: z.string(),
  text: z.string().min(20).max(3000),
});
export type DiagnosticWritingRequest = z.infer<typeof zDiagnosticWritingRequest>;

/** Paso a paso multietapa (§7.2): router → módulo por nivel → writing. */
export const zDiagnosticNextResponse = z.object({
  attemptId: z.string().uuid(),
  stage: z.enum(['router', 'module', 'writing', 'done']),
  stageLabel: z.string(),
  items: z.array(
    z.object({
      code: z.string(),
      skill: zSkill,
      kind: z.enum(['mcq', 'writing']),
      prompt: z.string(),
      options: z.array(z.string()),
      minWords: z.number().nullable(),
    }),
  ),
  answeredCount: z.number(),
  totalPlanned: z.number(),
});
export type DiagnosticNextResponse = z.infer<typeof zDiagnosticNextResponse>;

// ---------- StarMap Preview público (Especificación §7.2) ----------

export const zPreviewEstimateRequest = z.object({
  answers: z
    .array(z.object({ itemCode: z.string(), selectedIndex: z.number().int().min(0) }))
    .min(3)
    .max(8),
});
export type PreviewEstimateRequest = z.infer<typeof zPreviewEstimateRequest>;

export const zPreviewEstimateResponse = z.object({
  band: zCefrLevel,
  strength: z.string(),
  gap: z.string(),
  message: z.string(),
});
export type PreviewEstimateResponse = z.infer<typeof zPreviewEstimateResponse>;

// ---------- Aprendizaje diario ----------

export const zTodayBlock = z.object({
  kind: z.enum(['review', 'lesson', 'voice_mission']),
  title: z.string(),
  description: z.string(),
  estimatedMinutes: z.number(),
  href: z.string().nullable(),
  lessonContractId: z.string().uuid().nullable(),
  dueCount: z.number().optional(),
});
export type TodayBlock = z.infer<typeof zTodayBlock>;

export const zTodayResponse = z.object({
  enrollmentId: z.string().uuid(),
  trajectoryStatus: z.enum(['on_track', 'at_risk', 'needs_replanning']),
  blocks: z.array(zTodayBlock).max(3),
  weeklyGoalHours: z.number(),
  voice: z.object({
    includedMinutes: z.number(),
    usedMinutes: z.number(),
    alertLevel: z.number().nullable(),
  }),
  dueReviews: z.number(),
  nextMilestone: z.string(),
});
export type TodayResponse = z.infer<typeof zTodayResponse>;

// ---------- Sesiones y entregas ----------

export const zStartSessionRequest = z.object({
  lessonContractId: z.string().uuid(),
});
export type StartSessionRequest = z.infer<typeof zStartSessionRequest>;

export const zActivityDto = z.object({
  id: z.string().uuid(),
  code: z.string(),
  kind: zActivityKind,
  skill: zSkill,
  orderIndex: z.number(),
  isTransferVariant: z.boolean(),
  /** Contenido seguro para el cliente: sin claves de respuesta. */
  prompt: z.record(z.string(), z.unknown()),
});
export type ActivityDto = z.infer<typeof zActivityDto>;

export const zSessionResponse = z.object({
  id: z.string().uuid(),
  lessonContract: z.object({
    id: z.string().uuid(),
    code: z.string(),
    objective: z.string(),
    immersionRatio: z.number(),
    timeboxSeconds: z.number(),
    mentorMode: z.string(),
  }),
  activities: z.array(zActivityDto),
  status: z.enum(['created', 'active', 'completed', 'abandoned']),
});
export type SessionResponse = z.infer<typeof zSessionResponse>;

export const zSubmissionRequest = z.object({
  response: z.union([
    z.object({ kind: z.literal('mcq'), selectedIndex: z.number().int().min(0) }),
    z.object({ kind: z.literal('gap_fill'), answers: z.array(z.string()) }),
    z.object({ kind: z.literal('writing_prompt'), text: z.string().max(5000) }),
  ]),
  usedAids: z.boolean().default(false),
  reviewItemId: z.string().uuid().optional(),
});
export type SubmissionRequest = z.infer<typeof zSubmissionRequest>;

export const zSubmissionResult = z.object({
  evidenceId: z.string().uuid(),
  score: z.number(),
  correct: z.boolean().nullable(),
  feedback: z.string(),
  competencyState: zCompetencyState,
  masteryScore: z.number(),
  nextReviewAt: z.string().nullable(),
  humanReviewCreated: z.boolean(),
});
export type SubmissionResult = z.infer<typeof zSubmissionResult>;

// ---------- Voz ----------

export const zCreateVoiceSessionRequest = z.object({
  lessonContractId: z.string().uuid(),
});
export type CreateVoiceSessionRequest = z.infer<typeof zCreateVoiceSessionRequest>;

export const zVoiceSessionResponse = z.object({
  voiceSessionId: z.string().uuid(),
  mode: z.enum(['realtime', 'mock']),
  provider: z.string(),
  realtimeModelAlias: z.string(),
  ephemeralClientSecret: z.string().nullable(),
  realtimeCallUrl: z.string().nullable(),
  expiresAt: z.string().nullable(),
  sessionPolicy: z.object({
    targetLanguage: z.string(),
    supportLanguage: z.string(),
    targetVariety: z.string(),
    immersionRatio: z.number(),
    maxDurationSeconds: z.number(),
    translationMode: z.string(),
  }),
  mission: z.object({
    objective: z.string(),
    scenario: z.string(),
    openingLine: z.string(),
    /** Guion del interlocutor, solo presente en modo demo (mock). */
    mockLines: z.array(z.string()).optional(),
  }),
  usage: z.object({
    includedMinutes: z.number(),
    usedMinutes: z.number(),
  }),
});
export type VoiceSessionResponse = z.infer<typeof zVoiceSessionResponse>;

export const zEndVoiceSessionRequest = z.object({
  activeSeconds: z.number().int().min(0).max(7200),
  reason: z.enum(['completed', 'user_exit', 'error', 'safety']).default('completed'),
});
export type EndVoiceSessionRequest = z.infer<typeof zEndVoiceSessionRequest>;

// ---------- Progreso y ruta ----------

export const zProgressResponse = z.object({
  enrollmentId: z.string().uuid(),
  /** Las cuatro métricas SIEMPRE separadas (Especificación §6.4). */
  coverage: z.number(),
  mastery: z.number(),
  retention: z.number(),
  readiness: z.number().nullable(),
  criticalMastered: z.number(),
  criticalTotal: z.number(),
  complementaryMastered: z.number(),
  complementaryTotal: z.number(),
  perSkill: z.array(
    z.object({
      skill: zSkill,
      mastered: z.number(),
      total: z.number(),
    }),
  ),
  placement: z
    .object({ overall: zCefrLevel, confidence: z.number(), provisional: z.boolean() })
    .nullable(),
});
export type ProgressResponse = z.infer<typeof zProgressResponse>;

export const zPathResponse = z.object({
  enrollmentId: z.string().uuid(),
  stages: z.array(
    z.object({
      code: z.string(),
      name: z.string(),
      units: z.array(
        z.object({
          code: z.string(),
          name: z.string(),
          competencies: z.array(
            z.object({
              code: z.string(),
              descriptor: z.string(),
              skill: zSkill,
              criticality: z.enum(['critical', 'complementary']),
              state: zCompetencyState,
            }),
          ),
        }),
      ),
    }),
  ),
});
export type PathResponse = z.infer<typeof zPathResponse>;

// ---------- Repaso ----------

export const zReviewQueueResponse = z.object({
  enrollmentId: z.string().uuid(),
  dueItems: z.array(
    z.object({
      reviewItemId: z.string().uuid(),
      competencyCode: z.string(),
      competencyDescriptor: z.string(),
      activityId: z.string().uuid().nullable(),
      lessonContractId: z.string().uuid().nullable(),
      dueAt: z.string(),
      intervalDays: z.number(),
    }),
  ),
});
export type ReviewQueueResponse = z.infer<typeof zReviewQueueResponse>;

// ---------- Seguridad ----------

export const zSafetyReportRequest = z.object({
  category: zSafetyCategory,
  comment: z.string().max(1000).optional(),
  voiceSessionId: z.string().uuid().optional(),
});
export type SafetyReportRequest = z.infer<typeof zSafetyReportRequest>;

// ---------- Revisión humana ----------

export const zHumanReviewDecisionRequest = z.object({
  decision: zReviewDecision,
  reason: z.string().min(3).max(2000),
  correctedValue: z.record(z.string(), z.unknown()).optional(),
});
export type HumanReviewDecisionRequest = z.infer<typeof zHumanReviewDecisionRequest>;
