import { REVIEW_INTERVALS_DAYS } from './constants';

export type ReviewOutcome = 'pass' | 'fail';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function firstReviewIntervalDays(): number {
  return REVIEW_INTERVALS_DAYS[0];
}

/**
 * Escalera 1, 3, 7, 14, 30 días ajustada por desempeño (Metodología §6, Especificación RVW-02):
 * aprobar sube un peldaño, fallar baja uno. El tope se mantiene en 30 días.
 */
export function nextReviewIntervalDays(currentIntervalDays: number, outcome: ReviewOutcome): number {
  const ladder = REVIEW_INTERVALS_DAYS;
  let index = ladder.findIndex((d) => d >= currentIntervalDays);
  if (index === -1) index = ladder.length - 1;
  const nextIndex =
    outcome === 'pass' ? Math.min(index + 1, ladder.length - 1) : Math.max(index - 1, 0);
  return ladder[nextIndex];
}

export function computeNextReviewAt(from: Date, intervalDays: number): Date {
  return new Date(from.getTime() + intervalDays * MS_PER_DAY);
}

/**
 * La recuperación diferida solo cuenta para dominio si pasó el intervalo mínimo
 * desde la última evidencia (Especificación §12.2.5, inicialmente 7 días).
 */
export function qualifiesAsDelayedRetrieval(
  lastEvidenceAt: Date,
  retrievalAt: Date,
  minDays: number,
): boolean {
  return retrievalAt.getTime() - lastEvidenceAt.getTime() >= minDays * MS_PER_DAY;
}
