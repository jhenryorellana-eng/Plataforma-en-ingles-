import assert from 'node:assert/strict';
import test from 'node:test';
import { SupabaseIdentityProvider } from '../src/modules/auth/identity-providers';

function provider(timeoutMs = 100): SupabaseIdentityProvider {
  return new SupabaseIdentityProvider(
    'https://identity.example',
    'publishable',
    'secret',
    timeoutMs,
  );
}

function unsignedToken(
  sub: string,
  method: string | string[],
  overrides: Record<string, unknown> = {},
): string {
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const methods = Array.isArray(method) ? method : [method];
  const now = Math.floor(Date.now() / 1000);
  return `${encode({ alg: 'none', typ: 'JWT' })}.${encode({
    sub,
    email: 'user@example.com',
    iss: 'https://identity.example/auth/v1',
    aud: 'authenticated',
    role: 'authenticated',
    session_id: 'recovery-session-id',
    iat: now,
    exp: now + 3_600,
    amr: methods.map((entry, index) => ({ method: entry, timestamp: index + 1 })),
    ...overrides,
  })}.signature`;
}

test('mapea 429 de Supabase de forma estable y conserva Retry-After', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ error_code: 'over_request_rate_limit' }), {
      status: 429,
      headers: { 'content-type': 'application/json', 'retry-after': '7' },
    });
  try {
    await assert.rejects(
      () => provider().signIn('user@example.com', 'password123'),
      (error: unknown) =>
        error instanceof Error &&
        'code' in error &&
        error.code === 'RATE_LIMITED' &&
        'status' in error &&
        error.status === 429 &&
        'details' in error &&
        (error.details as { retryAfterSeconds?: number }).retryAfterSeconds === 7,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('mapea respuestas 5xx y fallos de red a indisponibilidad temporal', async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => new Response('{}', { status: 503 });
    await assert.rejects(
      () => provider().signUp('user@example.com', 'password123'),
      (error: unknown) => error instanceof Error && 'status' in error && error.status === 503,
    );

    globalThis.fetch = async () => {
      throw new TypeError('socket closed');
    };
    await assert.rejects(
      () => provider().signIn('user@example.com', 'password123'),
      (error: unknown) => error instanceof Error && 'status' in error && error.status === 503,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('aborta solicitudes del proveedor que exceden el timeout', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = ((_input: string | URL | Request, init?: RequestInit) =>
    new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
    })) as typeof fetch;
  try {
    await assert.rejects(
      () => provider(5).signIn('user@example.com', 'password123'),
      (error: unknown) => error instanceof Error && 'status' in error && error.status === 503,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('alta de apoderado usa signup público, redirect_to y ninguna metadata de autorización', async () => {
  const originalFetch = globalThis.fetch;
  let capturedUrl = '';
  let capturedInit: RequestInit | undefined;
  globalThis.fetch = async (input, init) => {
    capturedUrl = String(input);
    capturedInit = init;
    return new Response(JSON.stringify({ user: { id: 'guardian-auth-id' }, access_token: null }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };
  try {
    assert.deepEqual(
      await provider().signUpGuardian(
        'guardian@example.com',
        'password123',
        'https://app.example/es-PE/login?verified=1',
      ),
      { authId: 'guardian-auth-id', pendingVerification: true },
    );
    const url = new URL(capturedUrl);
    assert.equal(url.pathname, '/auth/v1/signup');
    assert.equal(url.searchParams.get('redirect_to'), 'https://app.example/es-PE/login?verified=1');
    const headers = new Headers(capturedInit?.headers);
    assert.equal(headers.get('apikey'), 'publishable');
    assert.equal(headers.has('authorization'), false);
    assert.deepEqual(JSON.parse(String(capturedInit?.body)), {
      email: 'guardian@example.com',
      password: 'password123',
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('password grant cierra la sesión Supabase local antes de devolver la identidad', async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  globalThis.fetch = async (input, init) => {
    calls.push({ url: String(input), init });
    if (String(input).includes('/token?grant_type=password')) {
      return new Response(
        JSON.stringify({
          user: { id: 'user-auth-id' },
          access_token: 'fresh-access-token',
          refresh_token: 'discarded-refresh-token',
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    }
    return new Response(null, { status: 204 });
  };
  try {
    assert.deepEqual(await provider().signIn('user@example.com', 'password123'), {
      authId: 'user-auth-id',
    });
    assert.equal(calls.length, 2);
    const logoutUrl = new URL(calls[1].url);
    assert.equal(logoutUrl.pathname, '/auth/v1/logout');
    assert.equal(logoutUrl.searchParams.get('scope'), 'local');
    assert.equal(calls[1].init?.method, 'POST');
    const logoutHeaders = new Headers(calls[1].init?.headers);
    assert.equal(logoutHeaders.get('apikey'), 'publishable');
    assert.equal(logoutHeaders.get('authorization'), 'Bearer fresh-access-token');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('login falla cerrado si Supabase no puede cerrar la sesión local creada por el grant', async () => {
  const originalFetch = globalThis.fetch;
  let call = 0;
  globalThis.fetch = async () => {
    call += 1;
    if (call === 1) {
      return new Response(
        JSON.stringify({ user: { id: 'user-auth-id' }, access_token: 'fresh-access-token' }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    }
    return new Response('{}', { status: 503 });
  };
  try {
    await assert.rejects(
      () => provider().signIn('user@example.com', 'password123'),
      (error: unknown) =>
        error instanceof Error &&
        'code' in error &&
        error.code === 'IDENTITY_PROVIDER_ERROR' &&
        'status' in error &&
        error.status === 503,
    );
    assert.equal(call, 2);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('recuperación envía redirect_to y actualización usa PUT /user con el bearer recibido', async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  globalThis.fetch = async (input, init) => {
    calls.push({ url: String(input), init });
    if (String(input).includes('/recover')) return new Response('{}', { status: 200 });
    if (String(input).includes('/logout')) return new Response(null, { status: 204 });
    return new Response(JSON.stringify({ id: 'user-auth-id', email: 'user@example.com' }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };
  try {
    const identity = provider();
    const recoveryToken = unsignedToken('user-auth-id', 'otp');
    await identity.sendPasswordRecovery(
      'user@example.com',
      'https://app.example/es-PE/reset-password',
    );
    assert.deepEqual(await identity.getUserId(recoveryToken), {
      authId: 'user-auth-id',
      email: 'user@example.com',
    });
    assert.deepEqual(await identity.updatePassword(recoveryToken, 'new-password-123'), {
      authId: 'user-auth-id',
    });
    await identity.signOutAll(recoveryToken);

    const recoveryUrl = new URL(calls[0].url);
    assert.equal(recoveryUrl.pathname, '/auth/v1/recover');
    assert.equal(
      recoveryUrl.searchParams.get('redirect_to'),
      'https://app.example/es-PE/reset-password',
    );
    const validationUrl = new URL(calls[1].url);
    assert.equal(validationUrl.pathname, '/auth/v1/user');
    assert.equal(calls[1].init?.method, 'GET');
    const validationHeaders = new Headers(calls[1].init?.headers);
    assert.equal(validationHeaders.get('authorization'), `Bearer ${recoveryToken}`);
    const updateUrl = new URL(calls[2].url);
    assert.equal(updateUrl.pathname, '/auth/v1/user');
    assert.equal(calls[2].init?.method, 'PUT');
    const updateHeaders = new Headers(calls[2].init?.headers);
    assert.equal(updateHeaders.get('apikey'), 'publishable');
    assert.equal(updateHeaders.get('authorization'), `Bearer ${recoveryToken}`);
    assert.deepEqual(JSON.parse(String(calls[2].init?.body)), { password: 'new-password-123' });
    const logoutUrl = new URL(calls[3].url);
    assert.equal(logoutUrl.pathname, '/auth/v1/logout');
    assert.equal(logoutUrl.searchParams.get('scope'), 'global');
    assert.equal(calls[3].init?.method, 'POST');
    const logoutHeaders = new Headers(calls[3].init?.headers);
    assert.equal(logoutHeaders.get('authorization'), `Bearer ${recoveryToken}`);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('rechaza una sesión válida de contraseña como token de recuperación', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ id: 'user-auth-id', email: 'user@example.com' }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  try {
    await assert.rejects(
      () => provider().getUserId(unsignedToken('user-auth-id', 'password')),
      (error: unknown) =>
        error instanceof Error &&
        'code' in error &&
        error.code === 'INVALID_CREDENTIALS' &&
        'status' in error &&
        error.status === 401,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('acepta AMR exacto recovery u otp y rechaza password u otros metodos', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ id: 'user-auth-id', email: 'user@example.com' }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  try {
    await assert.doesNotReject(() => provider().getUserId(unsignedToken('user-auth-id', 'recovery')));
    await assert.doesNotReject(() => provider().getUserId(unsignedToken('user-auth-id', 'otp')));
    for (const methods of [
      ['password'],
      ['magiclink'],
      ['invite'],
      ['email'],
      ['signup'],
      ['email_change'],
      ['otp', 'password'],
      ['otp', 'token_refresh'],
      ['recovery', 'password'],
    ]) {
      await assert.rejects(
        () => provider().getUserId(unsignedToken('user-auth-id', methods)),
        (error: unknown) => error instanceof Error && 'status' in error && error.status === 401,
      );
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('recovery claim validation rejects mismatched identity, context, and time', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ id: 'user-auth-id', email: 'user@example.com' }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  const now = Math.floor(Date.now() / 1000);
  try {
    await assert.rejects(
      () => provider().getUserId(unsignedToken('another-user-id', 'otp')),
      (error: unknown) => error instanceof Error && 'status' in error && error.status === 401,
    );
    for (const overrides of [
      { email: 'other@example.com' },
      { iss: 'https://other.example/auth/v1' },
      { aud: 'anon' },
      { role: 'anon' },
      { session_id: '' },
      { session_id: undefined },
      { iat: now - 16 * 60 },
      { iat: now + 61 },
      { exp: now - 1 },
      { exp: now, iat: now + 1 },
    ]) {
      await assert.rejects(
        () => provider().getUserId(unsignedToken('user-auth-id', 'otp', overrides)),
        (error: unknown) => error instanceof Error && 'status' in error && error.status === 401,
      );
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('rechaza alta de apoderado si Supabase la confirma de inmediato', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({ user: { id: 'guardian-auth-id' }, access_token: 'unexpected-session' }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    );
  try {
    assert.deepEqual(
      await provider().signUpGuardian(
        'guardian@example.com',
        'password123',
        'https://app.example/es-PE/login?verified=1',
      ),
      { authId: 'guardian-auth-id', pendingVerification: false },
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
