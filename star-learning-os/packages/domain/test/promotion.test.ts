import { describe, expect, it } from 'vitest';
import { evaluateStageGate, type StageGateInput } from '../src/promotion';

function baseGate(overrides: Partial<StageGateInput>): StageGateInput {
  return {
    criticalTotal: 10,
    criticalMastered: 10,
    complementaryTotal: 20,
    complementaryMastered: 18,
    skillFloorsMet: { reading: true, listening: true, speaking: true, writing: true },
    delayedRetrievalApproved: true,
    unresolvedIntegrityAlerts: 0,
    isMinor: true,
    ...overrides,
  };
}

describe('evaluateStageGate — Especificación §12.5', () => {
  it('aprueba con 100% críticas y 90% complementarias', () => {
    const result = evaluateStageGate(baseGate({}));
    expect(result.eligible).toBe(true);
    expect(result.requiresHumanReview).toBe(true);
  });

  it('bloquea si falta una competencia crítica (no hay compensación)', () => {
    const result = evaluateStageGate(baseGate({ criticalMastered: 9 }));
    expect(result.eligible).toBe(false);
    expect(result.blockedReasons).toContain('CRITICAL_INCOMPLETE');
  });

  it('bloquea por complementarias bajo el 85%', () => {
    const result = evaluateStageGate(baseGate({ complementaryMastered: 16 }));
    expect(result.eligible).toBe(false);
    expect(result.blockedReasons).toContain('COMPLEMENTARY_BELOW_85');
  });

  it('un piso de habilidad no se compensa con otra nota alta', () => {
    const result = evaluateStageGate(
      baseGate({ skillFloorsMet: { reading: true, speaking: false } }),
    );
    expect(result.eligible).toBe(false);
    expect(result.blockedReasons).toContain('SKILL_FLOOR_NOT_MET');
  });

  it('una alerta de integridad abierta bloquea la promoción', () => {
    const result = evaluateStageGate(baseGate({ unresolvedIntegrityAlerts: 1 }));
    expect(result.eligible).toBe(false);
    expect(result.blockedReasons).toContain('INTEGRITY_ALERT_OPEN');
  });

  it('la promoción de un adulto no exige revisión humana obligatoria', () => {
    const result = evaluateStageGate(baseGate({ isMinor: false }));
    expect(result.requiresHumanReview).toBe(false);
  });
});
