import type { EnrollmentResponse } from '@star/contracts';
import { apiFetchOrNull } from './api';

/** Resuelve la inscripción del usuario actual para el programa de la URL (Arquitectura §16.2). */
export async function resolveEnrollment(programCode: string): Promise<EnrollmentResponse | null> {
  const enrollments = await apiFetchOrNull<EnrollmentResponse[]>('/enrollments');
  if (!enrollments) return null;
  return (
    enrollments.find(
      (enrollment) =>
        enrollment.program.code === programCode &&
        ['active', 'pending_diagnostic', 'paused'].includes(enrollment.status),
    ) ?? null
  );
}
