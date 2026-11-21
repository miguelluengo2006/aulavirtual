"use client";

import { useState, useTransition } from "react";
import { submitQuiz } from "@/app/cursos/[slug]/actions";
import type { QuizResult } from "@/lib/quiz";

type Quiz = {
  id: string;
  questions: { id: string; prompt: string; options: { id: string; text: string }[] }[];
};

export function LessonQuiz({
  quiz,
  lastAttempt,
}: {
  quiz: Quiz;
  lastAttempt: { score: number; total: number } | null;
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<QuizResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const byQuestion = new Map(result?.questions.map((q) => [q.questionId, q]));
  const allAnswered = quiz.questions.every((q) => answers[q.id]);

  const onSubmit = () =>
    startTransition(async () => {
      setError(null);
      const r = await submitQuiz({ quizId: quiz.id, answers });
      if (r.ok) setResult(r.result);
      else setError(r.error);
    });

  const retry = () => {
    setAnswers({});
    setResult(null);
  };

  return (
    <section id="quiz" className="scroll-mt-20 space-y-4 rounded-lg border border-stone-200 bg-white p-5">
      <header className="flex items-baseline justify-between gap-4">
        <h2 className="text-lg font-semibold">Preguntas clave</h2>
        {!result && lastAttempt && (
          <span className="text-sm text-stone-500">
            Último intento: {lastAttempt.score}/{lastAttempt.total}
          </span>
        )}
      </header>
      <p className="text-sm text-stone-500">Repasa lo que acabas de ver. No cuenta para avanzar.</p>

      <ol className="space-y-5">
        {quiz.questions.map((q, qi) => {
          const r = byQuestion.get(q.id);
          return (
            <li key={q.id} className="space-y-2">
              <p className="font-medium">
                {qi + 1}. {q.prompt}
              </p>
              <div className="space-y-1">
                {q.options.map((o) => {
                  const chosen = answers[q.id] === o.id;
                  let style = "border-stone-200 hover:border-stone-400";
                  if (r) {
                    if (o.id === r.correctOptionId) style = "border-green-600 bg-green-50";
                    else if (chosen) style = "border-red-500 bg-red-50";
                    else style = "border-stone-200 opacity-60";
                  } else if (chosen) {
                    style = "border-stone-900 bg-stone-50";
                  }
                  return (
                    <label
                      key={o.id}
                      className={`flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2 text-sm ${style}`}
                    >
                      <input
                        type="radio"
                        name={q.id}
                        value={o.id}
                        checked={chosen}
                        disabled={Boolean(result) || pending}
                        onChange={() => setAnswers((a) => ({ ...a, [q.id]: o.id }))}
                      />
                      {o.text}
                    </label>
                  );
                })}
              </div>
              {r && (
                <p className={`text-sm ${r.isCorrect ? "text-green-700" : "text-red-700"}`}>
                  {r.isCorrect ? "¡Correcto! " : "No es correcto. "}
                  <span className="text-stone-600">{r.explanation}</span>
                </p>
              )}
            </li>
          );
        })}
      </ol>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {result ? (
        <div className="flex items-center justify-between rounded-md bg-stone-50 px-4 py-3">
          <span className="font-medium">
            Has acertado {result.score} de {result.total}
          </span>
          <button type="button" onClick={retry} className="text-sm underline">
            Volver a intentarlo
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={onSubmit}
          disabled={!allAnswered || pending}
          className="rounded-md bg-stone-900 px-4 py-2 text-sm text-white hover:bg-stone-700 disabled:opacity-40"
        >
          {pending ? "Corrigiendo…" : "Comprobar respuestas"}
        </button>
      )}
    </section>
  );
}
