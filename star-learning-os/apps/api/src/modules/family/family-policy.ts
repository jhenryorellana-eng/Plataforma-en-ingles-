import type { ConsentPurpose } from '@prisma/client';

/** Server-owned policy versions. Client-supplied versions are never authoritative. */
export const ACTIVE_CONSENT_NOTICE_VERSION = '2026-07';
export const ACTIVE_ASSENT_NOTICE_VERSION = '2026-07';
export const REQUIRED_LEARNING_CONSENTS: ConsentPurpose[] = ['service', 'storage'];
export const REQUIRED_VOICE_CONSENTS: ConsentPurpose[] = ['ai_voice', 'international_transfer'];
export const INVITATION_TTL_MS = 24 * 60 * 60 * 1000;
