import { PROMOTION_RULES } from './constants';
import type { Skill } from './types';

export interface StageGateInput {
  criticalTotal: number;
  criticalMastered: number;
  complementaryTotal: number;
  complementaryMastered: number;
  /** Pisos por habilidad, no compensables (Especificación §12.5). */
  skillFloorsMet: Partial<Record<Skill, boolean>>;
  delayedRetrievalApproved: boolean;
  unresolvedIntegrityAlerts: number;
  isMinor: boolean;
}

export type StageGateBlockReason =
  | 'CRITICAL_INCOMPLETE'
  | 'COMPLEMENTARY_BELOW_85'
  | 'SKILL_FLOOR_NOT_MET'
  | 'RETENTION_PENDING'
  | 'INTEGRITY_ALERT_OPEN';

export interface StageGateResult {
  eligible: boolean;
  blockedReasons: StageGateBlockReason[];
  /** Toda promoción de etapa de un menor exige revisión humana (Especificación §13.3). */
  requiresHumanReview: boolean;
  criticalRatio: number;
  complementaryRatio: number;
}

/**
 * Puerta de etapa (Especificación §12.5): 100% de competencias críticas,
 * ≥85% de complementarias, pisos por habilidad, retención vigente y cero
 * alertas de integridad sin resolver. No se compensa una debilidad grave
 * con una nota alta en otra habilidad.
 */
export function evaluateStageGate(input: StageGateInput): StageGateResult {
  const blockedReasons: StageGateBlockReason[] = [];

  const criticalRatio = input.criticalTotal === 0 ? 1 : input.criticalMastered / input.criticalTotal;
  if (criticalRatio < PROMOTION_RULES.CRITICAL_REQUIRED_RATIO) {
    blockedReasons.push('CRITICAL_INCOMPLETE');
  }

  const complementaryRatio =
    input.complementaryTotal === 0 ? 1 : input.complementaryMastered / input.complementaryTotal;
  if (complementaryRatio < PROMOTION_RULES.COMPLEMENTARY_REQUIRED_RATIO) {
    blockedReasons.push('COMPLEMENTARY_BELOW_85');
  }

  if (Object.values(input.skillFloorsMet).some((met) => met === false)) {
    blockedReasons.push('SKILL_FLOOR_NOT_MET');
  }

  if (!input.delayedRetrievalApproved) {
    blockedReasons.push('RETENTION_PENDING');
  }

  if (input.unresolvedIntegrityAlerts > 0) {
    blockedReasons.push('INTEGRITY_ALERT_OPEN');
  }

  return {
    eligible: blockedReasons.length === 0,
    blockedReasons,
    requiresHumanReview: input.isMinor,
    criticalRatio,
    complementaryRatio,
  };
}
