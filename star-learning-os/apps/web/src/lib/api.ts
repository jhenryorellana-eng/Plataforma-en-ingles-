import { cookies } from 'next/headers';

/** URL privada para Server Components; no se publica en el bundle del navegador. */
export const API_URL = (
  process.env.API_INTERNAL_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  'http://localhost:4000'
).replace(/\/$/, '');

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
  }
}

interface ErrorBody {
  error?: { code?: string; message?: string; details?: Record<string, unknown> };
}

/** Fetch de servidor (Server Components): reenvía la cookie de sesión a la API. */
export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('star_session');
  const response = await fetch(`${API_URL}/v1${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      // El proxy interno solo necesita la sesión de STAR. No reenvía al API
      // cookies de analítica, plataforma o futuras integraciones de la web.
      ...(sessionCookie
        ? { cookie: `${sessionCookie.name}=${encodeURIComponent(sessionCookie.value)}` }
        : {}),
      ...init?.headers,
    },
    cache: 'no-store',
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as ErrorBody;
    throw new ApiError(
      response.status,
      body.error?.code ?? 'INTERNAL',
      body.error?.message ?? 'Error de la API',
      body.error?.details,
    );
  }
  return (await response.json()) as T;
}

/**
 * Devuelve null cuando no hay sesión verificable: 401/403, o la API
 * inalcanzable (error de red). La puerta de entrada degrada a /login,
 * jamás a un 500.
 */
export async function apiFetchOrNull<T>(path: string, init?: RequestInit): Promise<T | null> {
  try {
    return await apiFetch<T>(path, init);
  } catch (error) {
    if (error instanceof ApiError && (error.status === 401 || error.status === 403)) return null;
    if (!(error instanceof ApiError)) return null;
    throw error;
  }
}
