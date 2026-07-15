export interface McqResult {
  score: number;
  correct: boolean;
}

export function scoreMcq(selectedIndex: number, correctIndex: number): McqResult {
  const correct = selectedIndex === correctIndex;
  return { score: correct ? 1 : 0, correct };
}

function normalizeAnswer(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, ' ');
}

export interface GapFillResult {
  score: number;
  perGap: boolean[];
}

/** Cada hueco acepta variantes válidas; el puntaje es la fracción de huecos correctos. */
export function scoreGapFill(answers: string[], accepted: string[][]): GapFillResult {
  const perGap = accepted.map((options, index) => {
    const answer = normalizeAnswer(answers[index] ?? '');
    return options.some((option) => normalizeAnswer(option) === answer);
  });
  const score = perGap.length === 0 ? 0 : perGap.filter(Boolean).length / perGap.length;
  return { score, perGap };
}

export interface WritingRubricSpec {
  minWords: number;
  /** Elementos requeridos por la tarea (saludo, fecha, petición, cierre...). */
  requiredElements: string[];
}

export interface WritingHeuristicResult {
  dimensionScores: Record<string, number>;
  score: number;
  /** Baja a propósito: el heurístico local jamás es autoridad final (Regla constitucional). */
  confidence: number;
  wordCount: number;
  missingElements: string[];
}

/** Confianza fija del heurístico local: siempre insuficiente para alta consecuencia. */
export const WRITING_HEURISTIC_CONFIDENCE = 0.35;

/**
 * Scorer heurístico provisional de Writing para práctica de baja consecuencia.
 * Produce dimensiones y confianza baja; las decisiones significativas requieren
 * scorer versionado + revisión humana (Especificación §13.3, Stack §1.3).
 */
export function scoreWritingHeuristic(text: string, spec: WritingRubricSpec): WritingHeuristicResult {
  const cleaned = text.trim();
  const words = cleaned.length === 0 ? [] : cleaned.split(/\s+/);
  const wordCount = words.length;

  const lower = cleaned.toLowerCase();
  const missingElements = spec.requiredElements.filter(
    (element) => !lower.includes(element.toLowerCase()),
  );

  const taskCompletion =
    spec.requiredElements.length === 0
      ? 1
      : (spec.requiredElements.length - missingElements.length) / spec.requiredElements.length;

  const lengthRatio = spec.minWords === 0 ? 1 : Math.min(1, wordCount / spec.minWords);

  const sentences = cleaned.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  const organization = Math.min(1, sentences.length / 3) * lengthRatio;

  const uniqueWords = new Set(words.map((w) => w.toLowerCase()));
  const languageRange =
    wordCount === 0 ? 0 : Math.min(1, (uniqueWords.size / wordCount) * 1.5) * lengthRatio;

  const dimensionScores = {
    task_completion: round2(taskCompletion),
    organization: round2(organization),
    language_range: round2(languageRange),
  };
  const score = round2(
    (dimensionScores.task_completion + dimensionScores.organization + dimensionScores.language_range) / 3,
  );

  return {
    dimensionScores,
    score,
    confidence: WRITING_HEURISTIC_CONFIDENCE,
    wordCount,
    missingElements,
  };
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
