import { describe, expect, it } from 'vitest';
import { estimatePlacement, type PlacementResponse } from '../src/placement';

function responses(skill: PlacementResponse['skill'], correct: number, total: number): PlacementResponse[] {
  return Array.from({ length: total }, (_, i) => ({ skill, correct: i < correct }));
}

describe('estimatePlacement — regla de ubicación §7.4', () => {
  it('no promedia: el nivel general es donde puede participar con éxito (mínimo)', () => {
    const estimate = estimatePlacement([
      ...responses('reading', 8, 10),
      ...responses('listening', 6, 10),
      ...responses('language_use', 2, 10),
    ]);
    expect(estimate.perSkill.reading).toBe('B2');
    expect(estimate.perSkill.language_use).toBe('A2');
    expect(estimate.overall).toBe('A2');
  });

  it('el resultado siempre es provisional (MAP-10: revisión humana para menores)', () => {
    const estimate = estimatePlacement(responses('reading', 5, 10));
    expect(estimate.provisional).toBe(true);
  });

  it('pocas respuestas reducen la confianza', () => {
    const small = estimatePlacement(responses('reading', 2, 3));
    const large = estimatePlacement([
      ...responses('reading', 7, 10),
      ...responses('listening', 6, 10),
      ...responses('language_use', 6, 10),
    ]);
    expect(small.confidence).toBeLessThan(large.confidence);
  });
});
