"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { submitQuiz } from "@/app/(site)/cursos/[slug]/actions";
import type { QuizResult } from "@/lib/quiz";

type Quiz = {
  id: string;
  poolSize: number;
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
  const router = useRouter();

  const byQuestion = new Map(result?.questions.map((q) => [q.questionId, q]));
  const allAnswered = quiz.questions.every((q) => answers[q.id]);

  const onSubmit = () =>
    startTransition(async () => {
      setError(null);
      const r = await submitQuiz({ quizId: quiz.id, questionIds: quiz.questions.map((q) => q.id), answers });
      if (r.ok) setResult(r.result);
      else setError(r.error);
    });

  // Otro intento con preguntas nuevas: el servidor vuelve a sortearlas
  // evitando las que acaban de salir.
  const retry = () =>
    startTransition(() => {
      setAnswers({});
      setResult(null);
      router.refresh();
    });
  const morePool = quiz.poolSize > quiz.questions.length;

  return (
    <section id="quiz" className="glass scroll-mt-24 space-y-6 p-6 sm:p-8">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-2xl">Preguntas clave</h2>
          <p className="text-sm text-muted">
            Comprueba lo que has entendido del vídeo. No cuenta para avanzar.
            {morePool && ` Cada intento te saca ${quiz.questions.length} de ${quiz.poolSize} preguntas.`}
          </p>
        </div>
        {!result && lastAttempt && (
          <span className="chip">
            Último intento: {lastAttempt.score} de {lastAttempt.total}
          </span>
        )}
      </header>

      <ol className="space-y-7">
        {quiz.questions.map((q, qi) => {
          const r = byQuestion.get(q.id);
          return (
            <li key={q.id} className="space-y-2">
              <p className="font-medium">
                {qi + 1}. {q.prompt}
              </p>
              <div className="space-y-2">
                {q.options.map((o) => {
                  const chosen = answers[q.id] === o.id;
                  let style = "border-white/12 hover:border-white/35 hover:bg-white/5";
                  if (r) {
                    if (o.id === r.correctOptionId) style = "border-accent/70 bg-accent/12";
                    else if (chosen) style = "border-danger/70 bg-danger/12";
                    else style = "border-white/8 opacity-50";
                  } else if (chosen) {
                    style = "border-white bg-white/10";
                  }
                  return (
                    <label
                      key={o.id}
                      className={`flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 text-sm transition-colors has-[:disabled]:cursor-default ${style}`}
                    >
                      <input
                        type="radio"
                        name={q.id}
                        value={o.id}
                        checked={chosen}
                        disabled={Boolean(result) || pending}
                        onChange={() => setAnswers((a) => ({ ...a, [q.id]: o.id }))}
                        className="accent-white"
                      />
                      {o.text}
                    </label>
                  );
                })}
              </div>
              {r && (
                <p className="pl-1 text-sm">
                  <span className={r.isCorrect ? "text-accent" : "text-danger"}>
                    {r.isCorrect ? "Correcto. " : "No es correcto. "}
                  </span>
                  <span className="text-muted">{r.explanation}</span>
                </p>
              )}
            </li>
          );
        })}
      </ol>

      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}

      {result ? (
        <div className="inset flex flex-wrap items-center justify-between gap-3 px-5 py-4" aria-live="polite">
          <span className="font-medium">
            Has acertado {result.score} de {result.total}
          </span>
          <button type="button" onClick={retry} className="btn btn-ghost btn-sm">
            {morePool ? "Probar con otras preguntas" : "Volver a intentarlo"}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={onSubmit}
          disabled={!allAnswered || pending}
          className="btn btn-primary"
        >
          {pending ? "Corrigiendo…" : "Comprobar respuestas"}
        </button>
      )}
    </section>
  );
}
