import { createHash } from 'node:crypto';
import { decodeJwt } from 'jose';
import { AppError } from '../../common/errors';
import type { AppConfig } from '../../config/config';

const DEFAULT_AUTH_TIMEOUT_MS = 8_000;
const RECOVERY_SESSION_MAX_AGE_SECONDS = 15 * 60;
const JWT_CLOCK_SKEW_SECONDS = 60;
export const REGISTRATION_CONFLICT_MESSAGE =
  'No se pudo completar el registro. Si ya tienes una cuenta, inicia sesión.';
const PROVIDER_UNAVAILABLE_MESSAGE = 'El servicio de identidad no está disponible temporalmente.';

/**
 * Proveedor de identidad con contraseña (Stack §5.1, adaptador D-P02).
 * Producción: Supabase Auth (GoTrue). Desarrollo sin claves: mock en memoria.
 */
export interface IdentityProvider {
  readonly name: string;
  /** Crea la cuenta YA CONFIRMADA (decisión de Henry 2026-07-16: sin verificación de correo). */
  signUp(email: string, password: string): Promise<{ authId: string }>;
  /** Alta pública de apoderado: debe quedar pendiente de confirmar su correo. */
  signUpGuardian(
    email: string,
    password: string,
    redirectTo: string,
  ): Promise<{ authId: string | null; pendingVerification: boolean }>;
  /** Reenvía la confirmación de alta sin revelar si la cuenta existe. */
  resendSignup(email: string, redirectTo: string): Promise<void>;
  /** Valida credenciales. Lanza AppError INVALID_CREDENTIALS si no coinciden. */
  signIn(email: string, password: string): Promise<{ authId: string }>;
  /** Envía el correo de recuperación. Nunca revela si la cuenta existe. */
  sendPasswordRecovery(email: string, redirectTo: string): Promise<void>;
  /** Valida el bearer con Supabase y devuelve la identidad que representa. */
  getUserId(accessToken: string): Promise<{ authId: string; email: string }>;
  /** Actualiza la contraseña usando exclusivamente el access token de recuperación. */
  updatePassword(accessToken: string, password: string): Promise<{ authId: string }>;
  /** Actualización administrativa para una cuenta de alumno ya autorizada localmente. */
  updateUserPassword(authId: string, password: string): Promise<void>;
  /** Revoca globalmente los refresh tokens del usuario en Supabase. */
  signOutAll(accessToken: string): Promise<void>;
  /** Compensación si falla la creación del perfil local tras crear Auth. */
  deleteUser(authId: string): Promise<void>;
}

/** Supabase Auth vía Admin API (server-side; la Secret key jamás sale del servidor). */
export class SupabaseIdentityProvider implements IdentityProvider {
  readonly name = 'supabase-auth';

  constructor(
    private readonly url: string,
    private readonly publishableKey: string,
    private readonly secretKey: string,
    private readonly requestTimeoutMs = DEFAULT_AUTH_TIMEOUT_MS,
  ) {}

  async signUp(email: string, password: string): Promise<{ authId: string }> {
    const response = await this.request('/auth/v1/admin/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: this.secretKey,
        Authorization: `Bearer ${this.secretKey}`,
      },
      body: JSON.stringify({ email, password, email_confirm: true }),
    });
    const body = (await response.json().catch(() => ({}))) as {
      id?: string;
      error_code?: string;
      msg?: string;
    };
    if (response.status === 422 && body.error_code === 'email_exists') {
      throw new AppError('VALIDATION_FAILED', 409, REGISTRATION_CONFLICT_MESSAGE);
    }
    this.throwForInfrastructureStatus(response);
    if (!response.ok || !body.id) {
      throw new AppError(
        'IDENTITY_PROVIDER_ERROR',
        502,
        'No se pudo crear la cuenta. Intenta de nuevo.',
      );
    }
    return { authId: body.id };
  }

  async signUpGuardian(
    email: string,
    password: string,
    redirectTo: string,
  ): Promise<{ authId: string | null; pendingVerification: boolean }> {
    const response = await this.request(withRedirect('/auth/v1/signup', redirectTo), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: this.publishableKey },
      // No se envía metadata: el rol vive únicamente en la base local autorizada.
      body: JSON.stringify({ email, password }),
    });
    const body = (await response.json().catch(() => ({}))) as {
      id?: string;
      access_token?: string | null;
      session?: { access_token?: string | null } | null;
      identities?: unknown[];
      user?: { id?: string; identities?: unknown[] };
      error_code?: string;
    };
    this.throwForInfrastructureStatus(response);
    if (
      (response.status === 400 || response.status === 422) &&
      (body.error_code === 'email_exists' || body.error_code === 'user_already_exists')
    ) {
      throw new AppError('VALIDATION_FAILED', 409, REGISTRATION_CONFLICT_MESSAGE);
    }
    const returnedAuthId = body.user?.id ?? body.id;
    if (!response.ok || !returnedAuthId) {
      throw new AppError(
        'IDENTITY_PROVIDER_ERROR',
        502,
        'No se pudo crear la cuenta. Intenta de nuevo.',
      );
    }
    // Con confirmación activa, Supabase puede devolver deliberadamente un
    // usuario falso para un correo ya registrado. Una identidad de email no
    // vacía es la señal de que esta solicitud creó realmente la identidad.
    const identities = body.user?.identities ?? body.identities;
    const authId = Array.isArray(identities) && identities.length > 0 ? returnedAuthId : null;
    return {
      authId,
      pendingVerification: !body.access_token && !body.session?.access_token,
    };
  }

  async resendSignup(email: string, redirectTo: string): Promise<void> {
    const response = await this.request(withRedirect('/auth/v1/resend', redirectTo), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: this.publishableKey },
      body: JSON.stringify({ type: 'signup', email }),
    });
    this.throwForInfrastructureStatus(response);
    if (!response.ok) {
      throw new AppError('IDENTITY_PROVIDER_ERROR', 502, PROVIDER_UNAVAILABLE_MESSAGE);
    }
  }

  async signIn(email: string, password: string): Promise<{ authId: string }> {
    const response = await this.request('/auth/v1/token?grant_type=password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: this.publishableKey },
      body: JSON.stringify({ email, password }),
    });
    const body = (await response.json().catch(() => ({}))) as {
      user?: { id?: string };
      access_token?: string;
      error_code?: string;
    };
    if (response.status === 400) {
      throw new AppError('INVALID_CREDENTIALS', 401, 'Correo o contraseña incorrectos');
    }
    this.throwForInfrastructureStatus(response);
    if (!response.ok || !body.user?.id || !body.access_token) {
      throw new AppError(
        'IDENTITY_PROVIDER_ERROR',
        502,
        'No se pudo iniciar sesión. Intenta de nuevo.',
      );
    }
    // STAR usa su propia sesión opaca. El password grant de Supabase crea una
    // sesión y refresh token que no debemos abandonar activos al descartarlos.
    await this.signOut(body.access_token, 'local');
    return { authId: body.user.id };
  }

  async sendPasswordRecovery(email: string, redirectTo: string): Promise<void> {
    const response = await this.request(withRedirect('/auth/v1/recover', redirectTo), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: this.publishableKey },
      body: JSON.stringify({ email }),
    });
    this.throwForInfrastructureStatus(response);
    if (!response.ok) {
      throw new AppError('IDENTITY_PROVIDER_ERROR', 502, PROVIDER_UNAVAILABLE_MESSAGE);
    }
  }

  async getUserId(accessToken: string): Promise<{ authId: string; email: string }> {
    const response = await this.request('/auth/v1/user', {
      method: 'GET',
      headers: {
        apikey: this.publishableKey,
        Authorization: `Bearer ${accessToken}`,
      },
    });
    const body = (await response.json().catch(() => ({}))) as {
      id?: string;
      email?: string;
      user?: { id?: string; email?: string };
    };
    if (response.status === 401 || response.status === 403) {
      throw new AppError(
        'INVALID_CREDENTIALS',
        401,
        'El enlace de recuperación no es válido o expiró.',
      );
    }
    this.throwForInfrastructureStatus(response);
    const authId = body.user?.id ?? body.id;
    const email = body.user?.email ?? body.email;
    if (!response.ok || !authId || !email) {
      throw new AppError('IDENTITY_PROVIDER_ERROR', 502, PROVIDER_UNAVAILABLE_MESSAGE);
    }
    // GET /user acaba de validar criptográficamente este mismo bearer contra
    // Supabase. Solo entonces inspeccionamos AMR para impedir que una sesión
    // normal de contraseña se reutilice como si fuera un enlace de recovery.
    try {
      const claims = decodeJwt(accessToken);
      const methods = Array.isArray(claims.amr)
        ? claims.amr.map((entry) =>
            typeof entry === 'object' && entry !== null && 'method' in entry
              ? entry.method
              : undefined,
          )
        : [];
      // Supabase actualmente representa la sesion emitida por verify(type=recovery)
      // como AMR [{ method: 'otp' }]. La aceptamos solo en su forma exacta y no
      // permitimos mezclarla con password, magiclink, invite u otros metodos.
      const hasRecoveryMethod =
        methods.length === 1 && (methods[0] === 'recovery' || methods[0] === 'otp');
      const nowSeconds = Math.floor(Date.now() / 1000);
      const issuedAt = typeof claims.iat === 'number' ? claims.iat : Number.NaN;
      const expiresAt = typeof claims.exp === 'number' ? claims.exp : Number.NaN;
      const tokenEmail = typeof claims.email === 'string' ? claims.email.trim().toLowerCase() : '';
      const expectedIssuer = `${this.url.replace(/\/$/, '')}/auth/v1`;
      if (
        claims.sub !== authId ||
        tokenEmail !== email.trim().toLowerCase() ||
        claims.iss !== expectedIssuer ||
        claims.aud !== 'authenticated' ||
        claims.role !== 'authenticated' ||
        typeof claims.session_id !== 'string' ||
        claims.session_id.length === 0 ||
        !Number.isFinite(issuedAt) ||
        issuedAt >= nowSeconds + JWT_CLOCK_SKEW_SECONDS ||
        issuedAt < nowSeconds - RECOVERY_SESSION_MAX_AGE_SECONDS ||
        !Number.isFinite(expiresAt) ||
        expiresAt <= nowSeconds ||
        expiresAt <= issuedAt ||
        !hasRecoveryMethod
      ) {
        throw new Error('not a recovery session');
      }
    } catch {
      throw new AppError(
        'INVALID_CREDENTIALS',
        401,
        'El enlace de recuperación no es válido o expiró.',
      );
    }
    return { authId, email };
  }

  async updatePassword(accessToken: string, password: string): Promise<{ authId: string }> {
    const response = await this.request('/auth/v1/user', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        apikey: this.publishableKey,
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ password }),
    });
    const body = (await response.json().catch(() => ({}))) as {
      id?: string;
      user?: { id?: string };
    };
    if (response.status === 401 || response.status === 403) {
      throw new AppError(
        'INVALID_CREDENTIALS',
        401,
        'El enlace de recuperación no es válido o expiró.',
      );
    }
    this.throwForInfrastructureStatus(response);
    const authId = body.user?.id ?? body.id;
    if (!response.ok || !authId) {
      throw new AppError('IDENTITY_PROVIDER_ERROR', 502, 'No se pudo actualizar la contraseña.');
    }
    return { authId };
  }

  async updateUserPassword(authId: string, password: string): Promise<void> {
    const response = await this.request(`/auth/v1/admin/users/${encodeURIComponent(authId)}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        apikey: this.secretKey,
        Authorization: `Bearer ${this.secretKey}`,
      },
      body: JSON.stringify({ password }),
    });
    this.throwForInfrastructureStatus(response);
    if (response.status === 400 || response.status === 422) {
      throw new AppError('VALIDATION_FAILED', 400, 'La nueva contraseña no es válida.');
    }
    if (!response.ok) {
      throw new AppError('IDENTITY_PROVIDER_ERROR', 502, PROVIDER_UNAVAILABLE_MESSAGE);
    }
  }

  async signOutAll(accessToken: string): Promise<void> {
    await this.signOut(accessToken, 'global', true);
  }

  private async signOut(
    accessToken: string,
    scope: 'local' | 'global',
    invalidRecoveryToken = false,
  ): Promise<void> {
    const response = await this.request(`/auth/v1/logout?scope=${scope}`, {
      method: 'POST',
      headers: {
        apikey: this.publishableKey,
        Authorization: `Bearer ${accessToken}`,
      },
    });
    if (response.status === 401 || response.status === 403) {
      if (invalidRecoveryToken) {
        throw new AppError(
          'INVALID_CREDENTIALS',
          401,
          'El enlace de recuperación no es válido o expiró.',
        );
      }
      throw new AppError('IDENTITY_PROVIDER_ERROR', 503, PROVIDER_UNAVAILABLE_MESSAGE);
    }
    this.throwForInfrastructureStatus(response);
    if (!response.ok) {
      throw new AppError('IDENTITY_PROVIDER_ERROR', 502, PROVIDER_UNAVAILABLE_MESSAGE);
    }
  }

  async deleteUser(authId: string): Promise<void> {
    const response = await this.request(`/auth/v1/admin/users/${encodeURIComponent(authId)}`, {
      method: 'DELETE',
      headers: {
        apikey: this.secretKey,
        Authorization: `Bearer ${this.secretKey}`,
      },
    });
    this.throwForInfrastructureStatus(response);
    if (!response.ok && response.status !== 404) {
      throw new AppError('IDENTITY_PROVIDER_ERROR', 502, PROVIDER_UNAVAILABLE_MESSAGE);
    }
  }

  private async request(path: string, init: RequestInit): Promise<Response> {
    try {
      return await fetch(`${this.url}${path}`, {
        ...init,
        signal: AbortSignal.timeout(this.requestTimeoutMs),
      });
    } catch {
      throw new AppError('IDENTITY_PROVIDER_ERROR', 503, PROVIDER_UNAVAILABLE_MESSAGE);
    }
  }

  private throwForInfrastructureStatus(response: Response): void {
    if (response.status === 429) {
      throw new AppError('RATE_LIMITED', 429, 'Demasiados intentos. Intenta de nuevo más tarde.', {
        retryAfterSeconds: retryAfterSeconds(response.headers.get('retry-after')),
      });
    }
    if (response.status >= 500) {
      throw new AppError('IDENTITY_PROVIDER_ERROR', 503, PROVIDER_UNAVAILABLE_MESSAGE);
    }
  }
}

/**
 * Mock en memoria para desarrollo y smoke local: mismas reglas visibles
 * (registro instantáneo, credenciales inválidas → 401) sin red externa.
 */
export class MockIdentityProvider implements IdentityProvider {
  readonly name = 'mock-identity';
  private readonly accounts = new Map<
    string,
    { authId: string; passwordHash: string; confirmed: boolean }
  >();

  private hash(password: string): string {
    return createHash('sha256').update(password).digest('hex');
  }

  private deterministicId(email: string): string {
    // UUID v4-like derivado del email: estable entre llamadas dentro del proceso.
    const h = createHash('sha256').update(email).digest('hex');
    return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`;
  }

  async signUp(email: string, password: string): Promise<{ authId: string }> {
    if (this.accounts.has(email)) {
      throw new AppError('VALIDATION_FAILED', 409, REGISTRATION_CONFLICT_MESSAGE);
    }
    const account = {
      authId: this.deterministicId(email),
      passwordHash: this.hash(password),
      confirmed: true,
    };
    this.accounts.set(email, account);
    return { authId: account.authId };
  }

  async signUpGuardian(
    email: string,
    password: string,
    _redirectTo: string,
  ): Promise<{ authId: string | null; pendingVerification: boolean }> {
    if (this.accounts.has(email)) {
      throw new AppError('VALIDATION_FAILED', 409, REGISTRATION_CONFLICT_MESSAGE);
    }
    const account = {
      authId: this.deterministicId(email),
      passwordHash: this.hash(password),
      confirmed: false,
    };
    this.accounts.set(email, account);
    return { authId: account.authId, pendingVerification: true };
  }

  async resendSignup(_email: string, _redirectTo: string): Promise<void> {
    // Sin correo real en modo mock.
  }

  async signIn(email: string, password: string): Promise<{ authId: string }> {
    const account = this.accounts.get(email);
    if (!account || !account.confirmed || account.passwordHash !== this.hash(password)) {
      throw new AppError('INVALID_CREDENTIALS', 401, 'Correo o contraseña incorrectos');
    }
    return { authId: account.authId };
  }

  async sendPasswordRecovery(_email: string, _redirectTo: string): Promise<void> {
    // Sin correo real en modo mock.
  }

  async getUserId(accessToken: string): Promise<{ authId: string; email: string }> {
    const entry = [...this.accounts.entries()].find(
      ([, candidate]) => candidate.authId === accessToken && candidate.confirmed,
    );
    if (!entry) {
      throw new AppError(
        'INVALID_CREDENTIALS',
        401,
        'El enlace de recuperación no es válido o expiró.',
      );
    }
    const [email, account] = entry;
    return { authId: account.authId, email };
  }

  async updatePassword(accessToken: string, password: string): Promise<{ authId: string }> {
    for (const account of this.accounts.values()) {
      if (account.authId === accessToken && account.confirmed) {
        account.passwordHash = this.hash(password);
        return { authId: account.authId };
      }
    }
    throw new AppError(
      'INVALID_CREDENTIALS',
      401,
      'El enlace de recuperación no es válido o expiró.',
    );
  }

  async updateUserPassword(authId: string, password: string): Promise<void> {
    for (const account of this.accounts.values()) {
      if (account.authId === authId) {
        account.passwordHash = this.hash(password);
        return;
      }
    }
    throw new AppError('NOT_FOUND', 404, 'Cuenta de identidad no encontrada.');
  }

  async signOutAll(accessToken: string): Promise<void> {
    await this.getUserId(accessToken);
  }

  async deleteUser(authId: string): Promise<void> {
    for (const [email, account] of this.accounts) {
      if (account.authId === authId) this.accounts.delete(email);
    }
  }
}

function withRedirect(path: string, redirectTo: string): string {
  const separator = path.includes('?') ? '&' : '?';
  return `${path}${separator}redirect_to=${encodeURIComponent(redirectTo)}`;
}

function retryAfterSeconds(value: string | null): number {
  if (!value) return 60;
  const numeric = Number(value);
  if (Number.isFinite(numeric) && numeric > 0) return Math.ceil(numeric);
  const date = Date.parse(value);
  return Number.isFinite(date) ? Math.max(1, Math.ceil((date - Date.now()) / 1000)) : 60;
}

export function buildIdentityProvider(config: AppConfig): IdentityProvider {
  if (config.supabaseUrl && config.supabasePublishableKey && config.supabaseSecretKey) {
    return new SupabaseIdentityProvider(
      config.supabaseUrl,
      config.supabasePublishableKey,
      config.supabaseSecretKey,
    );
  }
  return new MockIdentityProvider();
}
