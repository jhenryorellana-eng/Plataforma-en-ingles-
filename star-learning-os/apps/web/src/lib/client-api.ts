'use client';

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export class ClientApiError extends Error {
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

/** Fetch de cliente: la cookie httpOnly viaja con credentials: 'include'. */
export async function clientApi<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}/v1${path}`, {
      ...init,
      credentials: 'include',
      // Content-Type solo con cuerpo: Fastify rechaza JSON declarado con body vacío.
      headers: {
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
        ...init?.headers,
      },
    });
  } catch {
    // Fallo de red (API inalcanzable, sin internet): mensaje humano, no "Failed to fetch".
    throw new ClientApiError(0, 'NETWORK', 'No pudimos conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.');
  }
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as ErrorBody;
    throw new ClientApiError(
      response.status,
      body.error?.code ?? 'INTERNAL',
      body.error?.message ?? 'Error de la API',
      body.error?.details,
    );
  }
  return (await response.json()) as T;
}
