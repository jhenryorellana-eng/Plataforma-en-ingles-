import type { CefrLevel, Skill } from './types';

export interface PlacementResponse {
  skill: Skill;
  correct: boolean;
}

export interface PlacementEstimate {
  overall: CefrLevel;
  perSkill: Partial<Record<Skill, CefrLevel>>;
  confidence: number;
  /** El placement de un menor es siempre provisional hasta revisión humana (MAP-10). */
  provisional: true;
}

const LEVEL_ORDER: CefrLevel[] = ['PRE_A1', 'A1', 'A2', 'B1', 'B2', 'C1'];

function levelFromAccuracy(accuracy: number): CefrLevel {
  if (accuracy >= 0.75) return 'B2';
  if (accuracy >= 0.5) return 'B1';
  if (accuracy >= 0.3) return 'A2';
  return 'A1';
}

/**
 * Estimación multietapa simplificada del MVP (Especificación §7.2: "multietapa,
 * no un CAT psicométrico completo"). Regla de ubicación §7.4: no se promedia;
 * el alumno ingresa al nivel donde puede participar con éxito (mínimo entre
 * habilidades evaluadas) y las habilidades rezagadas generan carriles paralelos.
 */
export function estimatePlacement(responses: PlacementResponse[]): PlacementEstimate {
  const perSkill: Partial<Record<Skill, CefrLevel>> = {};
  const skills = [...new Set(responses.map((r) => r.skill))];

  for (const skill of skills) {
    const ofSkill = responses.filter((r) => r.skill === skill);
    const accuracy = ofSkill.filter((r) => r.correct).length / ofSkill.length;
    perSkill[skill] = levelFromAccuracy(accuracy);
  }

  const levels = Object.values(perSkill);
  const overall =
    levels.length === 0
      ? 'A1'
      : levels.reduce((min, level) =>
          LEVEL_ORDER.indexOf(level) < LEVEL_ORDER.indexOf(min) ? level : min,
        );

  const confidence = Math.min(1, responses.length / 12) * (skills.length >= 3 ? 1 : 0.6);

  return { overall, perSkill, confidence, provisional: true };
}
