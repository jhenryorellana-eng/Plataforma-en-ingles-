import assert from 'node:assert/strict';
import test from 'node:test';
import type { User } from '@prisma/client';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { zRegisterGuardianResponse, zResetPasswordRequest } from '@star/contracts';
import { LocalRateLimitService } from '../src/common/local-rate-limit.service';
import { SessionService } from '../src/common/session.service';
import { AuthController, requiresSecureCookie } from '../src/modules/auth/auth.controller';
import type { IdentityProvider } from '../src/modules/auth/identity-providers';
import { AuthService, REGISTRATION_CONFLICT_MESSAGE } from '../src/modules/auth/auth.service';
import type { PrismaService } from '../src/prisma/prisma.service';

function serviceWith(user: User | null): {
  service: AuthService;
  updates: Array<Record<string, unknown>>;
} {
  const updates: Array<Record<string, unknown>> = [];
  const prisma = {
    user: {
      findUnique: async ({ where }: { where: { authId?: string; email?: string } }) =>
        where.authId ? null : user,
      updateMany: async (args: Record<string, unknown>) => {
        updates.push(args);
        return { count: 1 };
      },
    },
  } as unknown as PrismaService;
  const identity = {
    name: 'test',
    signIn: async () => ({ authId: 'provider-id' }),
    signUp: async () => ({ authId: 'provider-id' }),
    signUpGuardian: async () => ({ authId: 'provider-id', pendingVerification: true }),
    resendSignup: async () => undefined,
    sendPasswordRecovery: async () => undefined,
    getUserId: async () => ({ authId: 'provider-id', email: 'user@example.com' }),
    updatePassword: async () => ({ authId: 'provider-id' }),
    updateUserPassword: async () => undefined,
    signOutAll: async () => undefined,
    deleteUser: async () => undefined,
  } satisfies IdentityProvider;
  const service = Object.create(AuthService.prototype) as AuthService;
  Object.assign(service, {
    prisma,
    identity,
    sessionService: { revokeAllForUser: async () => undefined },
    webOrigin: 'https://app.example',
    logger: { warn: () => undefined },
  });
  return { service, updates };
}

const baseUser = {
  id: '11111111-1111-4111-8111-111111111111',
  displayName: 'Test',
  email: 'user@example.com',
  authId: null,
  role: 'guardian',
  ageBand: null,
  credentialVersion: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
} as User;

function createAuthRaceHarness(): {
  prisma: PrismaService;
  sessions: Array<{ revokedAt: Date | null }>;
  credentialVersion: () => number;
} {
  let version = 0;
  const sessions: Array<{ revokedAt: Date | null }> = [];
  const currentUser = (): User => ({
    ...baseUser,
    authId: 'provider-id',
    credentialVersion: version,
  });
  const prisma = {
    user: {
      findUnique: async ({ where }: { where: { authId?: string; email?: string } }) =>
        where.authId === 'provider-id' || where.email === baseUser.email ? currentUser() : null,
    },
    $transaction: async (callback: (tx: unknown) => Promise<unknown>) =>
      callback({
        user: {
          update: async () => {
            version += 1;
            return currentUser();
          },
          updateMany: async ({ where }: { where: { credentialVersion: number } }) => {
            if (where.credentialVersion !== version) return { count: 0 };
            version += 1;
            return { count: 1 };
          },
        },
        idempotencyRecord: { create: async () => undefined },
        authSession: {
          create: async () => {
            sessions.push({ revokedAt: null });
          },
          updateMany: async ({ data }: { data: { revokedAt: Date } }) => {
            let count = 0;
            for (const session of sessions) {
              if (session.revokedAt === null) {
                session.revokedAt = data.revokedAt;
                count += 1;
              }
            }
            return { count };
          },
        },
      }),
  } as unknown as PrismaService;
  return { prisma, sessions, credentialVersion: () => version };
}

function deferred(): { promise: Promise<void>; resolve: () => void } {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

test('solo re-vincula por login válido un perfil no privilegiado', async () => {
  const { service, updates } = serviceWith(baseUser);
  await service.login({ email: ' USER@example.com ', password: 'password123' });
  assert.equal(updates.length, 1);
  assert.deepEqual(updates[0], {
    where: { id: baseUser.id, authId: null, credentialVersion: 0 },
    data: { authId: 'provider-id' },
  });
});

test('rechaza el re-vínculo automático de staff sin revelar su rol', async () => {
  const { service, updates } = serviceWith({ ...baseUser, role: 'staff' });
  await assert.rejects(
    () => service.login({ email: 'user@example.com', password: 'password123' }),
    (error: unknown) =>
      error instanceof Error &&
      error.message === 'Correo o contraseña incorrectos' &&
      !error.message.toLowerCase().includes('staff'),
  );
  assert.equal(updates.length, 0);
});

test('el conflicto de registro no revela el rol existente', async () => {
  const { service } = serviceWith({ ...baseUser, role: 'staff' });
  await assert.rejects(
    () =>
      service.registerGuardian({
        displayName: 'Guardian',
        email: 'user@example.com',
        password: 'password123',
        adultGuardianAttestation: true,
      }),
    (error: unknown) =>
      error instanceof Error &&
      error.message === REGISTRATION_CONFLICT_MESSAGE &&
      !error.message.toLowerCase().includes('staff') &&
      !error.message.toLowerCase().includes('guardian'),
  );
});

test('recuperación absorbe fallos del proveedor y conserva la respuesta pública', async () => {
  const { service } = serviceWith(null);
  const failingIdentity: IdentityProvider = {
    name: 'failing-test',
    signIn: async () => ({ authId: 'provider-id' }),
    signUp: async () => ({ authId: 'provider-id' }),
    signUpGuardian: async () => ({ authId: 'provider-id', pendingVerification: true }),
    resendSignup: async () => undefined,
    sendPasswordRecovery: async () => {
      throw new Error('network detail that must not propagate');
    },
    getUserId: async () => ({ authId: 'provider-id', email: 'user@example.com' }),
    updatePassword: async () => ({ authId: 'provider-id' }),
    updateUserPassword: async () => undefined,
    signOutAll: async () => undefined,
    deleteUser: async () => undefined,
  };
  Object.assign(service, { identity: failingIdentity, logger: { warn: () => undefined } });
  await assert.doesNotReject(() => service.forgotPassword('user@example.com'));
});

test('logout limpia la cookie aunque no haya sesión revocable', async () => {
  const sessionService = {
    revoke: async () => {
      throw new Error('database unavailable');
    },
  } as unknown as SessionService;
  const controller = new AuthController(
    {} as AuthService,
    sessionService,
    new LocalRateLimitService(),
  );
  Object.assign(controller, { logger: { warn: () => undefined } });
  const cleared: Array<{ name: string; path?: string }> = [];
  const reply = {
    clearCookie: (name: string, options: { path?: string }) => {
      cleared.push({ name, path: options.path });
    },
  } as unknown as FastifyReply;
  const request = { cookies: {} } as FastifyRequest;

  assert.deepEqual(await controller.logout(request, reply), { ok: true });
  assert.deepEqual(cleared, [{ name: 'star_session', path: '/' }]);
});

test('controller de login usa la apertura CAS y no la sesión genérica', async () => {
  let guardedVersion: number | undefined;
  const user = { ...baseUser, authId: 'provider-id', credentialVersion: 7 };
  const authService = {
    login: async () => ({ user, credentialVersion: 7 }),
    nextActionFor: async () => 'guardian_family' as const,
  } as unknown as AuthService;
  const sessionService = {
    create: async () => {
      throw new Error('login no debe usar create');
    },
    createAfterCredentialValidation: async (_user: User, expected: number) => {
      guardedVersion = expected;
      return 'guarded-token';
    },
    capabilitiesFor: async () => [],
  } as unknown as SessionService;
  const cookies: Array<{ name: string; value: string }> = [];
  const reply = {
    setCookie: (name: string, value: string) => cookies.push({ name, value }),
  } as unknown as FastifyReply;
  const controller = new AuthController(authService, sessionService, new LocalRateLimitService());

  await controller.login(
    { email: 'user@example.com', password: 'password123' },
    { ip: '203.0.113.10' } as FastifyRequest,
    reply,
  );

  assert.equal(guardedVersion, 7);
  assert.deepEqual(cookies, [{ name: 'star_session', value: 'guarded-token' }]);
});

test('change-initial-password abre la sesión nueva con CAS para que gane un reset concurrente', async () => {
  let guardedVersion: number | undefined;
  const updated = {
    ...baseUser,
    role: 'learner' as const,
    ageBand: 't14_17' as const,
    loginName: 'astro.nova',
    birthYear: 2010,
    mustChangePassword: false,
    credentialVersion: 11,
  } as User;
  const authService = {
    changeInitialPassword: async () => updated,
    nextActionFor: async () => 'youth_assent' as const,
  } as unknown as AuthService;
  const sessionService = {
    create: async () => {
      throw new Error('el cambio inicial no debe abrir una sesión sin CAS');
    },
    createAfterCredentialValidation: async (_user: User, expected: number) => {
      guardedVersion = expected;
      return 'replacement-token';
    },
    capabilitiesFor: async () => [],
  } as unknown as SessionService;
  const cookies: Array<{ name: string; value: string }> = [];
  const reply = {
    setCookie: (name: string, value: string) => cookies.push({ name, value }),
  } as unknown as FastifyReply;
  const controller = new AuthController(authService, sessionService, new LocalRateLimitService());

  const response = await controller.changeInitialPassword(
    {
      id: updated.id,
      displayName: updated.displayName,
      role: 'learner',
      ageBand: 't14_17',
      mustChangePassword: true,
      capabilities: [],
    },
    { password: 'new-password-123' },
    { ip: '203.0.113.11' } as FastifyRequest,
    reply,
  );

  assert.equal(guardedVersion, 11);
  assert.equal(response.nextAction, 'youth_assent');
  assert.deepEqual(cookies, [{ name: 'star_session', value: 'replacement-token' }]);
});

test('forgot-password usa el redirect de reset sin propagar el resultado del proveedor', async () => {
  const { service } = serviceWith(null);
  const redirects: string[] = [];
  const identity: IdentityProvider = {
    name: 'redirect-test',
    signIn: async () => ({ authId: 'provider-id' }),
    signUp: async () => ({ authId: 'provider-id' }),
    signUpGuardian: async () => ({ authId: 'provider-id', pendingVerification: true }),
    resendSignup: async () => undefined,
    sendPasswordRecovery: async (_email, redirectTo) => {
      redirects.push(redirectTo);
    },
    getUserId: async () => ({ authId: 'provider-id', email: 'user@example.com' }),
    updatePassword: async () => ({ authId: 'provider-id' }),
    updateUserPassword: async () => undefined,
    signOutAll: async () => undefined,
    deleteUser: async () => undefined,
  };
  Object.assign(service, { identity });

  await service.forgotPassword('USER@example.com');
  assert.deepEqual(redirects, ['https://app.example/es-PE/reset-password']);
});

test('reset actualiza la identidad y revoca todas las sesiones STAR del perfil', async () => {
  const events: string[] = [];
  const { service } = serviceWith(null);
  Object.assign(service, {
    prisma: {
      user: {
        findUnique: async () => {
          events.push('local-user');
          return baseUser;
        },
      },
      $transaction: async (callback: (tx: unknown) => Promise<unknown>) =>
        callback({
          user: {
            update: async () => {
              events.push('advance-credential-boundary');
            },
          },
          idempotencyRecord: {
            create: async () => {
              events.push('consume-recovery');
            },
          },
          authSession: {
            updateMany: async ({ where }: { where: { userId: string } }) => {
              assert.equal(where.userId, baseUser.id);
              events.push('revoke-star');
              return { count: 1 };
            },
          },
        }),
    },
    identity: {
      getUserId: async () => {
        events.push('validate-token');
        return { authId: 'provider-id', email: 'user@example.com' };
      },
      updatePassword: async () => {
        events.push('update-password');
        return { authId: 'provider-id' };
      },
      signOutAll: async () => {
        events.push('supabase-global-logout');
      },
    },
  });
  const accessToken = 'r'.repeat(64);

  assert.deepEqual(
    await service.resetPassword({ accessToken, type: 'recovery', password: 'new-password-123' }),
    { ok: true },
  );
  assert.deepEqual(events, [
    'validate-token',
    'local-user',
    'consume-recovery',
    'advance-credential-boundary',
    'revoke-star',
    'update-password',
    'advance-credential-boundary',
    'revoke-star',
    'supabase-global-logout',
  ]);
});

test('si falla la transacción de consumo y revocación, no cambia la contraseña en Supabase', async () => {
  const events: string[] = [];
  const { service } = serviceWith(null);
  Object.assign(service, {
    prisma: {
      user: { findUnique: async () => baseUser },
      $transaction: async (callback: (tx: unknown) => Promise<unknown>) =>
        callback({
          user: {
            update: async () => {
              events.push('advance-credential-boundary');
            },
          },
          idempotencyRecord: {
            create: async () => {
              events.push('consume-recovery');
            },
          },
          authSession: {
            updateMany: async () => {
              events.push('revoke-star');
              throw new Error('database unavailable');
            },
          },
        }),
    },
    identity: {
      getUserId: async () => {
        events.push('validate-token');
        return { authId: 'provider-id', email: 'user@example.com' };
      },
      updatePassword: async () => {
        events.push('update-password');
        return { authId: 'provider-id' };
      },
      signOutAll: async () => {
        events.push('supabase-global-logout');
      },
    },
    logger: { error: () => undefined },
  });

  await assert.rejects(() =>
    service.resetPassword({
      accessToken: 'r'.repeat(64),
      type: 'recovery',
      password: 'new-password-123',
    }),
  );
  assert.deepEqual(events, [
    'validate-token',
    'consume-recovery',
    'advance-credential-boundary',
    'revoke-star',
  ]);
});

test('el recovery bearer se consume una vez y un replay no vuelve a cambiar la contraseña', async () => {
  const consumed = new Set<string>();
  let passwordUpdates = 0;
  const { service } = serviceWith(null);
  Object.assign(service, {
    prisma: {
      user: { findUnique: async () => baseUser },
      $transaction: async (callback: (tx: unknown) => Promise<unknown>) =>
        callback({
          user: { update: async () => baseUser },
          idempotencyRecord: {
            create: async ({
              data,
            }: {
              data: { key: string; route: string; requestHash: string };
            }) => {
              assert.equal(data.route, '/v1/auth/reset-password');
              assert.equal(data.key, data.requestHash);
              assert.equal(data.key.length, 64);
              assert.notEqual(data.key, request.accessToken);
              if (consumed.has(data.key))
                throw Object.assign(new Error('unique'), { code: 'P2002' });
              consumed.add(data.key);
            },
          },
          authSession: { updateMany: async () => ({ count: 1 }) },
        }),
    },
    identity: {
      getUserId: async () => ({ authId: 'provider-id', email: 'user@example.com' }),
      updatePassword: async () => {
        passwordUpdates += 1;
        return { authId: 'provider-id' };
      },
      signOutAll: async () => undefined,
    },
  });
  const request = {
    accessToken: 'one-time-recovery-token'.repeat(3),
    type: 'recovery' as const,
    password: 'new-password-123',
  };

  assert.deepEqual(await service.resetPassword(request), { ok: true });
  await assert.rejects(
    () => service.resetPassword(request),
    (error: unknown) =>
      error instanceof Error &&
      'code' in error &&
      error.code === 'INVALID_CREDENTIALS' &&
      'status' in error &&
      error.status === 401,
  );
  assert.equal(passwordUpdates, 1);
  assert.equal(consumed.size, 1);
});

test('dos resets concurrentes con el mismo bearer tienen un solo ganador', async () => {
  const consumed = new Set<string>();
  let passwordUpdates = 0;
  const { service } = serviceWith(null);
  Object.assign(service, {
    prisma: {
      user: { findUnique: async () => baseUser },
      $transaction: async (callback: (tx: unknown) => Promise<unknown>) =>
        callback({
          user: { update: async () => baseUser },
          idempotencyRecord: {
            create: async ({ data }: { data: { key: string } }) => {
              if (consumed.has(data.key))
                throw Object.assign(new Error('unique'), { code: 'P2002' });
              consumed.add(data.key);
              await Promise.resolve();
            },
          },
          authSession: { updateMany: async () => ({ count: 2 }) },
        }),
    },
    identity: {
      getUserId: async () => ({ authId: 'provider-id', email: 'user@example.com' }),
      updatePassword: async () => {
        passwordUpdates += 1;
        return { authId: 'provider-id' };
      },
      signOutAll: async () => undefined,
    },
  });
  const request = {
    accessToken: 'concurrent-recovery-token'.repeat(3),
    type: 'recovery' as const,
    password: 'new-password-123',
  };

  const results = await Promise.allSettled([
    service.resetPassword(request),
    service.resetPassword(request),
  ]);
  assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
  const rejected = results.find((result) => result.status === 'rejected');
  assert.equal(rejected?.status, 'rejected');
  if (rejected?.status === 'rejected') {
    assert.equal(rejected.reason.code, 'INVALID_CREDENTIALS');
    assert.equal(rejected.reason.status, 401);
  }
  assert.equal(passwordUpdates, 1);
});

test('un fallo del proveedor posterior al consumo obliga a pedir otro enlace', async () => {
  const consumed = new Set<string>();
  let passwordAttempts = 0;
  const { service } = serviceWith(null);
  Object.assign(service, {
    prisma: {
      user: { findUnique: async () => baseUser },
      $transaction: async (callback: (tx: unknown) => Promise<unknown>) =>
        callback({
          user: { update: async () => baseUser },
          idempotencyRecord: {
            create: async ({ data }: { data: { key: string } }) => {
              if (consumed.has(data.key))
                throw Object.assign(new Error('unique'), { code: 'P2002' });
              consumed.add(data.key);
            },
          },
          authSession: { updateMany: async () => ({ count: 1 }) },
        }),
    },
    identity: {
      getUserId: async () => ({ authId: 'provider-id', email: 'user@example.com' }),
      updatePassword: async () => {
        passwordAttempts += 1;
        throw new Error('provider unavailable after consume');
      },
      signOutAll: async () => undefined,
    },
  });
  const request = {
    accessToken: 'failed-provider-recovery-token'.repeat(3),
    type: 'recovery' as const,
    password: 'new-password-123',
  };

  await assert.rejects(() => service.resetPassword(request));
  await assert.rejects(
    () => service.resetPassword(request),
    (error: unknown) => error instanceof Error && 'status' in error && error.status === 401,
  );
  assert.equal(passwordAttempts, 1);
});

test('login validado antes del reset no puede crear sesión después', async () => {
  const harness = createAuthRaceHarness();
  const validationFinished = deferred();
  const returnLogin = deferred();
  const identity = {
    name: 'race-test',
    signIn: async () => {
      validationFinished.resolve();
      await returnLogin.promise;
      return { authId: 'provider-id' };
    },
    signUp: async () => ({ authId: 'provider-id' }),
    signUpGuardian: async () => ({ authId: 'provider-id', pendingVerification: true }),
    resendSignup: async () => undefined,
    sendPasswordRecovery: async () => undefined,
    getUserId: async () => ({ authId: 'provider-id', email: 'user@example.com' }),
    updatePassword: async () => ({ authId: 'provider-id' }),
    updateUserPassword: async () => undefined,
    signOutAll: async () => undefined,
    deleteUser: async () => undefined,
  } satisfies IdentityProvider;
  const auth = Object.create(AuthService.prototype) as AuthService;
  Object.assign(auth, {
    prisma: harness.prisma,
    identity,
    logger: { warn: () => undefined, error: () => undefined },
  });
  const sessions = new SessionService(harness.prisma);

  const loginPromise = auth.login({ email: 'user@example.com', password: 'old-password' });
  await validationFinished.promise;
  await auth.resetPassword({
    accessToken: 'r'.repeat(64),
    type: 'recovery',
    password: 'new-password-123',
  });
  returnLogin.resolve();
  const login = await loginPromise;

  await assert.rejects(
    () => sessions.createAfterCredentialValidation(login.user, login.credentialVersion),
    (error: unknown) =>
      error instanceof Error && 'code' in error && error.code === 'INVALID_CREDENTIALS',
  );
  assert.equal(harness.credentialVersion(), 2);
  assert.equal(harness.sessions.length, 0);
});

test('login validado durante el reset es revocado por la barrera final', async () => {
  const harness = createAuthRaceHarness();
  const passwordUpdateStarted = deferred();
  const finishPasswordUpdate = deferred();
  const identity = {
    name: 'race-test',
    signIn: async () => ({ authId: 'provider-id' }),
    signUp: async () => ({ authId: 'provider-id' }),
    signUpGuardian: async () => ({ authId: 'provider-id', pendingVerification: true }),
    resendSignup: async () => undefined,
    sendPasswordRecovery: async () => undefined,
    getUserId: async () => ({ authId: 'provider-id', email: 'user@example.com' }),
    updatePassword: async () => {
      passwordUpdateStarted.resolve();
      await finishPasswordUpdate.promise;
      return { authId: 'provider-id' };
    },
    updateUserPassword: async () => undefined,
    signOutAll: async () => undefined,
    deleteUser: async () => undefined,
  } satisfies IdentityProvider;
  const auth = Object.create(AuthService.prototype) as AuthService;
  Object.assign(auth, {
    prisma: harness.prisma,
    identity,
    logger: { warn: () => undefined, error: () => undefined },
  });
  const sessions = new SessionService(harness.prisma);

  const resetPromise = auth.resetPassword({
    accessToken: 's'.repeat(64),
    type: 'recovery',
    password: 'new-password-123',
  });
  await passwordUpdateStarted.promise;
  const login = await auth.login({ email: 'user@example.com', password: 'old-password' });
  await sessions.createAfterCredentialValidation(login.user, login.credentialVersion);
  assert.equal(harness.sessions.filter((session) => session.revokedAt === null).length, 1);

  finishPasswordUpdate.resolve();
  await resetPromise;
  assert.equal(harness.credentialVersion(), 3);
  assert.equal(harness.sessions.filter((session) => session.revokedAt === null).length, 0);
});

test('registro de apoderado queda pendiente y el controller no abre sesión STAR', async () => {
  let sessionCreated = false;
  const authService = {
    registerGuardian: async () => ({ status: 'pendingVerification' as const }),
  } as unknown as AuthService;
  const sessionService = {
    create: async () => {
      sessionCreated = true;
      return 'unexpected';
    },
  } as unknown as SessionService;
  const controller = new AuthController(authService, sessionService, new LocalRateLimitService());
  const result = await controller.registerGuardian(
    {
      displayName: 'Guardian',
      email: 'guardian@example.com',
      password: 'password123',
      adultGuardianAttestation: true,
    },
    { ip: '203.0.113.20' } as FastifyRequest,
  );

  assert.deepEqual(result, { status: 'pendingVerification' });
  assert.equal(sessionCreated, false);
  assert.equal(zRegisterGuardianResponse.safeParse(result).success, true);
});

test('servicio de apoderado usa redirect verificado y crea el perfil sin sesión', async () => {
  const redirects: string[] = [];
  const created: Array<Record<string, unknown>> = [];
  const service = Object.create(AuthService.prototype) as AuthService;
  Object.assign(service, {
    webOrigin: 'https://app.example',
    prisma: {
      user: {
        findUnique: async () => null,
        create: async (args: Record<string, unknown>) => {
          created.push(args);
          return baseUser;
        },
      },
    },
    identity: {
      signUpGuardian: async (_email: string, _password: string, redirectTo: string) => {
        redirects.push(redirectTo);
        return { authId: 'guardian-auth-id', pendingVerification: true };
      },
    },
    logger: { warn: () => undefined, error: () => undefined },
  });

  assert.deepEqual(
    await service.registerGuardian({
      displayName: 'Guardian',
      email: 'GUARDIAN@example.com',
      password: 'password123',
      adultGuardianAttestation: true,
    }),
    { status: 'pendingVerification' },
  );
  assert.deepEqual(redirects, ['https://app.example/es-PE/login?verified=1']);
  assert.deepEqual(created, [
    {
      data: {
        displayName: 'Guardian',
        email: 'guardian@example.com',
        authId: 'guardian-auth-id',
        role: 'guardian',
      },
    },
  ]);
});

test('contrato de reset exige token, tipo recovery y contraseña fuerte', () => {
  assert.equal(
    zResetPasswordRequest.safeParse({
      accessToken: 'x'.repeat(64),
      type: 'recovery',
      password: 'password123',
    }).success,
    true,
  );
  assert.equal(
    zResetPasswordRequest.safeParse({
      accessToken: 'x'.repeat(64),
      type: 'signup',
      password: 'password123',
    }).success,
    false,
  );
});

test('cookie Secure depende de HTTPS y no del acceso demo', () => {
  assert.equal(requiresSecureCookie('http://localhost:3000', false), false);
  assert.equal(requiresSecureCookie('https://app.example', false), true);
  assert.equal(requiresSecureCookie('not-a-url', true), true);
});
