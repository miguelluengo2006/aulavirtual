// Corrección de quizzes. Función pura, con tests.

export type QuizKey = {
  id: string;
  explanation: string;
  options: { id: string; isCorrect: boolean }[];
}[];

export type QuizResult = {
  score: number;
  total: number;
  questions: {
    questionId: string;
    chosenOptionId: string | null;
    correctOptionId: string;
    isCorrect: boolean;
    explanation: string;
  }[];
};

export function gradeQuiz(key: QuizKey, answers: Record<string, string>): QuizResult {
  const results = key.map((q) => {
    const correct = q.options.find((o) => o.isCorrect)!;
    const chosen = answers[q.id];
    // Solo cuentan opciones que pertenecen de verdad a esa pregunta.
    const chosenOptionId = q.options.some((o) => o.id === chosen) ? chosen : null;
    return {
      questionId: q.id,
      chosenOptionId,
      correctOptionId: correct.id,
      isCorrect: chosenOptionId === correct.id,
      explanation: q.explanation,
    };
  });
  return {
    score: results.filter((r) => r.isCorrect).length,
    total: results.length,
    questions: results,
  };
}

// ─── Banco de preguntas ───────────────────────────────────────

/** Preguntas que ve el alumno en cada intento (si el banco tiene menos, todas). */
export const QUIZ_DRAW = 5;

export function questionsPerAttempt(poolSize: number): number {
  return Math.min(QUIZ_DRAW, poolSize);
}

/** Baraja una copia (Fisher-Yates). `random` se puede inyectar en los tests. */
export function shuffle<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Elige las preguntas de un intento: primero las que el alumno NO vio la última
 * vez (en orden aleatorio) y, si no llegan, completa con las ya vistas.
 * Así dos intentos seguidos no repiten preguntas mientras el banco dé para ello.
 */
export function drawQuestions<T extends { id: string }>(
  pool: readonly T[],
  recentlySeen: ReadonlySet<string>,
  random: () => number = Math.random,
): T[] {
  const n = questionsPerAttempt(pool.length);
  const fresh = shuffle(pool.filter((q) => !recentlySeen.has(q.id)), random);
  const seen = shuffle(pool.filter((q) => recentlySeen.has(q.id)), random);
  return [...fresh, ...seen].slice(0, n);
}

/**
 * Comprueba las preguntas que el alumno dice haber recibido: deben ser del quiz,
 * sin repetir y exactamente las que toca por intento (no se pueden elegir menos).
 */
export function validDrawnIds(drawn: readonly string[], poolIds: readonly string[]): boolean {
  const pool = new Set(poolIds);
  return (
    drawn.length === questionsPerAttempt(poolIds.length) &&
    new Set(drawn).size === drawn.length &&
    drawn.every((id) => pool.has(id))
  );
}
