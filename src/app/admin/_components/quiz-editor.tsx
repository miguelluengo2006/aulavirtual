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
        <div className="a-card p-6 text-sm a-muted">Esta lección aún no tiene quiz. Añade la primera pregunta con el botón de abajo.</div>
      )}

      {questions.map((q, qi) => (
        <fieldset key={q.key} className="a-card space-y-4 p-5 sm:p-6">
          <legend className="sr-only">Pregunta {qi + 1}</legend>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-semibold">Pregunta {qi + 1}</h2>
            <div className="flex gap-1">
              <button type="button" className="a-btn a-btn-ghost a-btn-sm" disabled={qi === 0} onClick={() => move(qi, -1)}>
                Subir
              </button>
              <button type="button" className="a-btn a-btn-ghost a-btn-sm" disabled={qi === questions.length - 1} onClick={() => move(qi, 1)}>
                Bajar
              </button>
              <button type="button" className="a-btn a-btn-danger-soft a-btn-sm" onClick={() => update((qs) => qs.filter((_, i) => i !== qi))}>
                Quitar
              </button>
            </div>
          </div>

          <label className="block space-y-1.5">
            <span className="a-label">Enunciado</span>
            <textarea className="a-input min-h-16" maxLength={500} value={q.prompt} onChange={(e) => setQ(qi, { prompt: e.target.value })} />
          </label>

          <div className="space-y-2" role="radiogroup" aria-label={`Respuestas de la pregunta ${qi + 1}`}>
            <p className="a-label">Respuestas (marca la correcta)</p>
            {q.options.map((o, oi) => (
              <div key={o.key} className="flex items-center gap-2">
                <input
                  type="radio"
                  name={`correcta-${q.key}`}
                  aria-label={`Respuesta ${oi + 1} es la correcta`}
                  checked={o.isCorrect}
                  onChange={() => setQ(qi, { options: q.options.map((x, i) => ({ ...x, isCorrect: i === oi })) })}
                  className="size-4 shrink-0 accent-[#0d9488]"
                />
                <label className="sr-only" htmlFor={`op-${o.key}`}>Texto de la respuesta {oi + 1}</label>
                <input
                  id={`op-${o.key}`}
                  className={`a-input py-2 ${o.isCorrect ? "border-teal-400 bg-teal-50/50" : ""}`}
                  maxLength={300}
                  value={o.text}
                  onChange={(e) => setQ(qi, { options: q.options.map((x, i) => (i === oi ? { ...x, text: e.target.value } : x)) })}
                />
                <button
                  type="button"
                  aria-label={`Quitar la respuesta ${oi + 1}`}
                  disabled={q.options.length <= 2}
                  className="grid size-8 shrink-0 place-items-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-30"
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
                className="a-btn a-btn-ghost a-btn-sm"
                onClick={() => setQ(qi, { options: [...q.options, { key: k(), text: "", isCorrect: false }] })}
              >
                Añadir respuesta
              </button>
            )}
          </div>

          <label className="block space-y-1.5">
            <span className="a-label">Explicación (se muestra al responder)</span>
            <textarea className="a-input min-h-16" maxLength={1000} value={q.explanation} onChange={(e) => setQ(qi, { explanation: e.target.value })} />
          </label>
        </fieldset>
      ))}

      <div className="a-card sticky bottom-4 z-10 flex flex-wrap items-center justify-between gap-3 p-3 pl-5 shadow-lg">
        <span className={`text-sm ${dirty ? "text-amber-700" : "a-muted"}`}>
          {dirty ? "Tienes cambios sin guardar." : `${questions.length} pregunta${questions.length === 1 ? "" : "s"}.`}
        </span>
        <div className="flex gap-2">
          {questions.length < 20 && (
            <button type="button" className="a-btn a-btn-secondary a-btn-sm" onClick={() => update((qs) => [...qs, blankQuestion()])}>
              Añadir pregunta
            </button>
          )}
          <button type="button" disabled={pending || !dirty} className="a-btn a-btn-primary a-btn-sm" onClick={onSave}>
            {pending ? "Guardando…" : "Guardar quiz"}
          </button>
        </div>
      </div>
    </div>
  );
}
