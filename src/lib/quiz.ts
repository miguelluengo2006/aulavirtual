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
