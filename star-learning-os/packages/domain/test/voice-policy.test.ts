import { describe, expect, it } from 'vitest';
import { crossedAlertLevel, evaluateVoicePolicy, type VoicePolicyInput } from '../src/voice-policy';

function baseInput(overrides: Partial<VoicePolicyInput>): VoicePolicyInput {
  return {
    ageBand: 't14_17',
    enrollmentStatus: 'active',
    hasActiveGuardianLink: true,
    consents: ['service', 'ai_voice'],
    hasAssent: true,
    zdrVerified: false,
    weeklyMinutesIncluded: 150,
    weeklyMinutesUsed: 30,
    ...overrides,
  };
}

describe('evaluateVoicePolicy — gates de voz juvenil (Stack §8.3, Especificación §18)', () => {
  it('permite a un 14-17 con vínculo, consentimientos y asentimiento', () => {
    const result = evaluateVoicePolicy(baseInput({}));
    expect(result.allowed).toBe(true);
    expect(result.denyReasons).toEqual([]);
  });

  it('bloquea 12-13 sin ZDR verificado aunque todo lo demás esté vigente (gate D17)', () => {
    const result = evaluateVoicePolicy(baseInput({ ageBand: 'y12_13', zdrVerified: false }));
    expect(result.allowed).toBe(false);
    expect(result.denyReasons).toContain('ZDR_REQUIRED');
  });

  it('permite 12-13 cuando ZDR está verificado', () => {
    const result = evaluateVoicePolicy(baseInput({ ageBand: 'y12_13', zdrVerified: true }));
    expect(result.allowed).toBe(true);
  });

  it('bloquea a un menor sin vínculo activo de apoderado', () => {
    const result = evaluateVoicePolicy(baseInput({ hasActiveGuardianLink: false }));
    expect(result.denyReasons).toContain('GUARDIAN_LINK_REQUIRED');
  });

  it('bloquea a un menor sin consentimiento de voz', () => {
    const result = evaluateVoicePolicy(baseInput({ consents: ['service'] }));
    expect(result.denyReasons).toContain('CONSENT_REQUIRED');
  });

  it('bloquea a un menor sin asentimiento', () => {
    const result = evaluateVoicePolicy(baseInput({ hasAssent: false }));
    expect(result.denyReasons).toContain('ASSENT_REQUIRED');
  });

  it('un adulto no requiere vínculo, asentimiento ni ZDR', () => {
    const result = evaluateVoicePolicy(
      baseInput({
        ageBand: 'a18_plus',
        hasActiveGuardianLink: false,
        consents: [],
        hasAssent: false,
      }),
    );
    expect(result.allowed).toBe(true);
  });

  it('bloquea cuando la cuota semanal está agotada', () => {
    const result = evaluateVoicePolicy(baseInput({ weeklyMinutesUsed: 150 }));
    expect(result.denyReasons).toContain('VOICE_QUOTA_EXCEEDED');
    expect(result.remainingMinutes).toBe(0);
  });

  it('una inscripción pausada no puede abrir voz', () => {
    const result = evaluateVoicePolicy(baseInput({ enrollmentStatus: 'paused' }));
    expect(result.denyReasons).toContain('ENROLLMENT_NOT_ACTIVE');
  });
});

describe('avisos de consumo 70/90/100 (COM-05, D05)', () => {
  it('detecta el cruce de cada umbral', () => {
    expect(crossedAlertLevel(0.5, 0.72)).toBe(0.7);
    expect(crossedAlertLevel(0.72, 0.93)).toBe(0.9);
    expect(crossedAlertLevel(0.93, 1)).toBe(1);
  });

  it('no repite un aviso ya emitido', () => {
    expect(crossedAlertLevel(0.75, 0.8)).toBeNull();
  });

  it('no avisa por debajo del primer umbral', () => {
    expect(crossedAlertLevel(0.1, 0.5)).toBeNull();
  });
});
