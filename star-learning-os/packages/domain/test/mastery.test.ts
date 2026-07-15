import { describe, expect, it } from 'vitest';
import {
  DEFAULT_MASTERY_CONFIG,
  evaluateMastery,
  evidenceWeight,
  type EvidenceForMastery,
} from '../src/mastery';

const NOW = new Date('2026-07-15T12:00:00Z');

function evidence(overrides: Partial<EvidenceForMastery>): EvidenceForMastery {
  return {
    at: new Date('2026-07-10T10:00:00Z'),
    sourceType: 'practice',
    usedAids: false,
    isTransfer: false,
    isDelayedRetrieval: false,
    score: 0.9,
    confidence: 0.8,
    hasCriticalAlert: false,
    ...overrides,
  };
}

/** Camino completo §12.2: 3+ evidencias, 2 días, independiente, transferencia y diferida. */
function fullMasteryPath(): EvidenceForMastery[] {
  return [
    evidence({ at: new Date('2026-07-01T10:00:00Z'), usedAids: true, score: 0.85 }),
    evidence({ at: new Date('2026-07-02T10:00:00Z'), score: 0.9 }),
    evidence({ at: new Date('2026-07-03T10:00:00Z'), isTransfer: true, score: 0.85 }),
    evidence({ at: new Date('2026-07-10T10:00:00Z'), isDelayedRetrieval: true, score: 0.9 }),
  ];
}

describe('evaluateMastery — Especificación §12.2', () => {
  it('sin evidencia el estado es not_seen', () => {
    const result = evaluateMastery([], DEFAULT_MASTERY_CONFIG, NOW);
    expect(result.state).toBe('not_seen');
    expect(result.masteryScore).toBe(0);
  });

  it('la práctica guiada por sí sola nunca declara dominio (falta producción independiente)', () => {
    const evidences = [
      evidence({ at: new Date('2026-07-01T10:00:00Z'), usedAids: true }),
      evidence({ at: new Date('2026-07-02T10:00:00Z'), usedAids: true }),
      evidence({ at: new Date('2026-07-03T10:00:00Z'), usedAids: true }),
      evidence({ at: new Date('2026-07-10T10:00:00Z'), usedAids: true, isTransfer: true }),
      evidence({ at: new Date('2026-07-11T10:00:00Z'), usedAids: true, isDelayedRetrieval: true }),
    ];
    const result = evaluateMastery(evidences, DEFAULT_MASTERY_CONFIG, NOW);
    expect(result.state).not.toBe('mastered');
    expect(result.conditions.independentProduction).toBe(false);
  });

  it('el camino completo declara mastered', () => {
    const result = evaluateMastery(fullMasteryPath(), DEFAULT_MASTERY_CONFIG, NOW);
    expect(result.state).toBe('mastered');
    expect(result.conditions.transferDemonstrated).toBe(true);
    expect(result.conditions.delayedRetrievalPassed).toBe(true);
  });

  it('sin transferencia ni recuperación diferida queda en provisional aunque el promedio sea alto', () => {
    const evidences = [
      evidence({ at: new Date('2026-07-01T10:00:00Z'), score: 0.95 }),
      evidence({ at: new Date('2026-07-02T10:00:00Z'), score: 0.95 }),
      evidence({ at: new Date('2026-07-03T10:00:00Z'), score: 0.95 }),
    ];
    const result = evaluateMastery(evidences, DEFAULT_MASTERY_CONFIG, NOW);
    expect(result.state).toBe('provisional');
  });

  it('una alerta grave de integridad bloquea el dominio (§12.2.6)', () => {
    const evidences = fullMasteryPath();
    evidences.push(evidence({ at: new Date('2026-07-11T10:00:00Z'), hasCriticalAlert: true }));
    const result = evaluateMastery(evidences, DEFAULT_MASTERY_CONFIG, NOW);
    expect(result.conditions.noCriticalAlerts).toBe(false);
    expect(result.state).not.toBe('mastered');
  });

  it('un piso de dimensión no compensable bloquea el dominio', () => {
    const config = { ...DEFAULT_MASTERY_CONFIG, dimensionFloors: { pronunciation: 0.7 } };
    const evidences = fullMasteryPath().map((e) => ({
      ...e,
      dimensionScores: { pronunciation: 0.5, fluency: 0.95 },
    }));
    const result = evaluateMastery(evidences, config, NOW);
    expect(result.conditions.dimensionFloorsMet).toBe(false);
    expect(result.state).not.toBe('mastered');
  });

  it('el tiempo no borra dominio: lo convierte en review_required (§12.3)', () => {
    const longAgo = new Date('2026-01-01T12:00:00Z');
    const evidences = fullMasteryPath().map((e, i) => ({
      ...e,
      at: new Date(longAgo.getTime() + i * 24 * 60 * 60 * 1000),
    }));
    const result = evaluateMastery(evidences, DEFAULT_MASTERY_CONFIG, NOW);
    expect(result.state).toBe('review_required');
    expect(result.masteryScore).toBeGreaterThan(0.8);
  });

  it('evidencias en un solo día no cumplen la condición de días distintos', () => {
    const sameDay = [
      evidence({ at: new Date('2026-07-10T08:00:00Z') }),
      evidence({ at: new Date('2026-07-10T09:00:00Z'), isTransfer: true }),
      evidence({ at: new Date('2026-07-10T10:00:00Z'), isDelayedRetrieval: true }),
    ];
    const result = evaluateMastery(sameDay, DEFAULT_MASTERY_CONFIG, NOW);
    expect(result.conditions.onDistinctDays).toBe(false);
    expect(result.state).not.toBe('mastered');
  });
});

describe('evidenceWeight — Especificación §12.4', () => {
  it('respeta la tabla de fiabilidad relativa', () => {
    expect(evidenceWeight(evidence({ usedAids: true }))).toBe(0.3);
    expect(evidenceWeight(evidence({ usedAids: false }))).toBe(0.7);
    expect(evidenceWeight(evidence({ isTransfer: true }))).toBe(0.9);
    expect(evidenceWeight(evidence({ isDelayedRetrieval: true }))).toBe(0.9);
    expect(evidenceWeight(evidence({ sourceType: 'checkpoint' }))).toBe(1);
    expect(evidenceWeight(evidence({ sourceType: 'exam_simulation' }))).toBe(1);
  });
});
