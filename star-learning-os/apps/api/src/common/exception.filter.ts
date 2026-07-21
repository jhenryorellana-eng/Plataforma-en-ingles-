import { ArgumentsHost, Catch, type ExceptionFilter, HttpException, Logger } from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { ZodError } from 'zod';
import type { ApiErrorShape } from '@star/contracts';
import { AppError } from './errors';

/**
 * Convierte toda excepción al formato estable de error de la API
 * (Arquitectura §11.8) sin filtrar detalles internos.
 */
@Catch()
export class AppExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('HttpError');

  catch(exception: unknown, host: ArgumentsHost): void {
    const reply = host.switchToHttp().getResponse<FastifyReply>();

    if (exception instanceof AppError) {
      if (exception.status === 429) {
        const retryAfter = exception.details?.retryAfterSeconds;
        if (typeof retryAfter === 'number' && Number.isFinite(retryAfter)) {
          reply.header('Retry-After', String(Math.max(1, Math.ceil(retryAfter))));
        }
      }
      void reply.status(exception.status).send(this.shape(exception.code, exception.message, exception.details));
      return;
    }

    if (exception instanceof ZodError) {
      void reply
        .status(400)
        .send(this.shape('VALIDATION_FAILED', 'Los datos enviados no son válidos', { issues: exception.issues }));
      return;
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const code =
        status === 404
          ? 'NOT_FOUND'
          : status === 403
            ? 'FORBIDDEN'
            : status === 401
              ? 'UNAUTHENTICATED'
              : status === 503
                ? 'SERVICE_UNAVAILABLE'
                : 'INTERNAL';
      void reply.status(status).send(this.shape(code, exception.message));
      return;
    }

    if (isDatabaseCapacityError(exception)) {
      const message = exception instanceof Error ? exception.message : String(exception);
      this.logger.warn(`Capacidad temporal de base de datos agotada: ${message}`);
      reply.header('Retry-After', '2');
      void reply
        .status(503)
        .send(this.shape('SERVICE_UNAVAILABLE', 'La base de datos está ocupada. Inténtalo nuevamente.'));
      return;
    }

    const message = exception instanceof Error ? exception.message : String(exception);
    this.logger.error(`Error no controlado: ${message}`, exception instanceof Error ? exception.stack : undefined);
    void reply.status(500).send(this.shape('INTERNAL', 'Error interno del servidor'));
  }

  private shape(
    code: ApiErrorShape['error']['code'],
    message: string,
    details?: Record<string, unknown>,
  ): ApiErrorShape {
    return { error: { code, message, ...(details ? { details } : {}) } };
  }
}

/** Prisma P2024 o rechazo explícito del pool compartido de Postgres/Supavisor. */
export function isDatabaseCapacityError(exception: unknown): boolean {
  if (typeof exception !== 'object' || exception === null) return false;
  const candidate = exception as { code?: unknown; message?: unknown };
  if (candidate.code === 'P2024') return true;
  const message = typeof candidate.message === 'string' ? candidate.message : '';
  return /EMAXCONNSESSION|max clients reached|connection pool timeout/i.test(message);
}
