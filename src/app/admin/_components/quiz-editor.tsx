"use client";

import { useState } from "react";
import { saveQuiz } from "../_actions/quiz";
import { useAdminAction } from "./feedback";

type Option = { key: string; id?: string; text: string; isCorrect: boolean };
type Question = { key: string; id?: string; prompt: string; explanation: string; options: Option[] };

let seq = 0;
const k = () => `n${++seq}`;
const blankQuestion = (): Question => ({
  key: k(),
  prompt: "",
  explanation: "",
  options: [
    { key: k(), text: "", isCorrect: true },
    { key: k(), text: "", isCorrect: false },
    { key: k(), text: "", isCorrect: false },
  ],
});

export function QuizEditor({
  lessonId,
  initial,
}: {
  lessonId: string;
  initial: { id: string; prompt: string; explanation: string; options: { id: string; text: string; isCorrect: boolean }[] }[];
}) {
  const { run, pending } = useAdminAction();
  const [questions, setQuestions] = useState<Question[]>(() =>
    initial.map((q) => ({ ...q, key: q.id, options: q.options.map((o) => ({ ...o, key: o.id })) })),
  );
  const [dirty, setDirty] = useState(false);

  const update = (fn: (qs: Question[]) => Question[]) => {
    setQuestions(fn);
    setDirty(true);
  };
  const setQ = (qi: number, patch: Partial<Question>) => update((qs) => qs.map((q, i) => (i === qi ? { ...q, ...patch } : q)));
  const move = (qi: number, d: -1 | 1) =>
    update((qs) => {
      const next = [...qs];
      [next[qi], next[qi + d]] = [next[qi + d], next[qi]];
      return next;
    });

  async function onSave() {
    const ok = await run(
      () =>
        saveQuiz({
          lessonId,
          questions: questions.map((q) => ({
            id: q.id,
            prompt: q.prompt,
            explanation: q.explanation,
            options: q.options.map((o) => ({ id: o.id, text: o.text, isCorrect: o.isCorrect })),
          })),
        }),
      questions.length ? "Quiz guardado." : "Quiz eliminado de la lección.",
    );
    if (ok) setDirty(false);
  }

  return (
    <div className="space-y-5">
      {questions.length === 0 && (
        <div className="glass p-6 text-sm text-muted">Esta lección no tiene preguntas. Añade la primera.</div>
      )}

      {questions.map((q, qi) => (
        <fieldset key={q.key} className="glass space-y-4 p-5 sm:p-6">
          <legend className="sr-only">Pregunta {qi + 1}</legend>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg">Pregunta {qi + 1}</h2>
            <div className="flex gap-1">
              <button type="button" className="btn btn-sm text-muted hover:text-white" disabled={qi === 0} onClick={() => move(qi, -1)}>
                Subir
              </button>
              <button type="button" className="btn btn-sm text-muted hover:text-white" disabled={qi === questions.length - 1} onClick={() => move(qi, 1)}>
                Bajar
              </button>
              <button type="button" className="btn btn-sm text-danger hover:bg-danger/10" onClick={() => update((qs) => qs.filter((_, i) => i !== qi))}>
                Quitar
              </button>
            </div>
          </div>

          <label className="block space-y-1.5">
            <span className="pl-1 text-sm text-muted">Enunciado</span>
            <textarea className="field min-h-16 rounded-3xl py-3" maxLength={500} value={q.prompt} onChange={(e) => setQ(qi, { prompt: e.target.value })} />
          </label>

          <div className="space-y-2" role="radiogroup" aria-label={`Respuestas de la pregunta ${qi + 1}`}>
            <p className="pl-1 text-sm text-muted">Respuestas (marca la correcta)</p>
            {q.options.map((o, oi) => (
              <div key={o.key} className="flex items-center gap-2">
                <input
                  type="radio"
                  name={`correcta-${q.key}`}
                  aria-label={`Respuesta ${oi + 1} es la correcta`}
                  checked={o.isCorrect}
                  onChange={() => setQ(qi, { options: q.options.map((x, i) => ({ ...x, isCorrect: i === oi })) })}
                  className="size-4 shrink-0 accent-[var(--accent)]"
                />
                <label className="sr-only" htmlFor={`op-${o.key}`}>Texto de la respuesta {oi + 1}</label>
                <input
                  id={`op-${o.key}`}
                  className={`field py-2 ${o.isCorrect ? "border-accent/60" : ""}`}
                  maxLength={300}
                  value={o.text}
                  onChange={(e) => setQ(qi, { options: q.options.map((x, i) => (i === oi ? { ...x, text: e.target.value } : x)) })}
                />
                <button
                  type="button"
                  aria-label={`Quitar la respuesta ${oi + 1}`}
                  disabled={q.options.length <= 2}
                  className="grid size-8 shrink-0 place-items-center rounded-full text-muted hover:bg-white/10 hover:text-white disabled:opacity-30"
                  onClick={() => {
                    const rest = q.options.filter((_, i) => i !== oi);
                    if (o.isCorrect && rest.length) rest[0] = { ...rest[0], isCorrect: true };
                    setQ(qi, { options: rest });
                  }}
                >
                  ×
                </button>
              </div>
            ))}
            {q.options.length < 6 && (
              <button
                type="button"
                className="btn btn-sm text-muted hover:text-white"
                onClick={() => setQ(qi, { options: [...q.options, { key: k(), text: "", isCorrect: false }] })}
              >
                Añadir respuesta
              </button>
            )}
          </div>

          <label className="block space-y-1.5">
            <span className="pl-1 text-sm text-muted">Explicación (se muestra al responder)</span>
            <textarea className="field min-h-16 rounded-3xl py-3" maxLength={1000} value={q.explanation} onChange={(e) => setQ(qi, { explanation: e.target.value })} />
          </label>
        </fieldset>
      ))}

      <div className="glass glass-strong sticky bottom-4 z-10 flex flex-wrap items-center justify-between gap-3 p-3 pl-5">
        <span className="text-sm text-muted">
          {dirty ? "Tienes cambios sin guardar." : `${questions.length} pregunta${questions.length === 1 ? "" : "s"}.`}
        </span>
        <div className="flex gap-2">
          {questions.length < 20 && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => update((qs) => [...qs, blankQuestion()])}>
              Añadir pregunta
            </button>
          )}
          <button type="button" disabled={pending || !dirty} className="btn btn-primary btn-sm" onClick={onSave}>
            {pending ? "Guardando…" : "Guardar quiz"}
          </button>
        </div>
      </div>
    </div>
  );
}
