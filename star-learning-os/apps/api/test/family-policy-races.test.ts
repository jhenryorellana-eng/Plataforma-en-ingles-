import assert from 'node:assert/strict';
import test from 'node:test';
import type { PrismaService } from '../src/prisma/prisma.service';
import type { SessionUser } from '../src/common/session';
import { FamilyService } from '../src/modules/family/family.service';
import { VoiceService } from '../src/modules/voice/voice.service';

const noOpAudit = {
  record: async () => undefined,
  recordInTx: async () => undefined,
};
const noOpOutbox = { emitInTx: async () => undefined };

function familyServiceWithInactiveLink() {
  let consentWrites = 0;
  let locked = false;
  const tx = {
    $executeRaw: async () => { locked = true; return 1; },
    guardianLearnerLink: {
      findFirst: async () => {
        assert.equal(locked, true, 'el vínculo debe releerse después de adquirir el lock');
        return null;
      },
    },
    consentGrant: {
      updateMany: async () => { consentWrites += 1; return { count: 0 }; },
      findFirst: async () => null,
      create: async () => { consentWrites += 1; return {}; },
    },
  };
  const prisma = { $transaction: async (work: (client: typeof tx) => unknown) => work(tx) } as unknown as PrismaService;
  return {
    service: new FamilyService(prisma, noOpAudit as never, noOpOutbox as never),
    consentWrites: () => consentWrites,
  };
}

test('grant revalida el vínculo dentro de la transacción y no escribe tras revocación concurrente', async () => {
  const { service, consentWrites } = familyServiceWithInactiveLink();
  await assert.rejects(
    () => service.grantConsents('guardian-1', { learnerId: 'learner-1', purposes: ['service'] }),
    (error: unknown) => error instanceof Error && 'status' in error && error.status === 403,
  );
  assert.equal(consentWrites(), 0);
});

test('revoke revalida el vínculo dentro de la transacción y no revoca en nombre de un ex-apoderado', async () => {
  const { service, consentWrites } = familyServiceWithInactiveLink();
  await assert.rejects(
    () => service.revokeConsent('guardian-1', 'learner-1', 'service'),
    (error: unknown) => error instanceof Error && 'status' in error && error.status === 403,
  );
  assert.equal(consentWrites(), 0);
});

test('guardian summary consulta solo consentimientos de la versión activa para no encender toggles stale', async () => {
  let queriedNoticeVersion: string | undefined;
  const prisma = {
    guardianLearnerLink: {
      findMany: async () => [{ learner: { id: 'learner-1', displayName: 'Learner', ageBand: 't14_17' } }],
    },
    enrollment: { findMany: async () => [] },
    consentGrant: {
      findMany: async ({ where }: { where: { noticeVersion?: string } }) => {
        queriedNoticeVersion = where.noticeVersion;
        return [{ purpose: 'service' }];
      },
    },
    safetySignal: { count: async () => 0 },
    humanReview: { count: async () => 0 },
  } as unknown as PrismaService;
  const service = new FamilyService(prisma, noOpAudit as never, noOpOutbox as never);
  const summary = await service.guardianSummary('guardian-1') as { learners: Array<{ consents: string[] }> };
  assert.equal(queriedNoticeVersion, '2026-07');
  assert.deepEqual(summary.learners[0]?.consents, ['service']);
});

test('onboarding con ageBand null adopta postura juvenil y nunca queda readyToEnroll', async () => {
  const prisma = {
    guardianInvitation: { updateMany: async () => ({ count: 0 }), findFirst: async () => null },
    guardianLearnerLink: { findFirst: async () => ({ id: 'link-1' }) },
    consentGrant: { findMany: async () => [{ purpose: 'service' }, { purpose: 'storage' }] },
    youthAssent: { findFirst: async () => ({ id: 'assent-1' }) },
  } as unknown as PrismaService;
  const service = new FamilyService(prisma, noOpAudit as never, noOpOutbox as never);
  const learner: SessionUser = {
    id: 'learner-1', displayName: 'Learner', role: 'learner', ageBand: null, capabilities: [],
  };
  const status = await service.onboardingStatus(learner);
  assert.equal(status.isMinor, true);
  assert.equal(status.readyToEnroll, false);
});

test('si se revoca autorización durante la llamada al provider, voz no persiste sesión ni expone el secret', async () => {
  let revoked = false;
  let persistedSessions = 0;
  let postProviderDenials = 0;
  const ordering: string[] = [];
  const currentConsents = () => revoked
    ? []
    : [
        { purpose: 'service' },
        { purpose: 'storage' },
        { purpose: 'ai_voice' },
        { purpose: 'international_transfer' },
      ];
  const tx = {
    $executeRaw: async () => { ordering.push('lock'); return 1; },
    enrollment: { findUniqueOrThrow: async () => ({ status: 'active' }) },
    guardianLearnerLink: { findFirst: async () => (revoked ? null : { id: 'link-1' }) },
    consentGrant: { findMany: async () => currentConsents() },
    youthAssent: { findFirst: async () => (revoked ? null : { id: 'assent-1' }) },
    entitlement: { findUnique: async () => ({ weeklyVoiceMinutes: 150 }) },
    voiceSession: {
      aggregate: async () => ({ _sum: { activeSeconds: 0 } }),
      create: async () => { persistedSessions += 1; return { id: 'voice-1' }; },
    },
  };
  const prisma = {
    guardianLearnerLink: { findFirst: async () => ({ id: 'link-1' }) },
    consentGrant: { findMany: async () => currentConsents() },
    youthAssent: { findFirst: async () => ({ id: 'assent-1' }) },
    entitlement: { findUnique: async () => ({ weeklyVoiceMinutes: 150 }) },
    voiceSession: { aggregate: async () => ({ _sum: { activeSeconds: 0 } }) },
    lessonContract: {
      findFirst: async () => ({
        id: 'lesson-1', objective: 'Practice', immersionRatio: 0.8,
        correctionPolicy: 'delayed', translationPolicy: 'on_request', timeboxSeconds: 300,
        activities: [{ prompt: { scenario: 'Cafe', openingLine: 'Hello' } }], unit: {},
      }),
    },
    languageProgram: { findUniqueOrThrow: async () => ({ targetLanguage: 'en' }) },
    $transaction: async (work: (client: typeof tx) => unknown) => work(tx),
  } as unknown as PrismaService;
  const service = Object.create(VoiceService.prototype) as VoiceService;
  Object.assign(service, {
    prisma,
    outboxService: noOpOutbox,
    auditService: {
      ...noOpAudit,
      recordInTx: async (_tx: unknown, entry: { metadata?: { phase?: string } }) => {
        if (entry.metadata?.phase === 'post_provider_revalidation') postProviderDenials += 1;
      },
    },
    economyService: {},
    provider: {
      name: 'realtime',
      createEphemeralSession: async () => {
        ordering.push('provider');
        revoked = true;
        return {
          clientSecret: 'must-never-reach-client', providerCallId: 'provider-1',
          callUrl: 'https://example.test/realtime', expiresAt: new Date().toISOString(),
        };
      },
    },
  });
  const actor: SessionUser = {
    id: 'learner-1', displayName: 'Learner', role: 'learner', ageBand: 't14_17', capabilities: [],
  };
  const enrollment = {
    id: 'enrollment-1', learnerId: actor.id, learner: { ...actor, email: null, authId: null, createdAt: new Date() },
    programId: 'program-1', programVersionId: 'version-1', status: 'active', supportLanguage: 'es',
    targetVariety: 'en-US', interfaceLocale: 'es-PE', paceCode: 'accelerated', paceConfirmedAt: null,
    placement: null, createdAt: new Date(), updatedAt: new Date(),
  } as never;

  await assert.rejects(
    () => service.create(actor, enrollment, { lessonContractId: 'lesson-1' }),
    (error: unknown) => error instanceof Error && 'code' in error && error.code === 'GUARDIAN_LINK_REQUIRED',
  );
  assert.equal(persistedSessions, 0);
  assert.equal(postProviderDenials, 1);
  assert.deepEqual(ordering, ['provider', 'lock']);
});

test('voz falla cerrado con ageBand null antes de llamar al provider', async () => {
  let providerCalls = 0;
  const service = Object.create(VoiceService.prototype) as VoiceService;
  Object.assign(service, {
    prisma: {}, outboxService: noOpOutbox, auditService: noOpAudit, economyService: {},
    provider: { name: 'realtime', createEphemeralSession: async () => { providerCalls += 1; return {}; } },
  });
  const actor: SessionUser = {
    id: 'learner-1', displayName: 'Learner', role: 'learner', ageBand: null, capabilities: [],
  };
  const enrollment = {
    id: 'enrollment-1', learnerId: actor.id,
    learner: { ...actor, email: null, authId: null, createdAt: new Date() },
  } as never;
  await assert.rejects(
    () => service.create(actor, enrollment, { lessonContractId: 'lesson-1' }),
    (error: unknown) => error instanceof Error && 'code' in error && error.code === 'AGE_NOT_ALLOWED',
  );
  assert.equal(providerCalls, 0);
});

test('heartbeat delta cero no conecta ni escribe tiempo', async () => {
  let heartbeatWrites = 0;
  const session = {
    id: 'voice-1', enrollmentId: 'enrollment-1', lessonContractId: 'lesson-1', status: 'created',
    activeSeconds: 0, startedAt: new Date(Date.now() - 30_000), lastHeartbeatAt: new Date(Date.now() - 30_000),
    enrollment: { learnerId: 'adult-1' },
  };
  const prisma = {
    voiceSession: {
      findUnique: async () => session,
      updateMany: async () => { heartbeatWrites += 1; return { count: 1 }; },
      aggregate: async () => ({ _sum: { activeSeconds: 0 } }),
    },
    entitlement: { findUnique: async () => ({ weeklyVoiceMinutes: 10 }) },
    lessonContract: { findUniqueOrThrow: async () => ({ timeboxSeconds: 300 }) },
  } as unknown as PrismaService;
  const service = Object.create(VoiceService.prototype) as VoiceService;
  Object.assign(service, { prisma, outboxService: noOpOutbox, auditService: noOpAudit });
  const actor: SessionUser = {
    id: 'adult-1', displayName: 'Adult', role: 'learner', ageBand: 'a18_plus', capabilities: [],
  };
  const result = await service.heartbeat(actor, session.id, 0);
  assert.equal(result.shouldEnd, false);
  assert.equal(heartbeatWrites, 0);
});

test('end conserva solo segundos verificados y serializa el cap diario antes de contar Novas', async () => {
  const ordering: string[] = [];
  let persistedActiveSeconds: number | undefined;
  const session = {
    id: 'voice-1', enrollmentId: 'enrollment-1', lessonContractId: 'lesson-1', status: 'connected',
    activeSeconds: 60, startedAt: new Date(Date.now() - 120_000), lastHeartbeatAt: new Date(Date.now() - 60_000),
    modelAlias: 'realtime_tutor_primary', mode: 'realtime',
    enrollment: { learnerId: 'learner-1' },
  };
  const tx = {
    voiceSession: {
      updateMany: async ({ data }: { data: { activeSeconds: number } }) => {
        persistedActiveSeconds = data.activeSeconds;
        return { count: 1 };
      },
    },
    aiUsageRecord: { create: async () => ({}) },
    $executeRaw: async () => { ordering.push('lock'); return 1; },
    xpEvent: { count: async () => { ordering.push('count'); return 0; } },
  };
  const prisma = {
    voiceSession: {
      findUnique: async () => session,
      aggregate: async () => ({ _sum: { activeSeconds: 60 } }),
    },
    lessonContract: { findUniqueOrThrow: async () => ({ timeboxSeconds: 300 }) },
    entitlement: { findUnique: async () => ({ weeklyVoiceMinutes: 10 }) },
    $transaction: async (work: (client: typeof tx) => unknown) => work(tx),
  } as unknown as PrismaService;
  const service = Object.create(VoiceService.prototype) as VoiceService;
  Object.assign(service, {
    prisma,
    outboxService: noOpOutbox,
    auditService: noOpAudit,
    economyService: { grantNovasInTx: async () => { ordering.push('grant'); return true; } },
  });
  const actor: SessionUser = {
    id: 'learner-1', displayName: 'Learner', role: 'learner', ageBand: 't14_17', capabilities: [],
  };
  const result = await service.end(actor, session.id, { activeSeconds: 999, reason: 'completed' }) as { novasAwarded: number };
  assert.equal(persistedActiveSeconds, 60);
  assert.deepEqual(ordering, ['lock', 'count', 'grant']);
  assert.equal(result.novasAwarded, 30);
});
