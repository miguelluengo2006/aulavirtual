"use client";

import { useState } from "react";

// Demo de la portada: una lección de muestra con su pregunta clave.
// La pregunta explica el propio producto, así que la respuesta es verdad.
const options = [
  { id: "a", text: "Tienes que repetir la lección entera" },
  { id: "b", text: "Ves la explicación y sigues avanzando", correct: true },
  { id: "c", text: "Pierdes el progreso del curso" },
];

export function HeroDemo() {
  const [chosen, setChosen] = useState<string | null>(null);
  const answered = chosen !== null;
  const right = options.find((o) => o.id === chosen)?.correct;

  return (
    <div className="glass space-y-4 p-4 sm:p-5">
      {/* Reproductor de muestra */}
      <div className="relative aspect-video overflow-hidden rounded-2xl bg-[radial-gradient(120%_120%_at_20%_10%,#1d4ed8_0%,#0b2a5c_45%,#061430_100%)]">
        <div className="absolute inset-0 bg-[radial-gradient(60%_60%_at_80%_90%,rgb(45_212_191/0.35),transparent_70%)]" />
        <div className="absolute left-4 top-4 space-y-1">
          <p className="text-xs text-white/70">Lección 3 de 12</p>
          <p className="font-medium">Cómo se estudia en Aula Virtual</p>
        </div>
        <div className="absolute inset-0 grid place-items-center">
          <span className="grid size-14 place-items-center rounded-full bg-white/90 text-navy shadow-lg">
            <svg viewBox="0 0 24 24" className="ml-1 size-6" fill="currentColor" aria-hidden>
              <path d="M7 4.5v15l13-7.5z" />
            </svg>
          </span>
        </div>
        <div className="absolute inset-x-4 bottom-4 space-y-1.5">
          <div className="flex justify-between text-xs text-white/70">
            <span>7:42</span>
            <span>12:05</span>
          </div>
          <div className="progress-track">
            <div className="progress-bar" style={{ width: "64%" }} />
          </div>
        </div>
      </div>

      {/* Pregunta clave de muestra */}
      <div className="inset space-y-3 p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium">Pregunta clave</p>
          <span className="chip">Pruébala</span>
        </div>
        <p>¿Qué pasa si fallas una pregunta clave?</p>
        <div className="space-y-2" role="radiogroup" aria-label="Respuestas">
          {options.map((o) => {
            const isChosen = chosen === o.id;
            let style = "border-white/12 hover:border-white/35 hover:bg-white/5";
            if (answered) {
              if (o.correct) style = "border-accent/70 bg-accent/12";
              else if (isChosen) style = "border-danger/70 bg-danger/12";
              else style = "border-white/8 opacity-50";
            }
            return (
              <button
                key={o.id}
                type="button"
                role="radio"
                aria-checked={isChosen}
                disabled={answered}
                onClick={() => setChosen(o.id)}
                className={`w-full rounded-2xl border px-4 py-2.5 text-left text-sm transition-colors ${style}`}
              >
                {o.text}
              </button>
            );
          })}
        </div>
        <div aria-live="polite" className="min-h-10 text-sm">
          {answered ? (
            <p>
              <span className={right ? "text-accent" : "text-danger"}>
                {right ? "Correcto. " : "No es así. "}
              </span>
              <span className="text-muted">
                Las preguntas clave son de repaso: no bloquean nada, te explican la respuesta y te
                ayudan a fijar lo importante.{" "}
              </span>
              <button type="button" onClick={() => setChosen(null)} className="link">
                Otra vez
              </button>
            </p>
          ) : (
            <p className="text-subtle">Elige una respuesta.</p>
          )}
        </div>
      </div>
    </div>
  );
}
