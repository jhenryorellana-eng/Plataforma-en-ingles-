import type { CefrLevel, PaceCode } from './types';

/**
 * Calendario estimado según nivel de entrada y ritmo (Metodología §9.3).
 * Son hipótesis de planificación con contingencia, no garantías: deben
 * recalibrarse con cohortes reales.
 */
export type EntryBucket = 'PRE_A1_A1' | 'A2' | 'B1' | 'B2';

export const REMAINING_HOURS: Record<EntryBucket, { min: number; max: number }> = {
  PRE_A1_A1: { min: 630, max: 860 },
  A2: { min: 420, max: 580 },
  B1: { min: 250, max: 360 },
  B2: { min: 110, max: 160 },
};

export const CALENDAR_MONTHS: Record<EntryBucket, Record<PaceCode, { min: number; max: number }>> = {
  PRE_A1_A1: {
    flex: { min: 20, max: 28 },
    accelerated: { min: 14, max: 18 },
    sprint: { min: 9, max: 12 },
  },
  A2: {
    flex: { min: 13, max: 18 },
    accelerated: { min: 9, max: 12 },
    sprint: { min: 6, max: 8 },
  },
  B1: {
    flex: { min: 8, max: 11 },
    accelerated: { min: 5, max: 8 },
    sprint: { min: 4, max: 5 },
  },
  B2: {
    flex: { min: 4, max: 5 },
    accelerated: { min: 2, max: 4 },
    sprint: { min: 2, max: 3 },
  },
};

export function entryBucket(level: CefrLevel): EntryBucket {
  if (level === 'PRE_A1' || level === 'A1') return 'PRE_A1_A1';
  if (level === 'A2') return 'A2';
  if (level === 'B2' || level === 'C1') return 'B2';
  return 'B1';
}

export interface CalendarProjection {
  monthsMin: number;
  monthsMax: number;
  remainingHoursMin: number;
  remainingHoursMax: number;
}

/** Proyección mostrada en el selector de ritmo posterior al diagnóstico (§7.5). */
export function projectCalendar(entryLevel: CefrLevel, pace: PaceCode): CalendarProjection {
  const bucket = entryBucket(entryLevel);
  const months = CALENDAR_MONTHS[bucket][pace];
  const hours = REMAINING_HOURS[bucket];
  return {
    monthsMin: months.min,
    monthsMax: months.max,
    remainingHoursMin: hours.min,
    remainingHoursMax: hours.max,
  };
}
