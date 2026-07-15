export type AgeBand = 'y12_13' | 't14_17' | 'a18_plus';

export type PaceCode = 'flex' | 'accelerated' | 'sprint';

export type Skill = 'reading' | 'listening' | 'speaking' | 'writing' | 'language_use';

export type CefrLevel = 'PRE_A1' | 'A1' | 'A2' | 'B1' | 'B2' | 'C1';

/** Alineado con Arquitectura Multilingüe §9.4 (learning.evidence.source_type). */
export type EvidenceSourceType = 'practice' | 'voice' | 'checkpoint' | 'diagnostic' | 'exam_simulation';

/** Especificación §12.1: estados de una competencia. */
export type CompetencyStateName =
  | 'not_seen'
  | 'exposed'
  | 'developing'
  | 'provisional'
  | 'mastered'
  | 'review_required';

/** Stack §1.2: consentimientos por finalidad separada. */
export type ConsentPurpose =
  | 'service'
  | 'ai_voice'
  | 'storage'
  | 'international_transfer'
  | 'analytics'
  | 'marketing'
  | 'research';

export type EnrollmentStatus = 'pending_diagnostic' | 'active' | 'paused' | 'completed' | 'cancelled';

export function isMinor(ageBand: AgeBand): boolean {
  return ageBand === 'y12_13' || ageBand === 't14_17';
}
