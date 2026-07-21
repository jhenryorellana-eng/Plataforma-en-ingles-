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

/** Edad mínima de la plataforma (D16). */
export const MINIMUM_PLATFORM_AGE = 12;

/**
 * Edad que la plataforma puede GARANTIZAR con solo el año de nacimiento:
 * la del peor caso (nacido el 31 de diciembre). Ante la duda se protege,
 * nunca se asume mayoría (Stack §5.4 nivel A0: edad declarada).
 */
export function guaranteedAgeForBirthYear(birthYear: number, referenceYear: number): number {
  return referenceYear - birthYear - 1;
}

/**
 * Banda etaria por año de nacimiento, siempre la más restrictiva posible:
 * quien está en el límite recibe la banda menor hasta que la plataforma
 * pida la fecha completa. Devuelve null si incluso en el mejor caso no
 * se puede garantizar la edad mínima de la plataforma.
 */
export function ageBandForBirthYear(birthYear: number, referenceYear: number): AgeBand | null {
  const guaranteedAge = guaranteedAgeForBirthYear(birthYear, referenceYear);
  if (guaranteedAge < MINIMUM_PLATFORM_AGE) return null;
  if (guaranteedAge <= 13) return 'y12_13';
  if (guaranteedAge <= 17) return 't14_17';
  return 'a18_plus';
}

/**
 * Edad que una banda garantiza (su mínimo). Se usa para `minimumAge` de
 * programas: admitir solo si la edad garantizada la cumple.
 */
export const BAND_GUARANTEED_AGE: Record<AgeBand, number> = {
  y12_13: MINIMUM_PLATFORM_AGE,
  t14_17: 14,
  a18_plus: 18,
};
