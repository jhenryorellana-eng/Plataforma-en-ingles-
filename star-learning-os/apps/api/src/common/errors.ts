import type { ErrorCode } from '@star/contracts';

export class AppError extends Error {
  constructor(
    readonly code: ErrorCode,
    readonly status: number,
    message: string,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function notFound(message = 'Recurso no encontrado'): AppError {
  return new AppError('NOT_FOUND', 404, message);
}

export function forbidden(message = 'No tienes acceso a este recurso'): AppError {
  return new AppError('FORBIDDEN', 403, message);
}

export function unauthenticated(message = 'Inicia sesión para continuar'): AppError {
  return new AppError('UNAUTHENTICATED', 401, message);
}
