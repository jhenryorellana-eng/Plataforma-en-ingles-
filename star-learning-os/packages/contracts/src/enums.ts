import { z } from 'zod';

export const zAgeBand = z.enum(['y12_13', 't14_17', 'a18_plus']);
export const zPaceCode = z.enum(['flex', 'accelerated', 'sprint']);
export const zSkill = z.enum(['reading', 'listening', 'speaking', 'writing', 'language_use']);
export const zCefrLevel = z.enum(['PRE_A1', 'A1', 'A2', 'B1', 'B2', 'C1']);
export const zEnrollmentStatus = z.enum([
  'pending_diagnostic',
  'active',
  'paused',
  'completed',
  'cancelled',
]);
export const zConsentPurpose = z.enum([
  'service',
  'ai_voice',
  'storage',
  'international_transfer',
  'analytics',
  'marketing',
  'research',
]);
export const zCompetencyState = z.enum([
  'not_seen',
  'exposed',
  'developing',
  'provisional',
  'mastered',
  'review_required',
]);
export const zActivityKind = z.enum(['mcq', 'gap_fill', 'writing_prompt', 'voice_mission']);
export const zEvidenceSource = z.enum(['practice', 'voice', 'checkpoint', 'diagnostic', 'exam_simulation']);
export const zSafetyCategory = z.enum([
  'inappropriate_content',
  'bullying',
  'self_harm',
  'abuse',
  'pii_request',
  'technical',
  'other',
]);
export const zReviewCaseType = z.enum([
  'placement',
  'stage_gate',
  'integrity',
  'readiness',
  'certificate',
  'low_confidence',
  'appeal',
]);
export const zReviewDecision = z.enum(['confirmed', 'corrected', 'invalidated']);
export const zUserRole = z.enum(['learner', 'guardian', 'staff']);
