import type { z, ZodTypeAny } from 'zod';
import { AppError } from './errors';

/**
 * Valida entrada externa con Zod en el límite de la API (Stack §4.1).
 * Devuelve el tipo de SALIDA del esquema, con defaults ya aplicados.
 */
export function parse<S extends ZodTypeAny>(schema: S, data: unknown): z.output<S> {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new AppError('VALIDATION_FAILED', 400, 'Los datos enviados no son válidos', {
      issues: result.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    });
  }
  return result.data as z.output<S>;
}
