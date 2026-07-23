import assert from 'node:assert/strict';
import test from 'node:test';
import type { User } from '@prisma/client';
import {
  CONSENT_NOTICE_VERSION,
  zCreateManagedLearnerRequest,
  zCreateManagedLearnerResponse,
} from '@star/contracts';
import { ALLOW_PASSWORD_CHANGE_PENDING_KEY, IS_PUBLIC_KEY } from '../src/common/decorators';
import { SessionGuard } from '../src/common/session.guard';
import { AuthService } from '../src/modules/auth/auth.service';

const guardianId = '11111111-1111-4111-8111-111111111111';
const learnerId = '22222222-2222-4222-8222-222222222222';

function learner(overrides: Partial<User> = {}): User {
  return {
    id: learnerId,
    email: null,
    loginName: 'astro.nova',
    authId: '33333333-3333-4333-8333-333333333333',
    displayName: 'Nova',
    role: 'learner',
    ageBand: 't14_17',
    birthYear: 2010,
    mustChangePassword: true,
    credentialVersion: 0,
    createdAt: new Date(),
    ...overrides,
  };
}

test('el apoderado crea una cuenta juvenil sin email y solo con consentimientos explícitos', async () => {
  let providerEmail = '';
  let createdData: Record<string, unknown> | undefined;
  let linkData: Record<string, unknown> | undefined;
  let consentData: Array<Record<string, unknown>> = [];
  const auditEntries: Array<Record<string, unknown>> = [];
  const outboxEntries: Array<Record<string, unknown>> = [];
  const createdLearner = learner();
  const tx = {
    user: {
      findUnique: async ({ where }: { where: { id?: string } }) =>
        where.id === guardianId ? { role: 'guardian' } : null,
      create: async ({ data }: { data: Record<string, unknown> }) => {
        createdData = data;
        return createdLearner;
      },
    },
    guardianLearnerLink: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        linkData = data;
      },
    },
    consentGrant: {
      createMany: async ({ data }: { data: Array<Record<string, unknown>> }) => {
        consentData = data;
        return { count: data.length };
      },
    },
  };
  const service = Object.create(AuthService.prototype) as AuthService;
  Object.assign(service, {
    prisma: {
      user: { findUnique: async () => null },
      $transaction: async (callback: (input: typeof tx) => Promise<unknown>) => callback(tx),
    },
    identity: {
      signUp: async (email: string) => {
        providerEmail = email;
        return { authId: createdLearner.authId };
      },
      deleteUser: async () => undefined,
    },
    auditService: {
      recordInTx: async (_tx: unknown, entry: Record<string, unknown>) => {
        auditEntries.push(entry);
      },
    },
    outboxService: {
      emitInTx: async (_tx: unknown, entry: Record<string, unknown>) => {
        outboxEntries.push(entry);
      },
    },
    logger: { error: () => undefined },
  });
  const request = zCreateManagedLearnerRequest.parse({
    displayName: 'Nova',
    loginName: 'astro.nova',
    password: 'temporary-password-123',
    birthYear: 2010,
    legalGuardianAttestation: true,
    consentNoticeVersion: CONSENT_NOTICE_VERSION,
    consents: {
      service: true,
      storage: true,
      ai_voice: false,
      international_transfer: false,
    },
  });

  const response = await service.createManagedLearner(guardianId, request);

  assert.equal(providerEmail, 'astro.nova@learners.invalid');
  assert.equal(createdData?.email, null);
  assert.equal(createdData?.loginName, 'astro.nova');
  assert.equal(createdData?.mustChangePassword, true);
  assert.deepEqual(linkData, { guardianId, learnerId, status: 'active' });
  assert.deepEqual(
    consentData.map((grant) => grant.purpose),
    ['service', 'storage'],
  );
  assert.equal(zCreateManagedLearnerResponse.safeParse(response).success, true);
  assert.deepEqual(response.grantedConsents, ['service', 'storage']);
  assert.equal(response.assentRequired, true);
  assert.equal(JSON.stringify([auditEntries, outboxEntries]).includes('astro.nova'), false);
  assert.equal(JSON.stringify([auditEntries, outboxEntries]).includes('Nova'), false);
});

test('el alta juvenil compensa Supabase si falla la transacción local', async () => {
  const deleted: string[] = [];
  const service = Object.create(AuthService.prototype) as AuthService;
  Object.assign(service, {
    prisma: {
      user: { findUnique: async () => null },
      $transaction: async () => {
        throw new Error('database unavailable');
      },
    },
    identity: {
      signUp: async () => ({ authId: '33333333-3333-4333-8333-333333333333' }),
      deleteUser: async (authId: string) => {
        deleted.push(authId);
      },
    },
    logger: { error: () => undefined },
  });
  const request = zCreateManagedLearnerRequest.parse({
    displayName: 'Nova',
    loginName: 'astro.nova',
    password: 'temporary-password-123',
    birthYear: 2010,
    legalGuardianAttestation: true,
    consentNoticeVersion: CONSENT_NOTICE_VERSION,
    consents: {
      service: true,
      storage: true,
      ai_voice: true,
      international_transfer: true,
    },
  });

  await assert.rejects(() => service.createManagedLearner(guardianId, request));
  assert.deepEqual(deleted, ['33333333-3333-4333-8333-333333333333']);
});

test('el loginName se traduce al email técnico solo dentro del adaptador de identidad', async () => {
  const existing = learner();
  let providerEmail = '';
  const service = Object.create(AuthService.prototype) as AuthService;
  Object.assign(service, {
    prisma: {
      user: {
        findUnique: async ({ where }: { where: { loginName?: string; authId?: string } }) => {
          if (where.loginName === 'astro.nova' || where.authId === existing.authId) return existing;
          return null;
        },
        updateMany: async () => ({ count: 1 }),
      },
    },
    identity: {
      signIn: async (email: string) => {
        providerEmail = email;
        return { authId: existing.authId };
      },
    },
  });

  const result = await service.login({ identifier: ' ASTRO.NOVA ', password: 'password123' });

  assert.equal(providerEmail, 'astro.nova@learners.invalid');
  assert.equal(result.user.id, learnerId);
  assert.equal(result.credentialVersion, 0);
});

test('el registro público de un menor se cierra antes de crear identidad', async () => {
  let providerCalled = false;
  const service = Object.create(AuthService.prototype) as AuthService;
  Object.assign(service, {
    identity: {
      signUp: async () => {
        providerCalled = true;
        return { authId: 'unused' };
      },
    },
  });

  await assert.rejects(
    () =>
      service.registerLearner({
        displayName: 'Nova',
        email: 'child@example.com',
        password: 'password123',
        birthYear: 2010,
      }),
    (error: unknown) =>
      error instanceof Error && 'code' in error && error.code === 'GUARDIAN_LINK_REQUIRED',
  );
  assert.equal(providerCalled, false);
});

test('un signup ofuscado de apoderado nunca persiste el authId falso', async () => {
  let createCalls = 0;
  let deleteCalls = 0;
  const service = Object.create(AuthService.prototype) as AuthService;
  Object.assign(service, {
    webOrigin: 'https://app.example',
    prisma: {
      user: {
        findUnique: async () => null,
        create: async () => {
          createCalls += 1;
          throw new Error('no debe crear perfil local');
        },
      },
    },
    identity: {
      signUpGuardian: async () => ({ authId: null, pendingVerification: true }),
      signIn: async () => {
        throw Object.assign(new Error('invalid'), { code: 'INVALID_CREDENTIALS', status: 401 });
      },
      deleteUser: async () => {
        deleteCalls += 1;
      },
    },
    logger: { warn: () => undefined },
  });

  assert.deepEqual(
    await service.registerGuardian({
      displayName: 'Apoderado',
      email: 'guardian@example.com',
      password: 'password123',
      adultGuardianAttestation: true,
    }),
    { status: 'pendingVerification' },
  );
  assert.equal(createCalls, 0);
  assert.equal(deleteCalls, 0);
});

test('un signup ofuscado solo crea perfil si la contraseña recupera el authId real', async () => {
  let createdData: Record<string, unknown> | undefined;
  const service = Object.create(AuthService.prototype) as AuthService;
  Object.assign(service, {
    webOrigin: 'https://app.example',
    prisma: {
      user: {
        findUnique: async () => null,
        create: async ({ data }: { data: Record<string, unknown> }) => {
          createdData = data;
          return { id: guardianId };
        },
      },
    },
    identity: {
      signUpGuardian: async () => ({ authId: null, pendingVerification: true }),
      signIn: async () => ({ authId: 'real-guardian-auth-id' }),
    },
    logger: { warn: () => undefined },
  });

  assert.deepEqual(
    await service.registerGuardian({
      displayName: 'Apoderado',
      email: 'guardian@example.com',
      password: 'password123',
      adultGuardianAttestation: true,
    }),
    { status: 'pendingVerification' },
  );
  assert.equal(createdData?.authId, 'real-guardian-auth-id');
});

test('una carrera UNIQUE reconciliada nunca borra la identidad real de Supabase', async () => {
  let emailLookups = 0;
  let deleteCalls = 0;
  const realAuthId = '33333333-3333-4333-8333-333333333333';
  const service = Object.create(AuthService.prototype) as AuthService;
  Object.assign(service, {
    webOrigin: 'https://app.example',
    prisma: {
      user: {
        findUnique: async ({ where }: { where: { email?: string; authId?: string } }) => {
          if (where.email) {
            emailLookups += 1;
            if (emailLookups === 1) return null;
            return { id: guardianId, role: 'guardian', email: where.email, authId: realAuthId };
          }
          return null;
        },
        create: async () => {
          throw Object.assign(new Error('unique race'), { code: 'P2002' });
        },
      },
    },
    identity: {
      signUpGuardian: async () => ({ authId: realAuthId, pendingVerification: true }),
      deleteUser: async () => {
        deleteCalls += 1;
      },
    },
  });

  assert.deepEqual(
    await service.registerGuardian({
      displayName: 'Apoderado',
      email: 'guardian@example.com',
      password: 'password123',
      adultGuardianAttestation: true,
    }),
    { status: 'pendingVerification' },
  );
  assert.equal(deleteCalls, 0);
});

test('cambiar la clave temporal crea dos barreras, revoca sesiones y habilita la cuenta', async () => {
  let current = learner();
  let revocations = 0;
  let providerUpdate: { authId: string; password: string } | undefined;
  const tx = {
    $executeRaw: async () => 1,
    user: {
      findUnique: async () => current,
      updateMany: async ({
        where,
        data,
      }: {
        where: { credentialVersion?: number; mustChangePassword?: boolean };
        data: { mustChangePassword?: boolean; credentialVersion: { increment: number } };
      }) => {
        if (
          where.credentialVersion !== undefined &&
          where.credentialVersion !== current.credentialVersion
        )
          return { count: 0 };
        if (
          where.mustChangePassword !== undefined &&
          where.mustChangePassword !== current.mustChangePassword
        )
          return { count: 0 };
        current = {
          ...current,
          mustChangePassword: data.mustChangePassword ?? current.mustChangePassword,
          credentialVersion: current.credentialVersion + data.credentialVersion.increment,
        };
        return { count: 1 };
      },
    },
    authSession: {
      updateMany: async () => {
        revocations += 1;
        return { count: 1 };
      },
    },
  };
  const service = Object.create(AuthService.prototype) as AuthService;
  Object.assign(service, {
    prisma: {
      $transaction: async (callback: (input: typeof tx) => Promise<unknown>) => callback(tx),
    },
    identity: {
      updateUserPassword: async (authId: string, password: string) => {
        providerUpdate = { authId, password };
      },
    },
    auditService: { recordInTx: async () => undefined },
    outboxService: { emitInTx: async () => undefined },
  });

  const updated = await service.changeInitialPassword(learnerId, {
    password: 'my-new-password-123',
  });

  assert.deepEqual(providerUpdate, {
    authId: '33333333-3333-4333-8333-333333333333',
    password: 'my-new-password-123',
  });
  assert.equal(updated.mustChangePassword, false);
  assert.equal(updated.credentialVersion, 2);
  assert.equal(revocations, 2);
});

test('el apoderado puede reiniciar solo una cuenta vinculada y todas sus sesiones se cierran', async () => {
  let current = learner({ mustChangePassword: false, credentialVersion: 4 });
  let providerUpdate: { authId: string; password: string } | undefined;
  let revocations = 0;
  const tx = {
    $executeRaw: async () => 1,
    guardianLearnerLink: {
      findFirst: async ({ where }: { where: { guardianId: string; learnerId: string } }) =>
        where.guardianId === guardianId && where.learnerId === learnerId ? { id: 'link-id' } : null,
    },
    user: {
      findUnique: async () => current,
      updateMany: async ({ where }: { where: { credentialVersion: number } }) => {
        if (where.credentialVersion !== current.credentialVersion) return { count: 0 };
        current = { ...current, mustChangePassword: true, credentialVersion: 5 };
        return { count: 1 };
      },
      update: async () => {
        current = { ...current, mustChangePassword: true, credentialVersion: 6 };
        return current;
      },
    },
    authSession: {
      updateMany: async () => {
        revocations += 1;
        return { count: 2 };
      },
    },
  };
  const service = Object.create(AuthService.prototype) as AuthService;
  Object.assign(service, {
    prisma: {
      $transaction: async (callback: (input: typeof tx) => Promise<unknown>) => callback(tx),
    },
    identity: {
      updateUserPassword: async (authId: string, password: string) => {
        providerUpdate = { authId, password };
      },
    },
    auditService: { recordInTx: async () => undefined },
    outboxService: { emitInTx: async () => undefined },
  });

  const response = await service.resetManagedLearnerPassword(guardianId, learnerId, {
    password: 'another-temporary-password',
  });

  assert.deepEqual(providerUpdate, {
    authId: '33333333-3333-4333-8333-333333333333',
    password: 'another-temporary-password',
  });
  assert.deepEqual(response, {
    ok: true,
    learnerId,
    loginName: 'astro.nova',
    mustChangePassword: true,
  });
  assert.equal(revocations, 2);
  assert.equal(current.credentialVersion, 6);
});

test('el guard global bloquea toda función hasta cambiar la clave temporal', async () => {
  let allowPasswordChange = false;
  const reflector = {
    getAllAndOverride: (key: string) => {
      if (key === IS_PUBLIC_KEY) return false;
      if (key === ALLOW_PASSWORD_CHANGE_PENDING_KEY) return allowPasswordChange;
      return undefined;
    },
  };
  const sessionService = {
    resolve: async () => ({
      id: learnerId,
      displayName: 'Nova',
      role: 'learner' as const,
      ageBand: 't14_17' as const,
      mustChangePassword: true,
      capabilities: [],
    }),
  };
  const request = { cookies: { star_session: 'token' } };
  const context = {
    getHandler: () => test,
    getClass: () => SessionGuard,
    switchToHttp: () => ({ getRequest: () => request }),
  };
  const guard = new SessionGuard(reflector as never, sessionService as never);

  await assert.rejects(
    () => guard.canActivate(context as never),
    (error: unknown) =>
      error instanceof Error && 'code' in error && error.code === 'PASSWORD_CHANGE_REQUIRED',
  );
  allowPasswordChange = true;
  assert.equal(await guard.canActivate(context as never), true);
});
