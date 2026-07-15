import { describe, expect, it } from 'vitest';
import { scoreGapFill, scoreMcq, scoreWritingHeuristic } from '../src/scoring';

describe('scoreMcq', () => {
  it('puntúa 1 si acierta y 0 si falla', () => {
    expect(scoreMcq(2, 2)).toEqual({ score: 1, correct: true });
    expect(scoreMcq(1, 2)).toEqual({ score: 0, correct: false });
  });
});

describe('scoreGapFill', () => {
  it('normaliza mayúsculas y espacios', () => {
    const result = scoreGapFill(['  Went ', 'has been'], [['went'], ['has been', "'s been"]]);
    expect(result.score).toBe(1);
  });

  it('da crédito parcial por hueco', () => {
    const result = scoreGapFill(['went', 'goed'], [['went'], ['has gone']]);
    expect(result.score).toBe(0.5);
    expect(result.perGap).toEqual([true, false]);
  });

  it('respuesta vacía no puntúa', () => {
    expect(scoreGapFill([], [['a'], ['b']]).score).toBe(0);
  });
});

describe('scoreWritingHeuristic', () => {
  const spec = { minWords: 40, requiredElements: ['dear', 'deadline', 'thank'] };

  it('detecta elementos requeridos presentes y ausentes', () => {
    const text =
      'Dear Ms. Torres, I am writing to ask about the scholarship deadline. ' +
      'Could you confirm the exact date and the documents required? ' +
      'I want to prepare everything in advance because this opportunity is important for me. Thank you for your help.';
    const result = scoreWritingHeuristic(text, spec);
    expect(result.missingElements).toEqual([]);
    expect(result.dimensionScores.task_completion).toBe(1);
    expect(result.score).toBeGreaterThan(0.7);
  });

  it('un texto demasiado corto baja organización y rango', () => {
    const result = scoreWritingHeuristic('Dear teacher thank you deadline.', spec);
    expect(result.wordCount).toBeLessThan(spec.minWords);
    expect(result.dimensionScores.organization).toBeLessThan(0.5);
  });

  it('la confianza del heurístico es siempre baja: nunca es autoridad final', () => {
    const result = scoreWritingHeuristic('Any text', spec);
    expect(result.confidence).toBeLessThan(0.5);
  });
});
