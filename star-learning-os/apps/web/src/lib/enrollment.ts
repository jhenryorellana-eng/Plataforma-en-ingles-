import type { EnrollmentResponse } from '@star/contracts';
import { apiFetchOrNull } from './api';

/**
 * Resultado de resolver la inscripción del usuario para el programa de la URL
 * (Arquitectura §16.2): sin sesión → /login; logueado sin inscripción usable
 * → /enroll (jamás echar a login a quien ya está dentro).
 */
export type EnrollmentResolution =
  | { kind: 'ok'; enrollment: EnrollmentResponse }
  | { kind: 'anonymous' }
  | { kind: 'no-enrollment' };

export async function resolveEnrollment(programCode: string): Promise<EnrollmentResolution> {
  const enrollments = await apiFetchOrNull<EnrollmentResponse[]>('/enrollments');
  if (!enrollments) return { kind: 'anonymous' };
  const enrollment =
    enrollments.find(
      (entry) =>
        entry.program.code === programCode &&
        ['active', 'pending_diagnostic', 'paused'].includes(entry.status),
    ) ?? null;
  return enrollment ? { kind: 'ok', enrollment } : { kind: 'no-enrollment' };
}
