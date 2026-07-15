import type { PaceCode } from './types';

/** Metodología §9.1 y Especificación §14.1: entitlements por ritmo. */
export const PLAN_LIMITS: Record<PaceCode, { weeklyVoiceMinutes: number; weeklyStudyHours: number }> = {
  flex: { weeklyVoiceMinutes: 90, weeklyStudyHours: 8 },
  accelerated: { weeklyVoiceMinutes: 150, weeklyStudyHours: 12 },
  sprint: { weeklyVoiceMinutes: 240, weeklyStudyHours: 19 },
};

/** Decisión D05 y Especificación COM-05: avisos al 70/90/100% del cupo de voz. */
export const USAGE_ALERT_THRESHOLDS = [0.7, 0.9, 1] as const;

/** Metodología §6 (Reinforce): escalera inicial de recuperación espaciada, en días. */
export const REVIEW_INTERVALS_DAYS = [1, 3, 7, 14, 30] as const;

/** Especificación §12.2: requisitos provisionales de dominio (sujetos a validación psicométrica). */
export const MASTERY_RULES = {
  GLOBAL_THRESHOLD: 0.8,
  MIN_VALID_EVIDENCE: 3,
  MIN_DISTINCT_DAYS: 2,
  DELAYED_RETRIEVAL_MIN_DAYS: 7,
  MIN_CONFIDENCE: 0.5,
  DEFAULT_FRESHNESS_DAYS: 45,
} as const;

/** Especificación §12.5: regla de promoción de etapa. */
export const PROMOTION_RULES = {
  CRITICAL_REQUIRED_RATIO: 1,
  COMPLEMENTARY_REQUIRED_RATIO: 0.85,
} as const;

/**
 * Especificación §12.4: fiabilidad relativa inicial por tipo de evidencia.
 * Los pesos ordenan evidencia; no sustituyen las puertas categóricas.
 */
export const EVIDENCE_WEIGHTS = {
  ASSESSMENT: 1.0,
  DELAYED_RETRIEVAL: 0.9,
  TRANSFER: 0.9,
  INDEPENDENT_PRACTICE: 0.7,
  GUIDED_PRACTICE: 0.3,
  DIAGNOSTIC: 0.5,
} as const;
