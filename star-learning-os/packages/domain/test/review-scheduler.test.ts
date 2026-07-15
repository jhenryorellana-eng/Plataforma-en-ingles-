import { describe, expect, it } from 'vitest';
import {
  computeNextReviewAt,
  firstReviewIntervalDays,
  nextReviewIntervalDays,
  qualifiesAsDelayedRetrieval,
} from '../src/review-scheduler';

describe('escalera de recuperación espaciada 1/3/7/14/30 (RVW-02)', () => {
  it('el primer repaso es a 1 día', () => {
    expect(firstReviewIntervalDays()).toBe(1);
  });

  it('aprobar sube un peldaño', () => {
    expect(nextReviewIntervalDays(1, 'pass')).toBe(3);
    expect(nextReviewIntervalDays(3, 'pass')).toBe(7);
    expect(nextReviewIntervalDays(7, 'pass')).toBe(14);
    expect(nextReviewIntervalDays(14, 'pass')).toBe(30);
  });

  it('el tope se mantiene en 30 días', () => {
    expect(nextReviewIntervalDays(30, 'pass')).toBe(30);
  });

  it('fallar baja un peldaño sin caer por debajo de 1', () => {
    expect(nextReviewIntervalDays(7, 'fail')).toBe(3);
    expect(nextReviewIntervalDays(1, 'fail')).toBe(1);
  });

  it('computeNextReviewAt suma el intervalo exacto', () => {
    const from = new Date('2026-07-15T00:00:00Z');
    expect(computeNextReviewAt(from, 7).toISOString()).toBe('2026-07-22T00:00:00.000Z');
  });

  it('la recuperación diferida exige el intervalo mínimo de 7 días (§12.2.5)', () => {
    const last = new Date('2026-07-01T00:00:00Z');
    expect(qualifiesAsDelayedRetrieval(last, new Date('2026-07-08T00:00:00Z'), 7)).toBe(true);
    expect(qualifiesAsDelayedRetrieval(last, new Date('2026-07-05T00:00:00Z'), 7)).toBe(false);
  });
});
