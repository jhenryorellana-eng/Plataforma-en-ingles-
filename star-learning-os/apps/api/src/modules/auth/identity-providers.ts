import { createHash } from 'node:crypto';
import { AppError } from '../../common/errors';
import type { AppConfig } from '../../config/config';

/**
 * Proveedor de identidad con contraseña (Stack §5.1, adaptador D-P02).
 * Producción: Supabase Auth (GoTrue). Desarrollo sin claves: mock en memoria.
 */
export interface IdentityProvider {
  readonly name: string;
  /** Crea la cuenta YA CONFIRMADA (decisión de Henry 2026-07-16: sin verificación de correo). */
  signUp(email: string, password: string): Promise<{ authId: string }>;
  /** Valida credenciales. Lanza AppError INVALID_CREDENTIALS si no coinciden. */
  signIn(email: string, password: string): Promise<{ authId: string }>;
  /** Envía el correo de recuperación. Nunca revela si la cuenta existe. */
  sendPasswordRecovery(email: string): Promise<void>;
}

/** Supabase Auth vía Admin API (server-side; la Secret key jamás sale del servidor). */
export class SupabaseIdentityProvider implements IdentityProvider {
  readonly name = 'supabase-auth';

  constructor(
    private readonly url: string,
    private readonly publishableKey: string,
    private readonly secretKey: string,
  ) {}

  async signUp(email: string, password: string): Promise<{ authId: string }> {
    const response = await fetch(`${this.url}/auth/v1/admin/users`, {
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
      throw new AppError('VALIDATION_FAILED', 409, 'Ese correo ya tiene una cuenta. Inicia sesión.');
    }
    if (!response.ok || !body.id) {
      throw new AppError(
        'IDENTITY_PROVIDER_ERROR',
        502,
        `No se pudo crear la cuenta (${body.error_code ?? response.status})`,
      );
    }
    return { authId: body.id };
  }

  async signIn(email: string, password: string): Promise<{ authId: string }> {
    const response = await fetch(`${this.url}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: this.publishableKey },
      body: JSON.stringify({ email, password }),
    });
    const body = (await response.json().catch(() => ({}))) as {
      user?: { id?: string };
      error_code?: string;
    };
    if (response.status === 400) {
      throw new AppError('INVALID_CREDENTIALS', 401, 'Correo o contraseña incorrectos');
    }
    if (!response.ok || !body.user?.id) {
      throw new AppError(
        'IDENTITY_PROVIDER_ERROR',
        502,
        `No se pudo iniciar sesión (${body.error_code ?? response.status})`,
      );
    }
    return { authId: body.user.id };
  }

  async sendPasswordRecovery(email: string): Promise<void> {
    await fetch(`${this.url}/auth/v1/recover`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: this.publishableKey },
      body: JSON.stringify({ email }),
    }).catch(() => undefined);
  }
}

/**
 * Mock en memoria para desarrollo y smoke local: mismas reglas visibles
 * (registro instantáneo, credenciales inválidas → 401) sin red externa.
 */
export class MockIdentityProvider implements IdentityProvider {
  readonly name = 'mock-identity';
  private readonly accounts = new Map<string, { authId: string; passwordHash: string }>();

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
      throw new AppError('VALIDATION_FAILED', 409, 'Ese correo ya tiene una cuenta. Inicia sesión.');
    }
    const account = { authId: this.deterministicId(email), passwordHash: this.hash(password) };
    this.accounts.set(email, account);
    return { authId: account.authId };
  }

  async signIn(email: string, password: string): Promise<{ authId: string }> {
    const account = this.accounts.get(email);
    if (!account || account.passwordHash !== this.hash(password)) {
      throw new AppError('INVALID_CREDENTIALS', 401, 'Correo o contraseña incorrectos');
    }
    return { authId: account.authId };
  }

  async sendPasswordRecovery(): Promise<void> {
    // Sin correo real en modo mock.
  }
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
