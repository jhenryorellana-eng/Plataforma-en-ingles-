import assert from 'node:assert/strict';
import test from 'node:test';
import type { PrismaService } from '../src/prisma/prisma.service';
import { AccessService, type EnrollmentWithLearner } from '../src/common/access.service';
import type { SessionUser } from '../src/common/session';

const enrollment = {
  id: 'enrollment-1',
  learnerId: 'learner-1',
  learner: { ageBand: 't14_17' },
} as unknown as EnrollmentWithLearner;

function actor(overrides: Partial<SessionUser> = {}): SessionUser {
  return {
    id: 'learner-1',
    displayName: 'Learner',
    role: 'learner',
    ageBand: 't14_17',
    capabilities: [],
    ...overrides,
  };
}

function accessService(linkedGuardianId: string | null = null): AccessService {
  const prisma = {
    enrollment: {
      findUnique: async () => enrollment,
    },
    guardianLearnerLink: {
      findFirst: async ({ where }: { where: { guardianId?: string; learnerId?: string } }) =>
        where.guardianId ? (where.guardianId === linkedGuardianId ? { id: 'link-1' } : null) : { id: 'link-1' },
    },
    consentGrant: { findMany: async () => [{ purpose: 'service' }, { purpose: 'storage' }] },
    youthAssent: { findFirst: async () => ({ id: 'assent-1' }) },
  } as unknown as PrismaService;
  return new AccessService(prisma);
}

test('el learner dueño conserva acceso y es el único que puede mutar su aprendizaje', async () => {
  const access = accessService();
  assert.equal(await access.assertEnrollmentAccess(actor(), enrollment.id), enrollment);
  await assert.doesNotReject(() => access.assertLearnerSelf(actor(), enrollment));

  await assert.rejects(
    () => access.assertLearnerSelf(actor({ id: 'guardian-1', role: 'guardian' }), enrollment),
    (error: unknown) => error instanceof Error && 'status' in error && error.status === 403,
  );
  await assert.rejects(
    () => access.assertLearnerSelf(actor({ role: 'staff', capabilities: ['operations'] }), enrollment),
    (error: unknown) => error instanceof Error && 'status' in error && error.status === 403,
  );
});

test('staff necesita propósito explícito y la capacidad correspondiente', async () => {
  const access = accessService();
  const reviewer = actor({ id: 'staff-1', role: 'staff', ageBand: null, capabilities: ['academic_reviewer'] });

  await assert.rejects(() => access.assertEnrollmentAccess(reviewer, enrollment.id));
  await assert.rejects(() => access.assertEnrollmentAccess(reviewer, enrollment.id, 'operations'));
  assert.equal(await access.assertEnrollmentAccess(reviewer, enrollment.id, 'academic_review'), enrollment);
});

test('un guardian solo accede mediante vínculo activo y staff no evita esa regla', async () => {
  const access = accessService('guardian-1');
  const guardian = actor({ id: 'guardian-1', role: 'guardian' });
  assert.equal(await access.assertEnrollmentAccess(guardian, enrollment.id), enrollment);
  await assert.doesNotReject(() => access.assertGuardianOfLearner(guardian, enrollment.learnerId));

  const staff = actor({ id: 'staff-1', role: 'staff', ageBand: null, capabilities: ['operations'] });
  await assert.rejects(() => access.assertGuardianOfLearner(staff, enrollment.learnerId));
});

test('un learner sin ageBand falla cerrado aunque sea dueño del enrollment', async () => {
  const access = accessService();
  await assert.rejects(
    () => access.assertLearnerSelf(actor({ ageBand: null }), enrollment),
    (error: unknown) => error instanceof Error && 'code' in error && error.code === 'AGE_NOT_ALLOWED',
  );
});
