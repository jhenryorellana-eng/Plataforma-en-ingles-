import { USAGE_ALERT_THRESHOLDS } from './constants';
import { isMinor } from './types';
import type { AgeBand, ConsentPurpose, EnrollmentStatus } from './types';

export interface VoicePolicyInput {
  ageBand: AgeBand;
  enrollmentStatus: EnrollmentStatus;
  hasActiveGuardianLink: boolean;
  consents: ConsentPurpose[];
  hasAssent: boolean;
  /** Gate técnico 12–13: Zero Data Retention aprobado Y verificado (Stack §1.1). */
  zdrVerified: boolean;
  weeklyMinutesIncluded: number;
  weeklyMinutesUsed: number;
}

export type VoiceDenyReason =
  | 'ENROLLMENT_NOT_ACTIVE'
  | 'GUARDIAN_LINK_REQUIRED'
  | 'CONSENT_REQUIRED'
  | 'ASSENT_REQUIRED'
  | 'ZDR_REQUIRED'
  | 'VOICE_QUOTA_EXCEEDED';

export type UsageAlertLevel = (typeof USAGE_ALERT_THRESHOLDS)[number];

export interface VoicePolicyResult {
  allowed: boolean;
  denyReasons: VoiceDenyReason[];
  usageRatio: number;
  usageAlertLevel: UsageAlertLevel | null;
  remainingMinutes: number;
}

const MINOR_REQUIRED_CONSENTS: ConsentPurpose[] = ['ai_voice', 'international_transfer'];

/**
 * Autorización de sesión de voz (Stack §8.3): la política es un bloqueo técnico,
 * no una casilla. Cero sesiones 12–13 sin ZDR y cero sesiones juveniles sin
 * vínculo, consentimiento y asentimiento vigentes (Especificación §18).
 */
export function evaluateVoicePolicy(input: VoicePolicyInput): VoicePolicyResult {
  const denyReasons: VoiceDenyReason[] = [];

  if (input.enrollmentStatus !== 'active') {
    denyReasons.push('ENROLLMENT_NOT_ACTIVE');
  }

  if (isMinor(input.ageBand)) {
    if (!input.hasActiveGuardianLink) {
      denyReasons.push('GUARDIAN_LINK_REQUIRED');
    }
    if (!MINOR_REQUIRED_CONSENTS.every((purpose) => input.consents.includes(purpose))) {
      denyReasons.push('CONSENT_REQUIRED');
    }
    if (!input.hasAssent) {
      denyReasons.push('ASSENT_REQUIRED');
    }
    if (input.ageBand === 'y12_13' && !input.zdrVerified) {
      denyReasons.push('ZDR_REQUIRED');
    }
  }

  const remainingMinutes = Math.max(0, input.weeklyMinutesIncluded - input.weeklyMinutesUsed);
  if (remainingMinutes <= 0) {
    denyReasons.push('VOICE_QUOTA_EXCEEDED');
  }

  const usageRatio =
    input.weeklyMinutesIncluded <= 0 ? 1 : input.weeklyMinutesUsed / input.weeklyMinutesIncluded;

  return {
    allowed: denyReasons.length === 0,
    denyReasons,
    usageRatio,
    usageAlertLevel: usageAlertLevel(usageRatio),
    remainingMinutes,
  };
}

export function usageAlertLevel(ratio: number): UsageAlertLevel | null {
  let level: UsageAlertLevel | null = null;
  for (const threshold of USAGE_ALERT_THRESHOLDS) {
    if (ratio >= threshold) level = threshold;
  }
  return level;
}

/** Aviso que se cruza al pasar de `previousRatio` a `newRatio` (COM-05: 70/90/100%). */
export function crossedAlertLevel(previousRatio: number, newRatio: number): UsageAlertLevel | null {
  const before = usageAlertLevel(previousRatio);
  const after = usageAlertLevel(newRatio);
  if (after !== null && after !== before) return after;
  return null;
}
