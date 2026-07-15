import { EVIDENCE_WEIGHTS, MASTERY_RULES } from './constants';
import type { CompetencyStateName, EvidenceSourceType } from './types';

export interface EvidenceForMastery {
  at: Date;
  sourceType: EvidenceSourceType;
  usedAids: boolean;
  isTransfer: boolean;
  isDelayedRetrieval: boolean;
  /** Puntaje normalizado 0..1. */
  score: number;
  dimensionScores?: Record<string, number>;
  /** Confianza del scorer 0..1. */
  confidence: number;
  /** Alerta grave de audio, integridad o asistencia indebida (Especificación §12.2.8). */
  hasCriticalAlert: boolean;
}

export interface MasteryRuleConfig {
  globalThreshold: number;
  /** Pisos no compensables por dimensión de rúbrica (Especificación §11.2). */
  dimensionFloors: Record<string, number>;
  /** Horizonte de frescura del nodo (Especificación §11.2). */
  freshnessDays: number;
}

export const DEFAULT_MASTERY_CONFIG: MasteryRuleConfig = {
  globalThreshold: MASTERY_RULES.GLOBAL_THRESHOLD,
  dimensionFloors: {},
  freshnessDays: MASTERY_RULES.DEFAULT_FRESHNESS_DAYS,
};

export interface MasteryConditions {
  enoughEvidence: boolean;
  onDistinctDays: boolean;
  independentProduction: boolean;
  transferDemonstrated: boolean;
  delayedRetrievalPassed: boolean;
  globalThresholdMet: boolean;
  dimensionFloorsMet: boolean;
  noCriticalAlerts: boolean;
}

export interface MasteryEvaluation {
  state: CompetencyStateName;
  /** Promedio ponderado por fiabilidad de evidencia (Especificación §12.4). */
  masteryScore: number;
  confidence: number;
  /** 1 = recién demostrada, 0 = frescura vencida (Especificación §12.3). */
  freshness: number;
  conditions: MasteryConditions;
  validEvidenceCount: number;
  lastEvidenceAt: Date | null;
}

export function evidenceWeight(evidence: EvidenceForMastery): number {
  if (evidence.sourceType === 'checkpoint' || evidence.sourceType === 'exam_simulation') {
    return EVIDENCE_WEIGHTS.ASSESSMENT;
  }
  if (evidence.sourceType === 'diagnostic') {
    return EVIDENCE_WEIGHTS.DIAGNOSTIC;
  }
  if (evidence.isDelayedRetrieval) {
    return EVIDENCE_WEIGHTS.DELAYED_RETRIEVAL;
  }
  if (evidence.isTransfer) {
    return EVIDENCE_WEIGHTS.TRANSFER;
  }
  return evidence.usedAids ? EVIDENCE_WEIGHTS.GUIDED_PRACTICE : EVIDENCE_WEIGHTS.INDEPENDENT_PRACTICE;
}

function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function computeFreshness(lastEvidenceAt: Date | null, freshnessDays: number, now: Date): number {
  if (!lastEvidenceAt) return 0;
  const elapsedDays = (now.getTime() - lastEvidenceAt.getTime()) / MS_PER_DAY;
  return clamp01(1 - elapsedDays / freshnessDays);
}

function floorsMet(evidences: EvidenceForMastery[], floors: Record<string, number>): boolean {
  const floorEntries = Object.entries(floors);
  if (floorEntries.length === 0) return true;
  return floorEntries.every(([dimension, floor]) => {
    const withDimension = evidences.filter((e) => e.dimensionScores?.[dimension] !== undefined);
    if (withDimension.length === 0) return false;
    const latest = withDimension.reduce((a, b) => (a.at > b.at ? a : b));
    const score = latest.dimensionScores?.[dimension];
    return score !== undefined && score >= floor;
  });
}

/**
 * Evalúa el estado de una competencia a partir de su historial de evidencias,
 * aplicando las reglas provisionales de dominio de Especificación §12.2.
 * El paso del tiempo no borra dominio: lo convierte en `review_required` (§12.3).
 */
export function evaluateMastery(
  evidences: EvidenceForMastery[],
  config: MasteryRuleConfig = DEFAULT_MASTERY_CONFIG,
  now: Date = new Date(),
): MasteryEvaluation {
  const sorted = [...evidences].sort((a, b) => a.at.getTime() - b.at.getTime());
  const valid = sorted.filter((e) => !e.hasCriticalAlert);
  const lastEvidenceAt = sorted.length > 0 ? sorted[sorted.length - 1].at : null;

  if (sorted.length === 0) {
    return {
      state: 'not_seen',
      masteryScore: 0,
      confidence: 0,
      freshness: 0,
      conditions: emptyConditions(),
      validEvidenceCount: 0,
      lastEvidenceAt: null,
    };
  }

  const totalWeight = valid.reduce((sum, e) => sum + evidenceWeight(e), 0);
  const masteryScore =
    totalWeight === 0 ? 0 : valid.reduce((sum, e) => sum + evidenceWeight(e) * e.score, 0) / totalWeight;

  const passing = valid.filter((e) => e.score >= config.globalThreshold);
  const conditions: MasteryConditions = {
    enoughEvidence: valid.length >= MASTERY_RULES.MIN_VALID_EVIDENCE,
    onDistinctDays: new Set(valid.map((e) => dayKey(e.at))).size >= MASTERY_RULES.MIN_DISTINCT_DAYS,
    independentProduction: passing.some((e) => !e.usedAids),
    transferDemonstrated: passing.some((e) => e.isTransfer),
    delayedRetrievalPassed: passing.some((e) => e.isDelayedRetrieval),
    globalThresholdMet: masteryScore >= config.globalThreshold,
    dimensionFloorsMet: floorsMet(valid, config.dimensionFloors),
    noCriticalAlerts: sorted.every((e) => !e.hasCriticalAlert),
  };

  const confidence = clamp01(
    (valid.reduce((sum, e) => sum + e.confidence, 0) / Math.max(1, valid.length)) *
      Math.min(1, valid.length / MASTERY_RULES.MIN_VALID_EVIDENCE),
  );

  const freshness = computeFreshness(lastEvidenceAt, config.freshnessDays, now);
  const allConditionsMet = Object.values(conditions).every(Boolean);
  const provisionalConditionsMet =
    conditions.globalThresholdMet &&
    conditions.enoughEvidence &&
    conditions.onDistinctDays &&
    conditions.independentProduction &&
    conditions.noCriticalAlerts;

  let state: CompetencyStateName;
  if (allConditionsMet && confidence >= MASTERY_RULES.MIN_CONFIDENCE) {
    state = freshness > 0 ? 'mastered' : 'review_required';
  } else if (provisionalConditionsMet) {
    state = 'provisional';
  } else {
    state = 'developing';
  }

  return {
    state,
    masteryScore,
    confidence,
    freshness,
    conditions,
    validEvidenceCount: valid.length,
    lastEvidenceAt,
  };
}

function emptyConditions(): MasteryConditions {
  return {
    enoughEvidence: false,
    onDistinctDays: false,
    independentProduction: false,
    transferDemonstrated: false,
    delayedRetrievalPassed: false,
    globalThresholdMet: false,
    dimensionFloorsMet: false,
    noCriticalAlerts: true,
  };
}
