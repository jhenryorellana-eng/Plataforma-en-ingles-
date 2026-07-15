import { describe, expect, it } from 'vitest';
import { entryBucket, projectCalendar } from '../src/projection';

describe('projectCalendar — Metodología §9.3', () => {
  it('B1 en Accelerated proyecta 5–8 meses y 250–360 horas restantes', () => {
    const projection = projectCalendar('B1', 'accelerated');
    expect(projection).toEqual({
      monthsMin: 5,
      monthsMax: 8,
      remainingHoursMin: 250,
      remainingHoursMax: 360,
    });
  });

  it('Pre-A1/A1 en Flex proyecta 20–28 meses', () => {
    const projection = projectCalendar('A1', 'flex');
    expect(projection.monthsMin).toBe(20);
    expect(projection.monthsMax).toBe(28);
  });

  it('B2 en Sprint proyecta 2–3 meses', () => {
    const projection = projectCalendar('B2', 'sprint');
    expect(projection.monthsMin).toBe(2);
    expect(projection.monthsMax).toBe(3);
  });

  it('agrupa niveles en los buckets del calendario', () => {
    expect(entryBucket('PRE_A1')).toBe('PRE_A1_A1');
    expect(entryBucket('A1')).toBe('PRE_A1_A1');
    expect(entryBucket('A2')).toBe('A2');
    expect(entryBucket('B1')).toBe('B1');
    expect(entryBucket('B2')).toBe('B2');
    expect(entryBucket('C1')).toBe('B2');
  });
});
