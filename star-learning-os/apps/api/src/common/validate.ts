import type { ZodType } from 'zod';
import { AppError } from './errors';

/** Valida entrada externa con Zod en el límite de la API (Stack §4.1). */
export function parse<T>(schema: ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new AppError('VALIDATION_FAILED', 400, 'Los datos enviados no son válidos', {
      issues: result.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    });
  }
  return result.data;
}
