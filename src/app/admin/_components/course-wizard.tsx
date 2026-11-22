"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { createCourseWithContent } from "../_actions/courses";
import { parsePrice, publishIssues, slugify } from "@/lib/admin/rules";
import { formatDuration, formatPrice } from "@/lib/format";
import { useAdminAction, useToast } from "./feedback";
import { DragHandle, SortableList } from "./sortable";

type Lesson = { id: string; title: string; videoKey: string; duration: string };
type Mod = { id: string; title: string; lessons: Lesson[] };

let seq = 0;
const uid = () => `n${++seq}`;

/** "12:34", "1:02:03" o "754" → segundos. */
export function parseDuration(text: string): number | null | "invalid" {
  const t = text.trim();
  if (!t) return null;
  if (/^\d+$/.test(t)) return Number(t) || "invalid";
  const parts = t.split(":").map(Number);
  if (parts.some((p) => !Number.isInteger(p) || p < 0) || parts.length > 3) return "invalid";
  const secs = parts.reduce((acc, p) => acc * 60 + p, 0);
  return secs > 0 ? secs : "invalid";
}

const steps = ["Datos del curso", "Temario", "Revisar y crear"];

export function CourseWizard() {
  const router = useRouter();
  const toast = useToast();
  const { run, pending } = useAdminAction();
  const [step, setStep] = useState(0);

  // Paso 1
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState<"eur" | "usd">("eur");
  const [inSub, setInSub] = useState(true);
  const [teacherEmail, setTeacherEmail] = useState("");

  // Paso 2
  const [mods, setMods] = useState<Mod[]>([{ id: uid(), title: "Módulo 1", lessons: [] }]);

  const priceCents = parsePrice(price);
  const lessonsFlat = mods.flatMap((m) => m.lessons);
  const durations = lessonsFlat.map((l) => parseDuration(l.duration));
  const issues = useMemo(
    () =>
      priceCents === "invalid"
        ? ["El precio no es válido."]
        : publishIssues({
            priceCents,
            lessons: lessonsFlat.map((l, i) => ({
              title: l.title,
              videoKey: l.videoKey.trim() || "TODO",
              durationSeconds: typeof durations[i] === "number" ? (durations[i] as number) : null,
            })),
          }),
    [priceCents, lessonsFlat, durations],
  );

  function validateStep(i: number): string | null {
    if (i === 0) {
      if (title.trim().length < 2) return "Escribe el título del curso.";
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length < 2) return "La dirección web solo puede tener minúsculas, números y guiones.";
      if (description.trim().length < 10) return "Escribe una descripción de al menos 10 caracteres: es lo que verán los alumnos.";
      if (priceCents === "invalid") return "Escribe el precio en euros, por ejemplo 49 o 49,90 (o déjalo vacío).";
    }
    if (i === 1) {
      if (mods.some((m) => m.title.trim().length < 2)) return "Todos los módulos necesitan un título.";
      if (lessonsFlat.some((l) => l.title.trim().length < 2)) return "Todas las lecciones necesitan un título.";
      if (durations.some((d) => d === "invalid")) return "Hay una duración mal escrita. Usa minutos:segundos, por ejemplo 12:34.";
    }
    return null;
  }

  function go(to: number) {
    for (let i = 0; i < to; i++) {
      const err = validateStep(i);
      if (err) {
        setStep(i);
        toast({ tone: "error", text: err });
        return;
      }
    }
    setStep(to);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submit(publish: boolean) {
    for (let i = 0; i < 2; i++) {
      const err = validateStep(i);
      if (err) return go(i);
    }
    await run(
      () =>
        createCourseWithContent({
          title,
          slug,
          description,
          priceCents: priceCents === "invalid" ? null : priceCents,
          currency,
          includedInSubscription: inSub,
          teacherEmail,
          publish,
          modules: mods.map((m) => ({
            title: m.title,
            lessons: m.lessons.map((l) => ({
              title: l.title,
              videoKey: l.videoKey.trim() || "TODO",
              durationSeconds: ((): number | null => {
                const d = parseDuration(l.duration);
                return typeof d === "number" ? d : null;
              })(),
            })),
          })),
        }),
      publish ? "Curso creado y publicado." : "Curso creado como borrador.",
      (d) => router.push(`/admin/cursos/${d.id}`),
    );
  }

  return (
    <div className="space-y-6">
      {/* Pasos */}
      <ol className="grid grid-cols-3 gap-2">
        {steps.map((s, i) => {
          const done = i < step;
          const current = i === step;
          return (
            <li key={s}>
              <button
                type="button"
                onClick={() => (i < step ? setStep(i) : go(i))}
                aria-current={current ? "step" : undefined}
                className={`flex w-full items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left text-sm transition-colors ${
                  current ? "border-[#1d4ed8] bg-white shadow-sm" : "border-[#e1e7f0] bg-white/60 hover:bg-white"
                }`}
              >
                <span
                  className={`grid size-7 shrink-0 place-items-center rounded-full text-xs font-semibold ${
                    done ? "bg-[#0f9488] text-white" : current ? "bg-[#1d4ed8] text-white" : "bg-[#e8edf5] text-[#52617a]"
                  }`}
                >
                  {done ? "✓" : i + 1}
                </span>
                <span className={`hidden sm:inline ${current ? "font-medium" : "a-muted"}`}>{s}</span>
              </button>
            </li>
          );
        })}
      </ol>

      {step === 0 && (
        <div className="a-card space-y-5 p-5 sm:p-7">
          <div>
            <h2 className="text-lg font-semibold">Datos del curso</h2>
            <p className="text-sm a-muted">Lo que verán los alumnos en el catálogo. Podrás cambiarlo cuando quieras.</p>
          </div>
          <label className="block">
            <span className="a-label">Título</span>
            <input
              className="a-input text-base"
              placeholder="Por ejemplo: Marketing digital desde cero"
              maxLength={160}
              value={title}
              autoFocus
              onChange={(e) => {
                setTitle(e.target.value);
                if (!slugEdited) setSlug(slugify(e.target.value));
              }}
            />
            <span className="a-help">
              Dirección: <span className="font-mono">/cursos/{slug || "…"}</span>{" "}
              <button type="button" className="text-[#1d4ed8] underline" onClick={() => setSlugEdited(true)}>
                Cambiar
              </button>
            </span>
          </label>
          {slugEdited && (
            <label className="block">
              <span className="a-label">Dirección web</span>
              <input className="a-input font-mono text-sm" value={slug} maxLength={80} onChange={(e) => setSlug(e.target.value.toLowerCase())} />
              <span className="a-help">Solo minúsculas, números y guiones.</span>
            </label>
          )}
          <label className="block">
            <span className="a-label">Descripción</span>
            <textarea
              className="a-input min-h-28"
              placeholder="Qué aprenderá el alumno y para quién es el curso."
              maxLength={2000}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>
          <div className="grid gap-5 sm:grid-cols-[1fr_auto_1.4fr]">
            <label className="block">
              <span className="a-label">Precio</span>
              <input className="a-input" inputMode="decimal" placeholder="49,90" value={price} onChange={(e) => setPrice(e.target.value)} />
              <span className="a-help">Puedes dejarlo vacío y ponerlo antes de publicar.</span>
            </label>
            <label className="block">
              <span className="a-label">Moneda</span>
              <select className="a-input pr-8" value={currency} onChange={(e) => setCurrency(e.target.value as "eur" | "usd")}>
                <option value="eur">EUR</option>
                <option value="usd">USD</option>
              </select>
            </label>
            <label className="block">
              <span className="a-label">Profesor (opcional)</span>
              <input className="a-input" type="email" placeholder="Email del profesor" value={teacherEmail} onChange={(e) => setTeacherEmail(e.target.value)} />
              <span className="a-help">Tiene que tener cuenta. Si no, invítale desde Usuarios.</span>
            </label>
          </div>
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#e1e7f0] p-4">
            <input type="checkbox" className="mt-0.5 size-4 accent-[#1d4ed8]" checked={inSub} onChange={(e) => setInSub(e.target.checked)} />
            <span className="text-sm">
              <span className="block font-medium">Incluido en la suscripción</span>
              <span className="a-muted">Los suscriptores podrán verlo sin comprarlo aparte.</span>
            </span>
          </label>
        </div>
      )}

      {step === 1 && <SyllabusBuilder mods={mods} setMods={setMods} slug={slug} />}

      {step === 2 && (
        <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
          <div className="a-card space-y-4 p-5 sm:p-7">
            <div>
              <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
              <p className="mt-1 text-sm a-muted">{description}</p>
            </div>
            <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <div><dt className="text-xs a-subtle">Precio</dt><dd className="font-medium">{formatPrice(priceCents === "invalid" ? null : priceCents, currency)}</dd></div>
              <div><dt className="text-xs a-subtle">Suscripción</dt><dd className="font-medium">{inSub ? "Incluido" : "No incluido"}</dd></div>
              <div><dt className="text-xs a-subtle">Módulos</dt><dd className="font-medium">{mods.length}</dd></div>
              <div><dt className="text-xs a-subtle">Lecciones</dt><dd className="font-medium">{lessonsFlat.length}</dd></div>
            </dl>
            <ol className="space-y-3 border-t border-[#e1e7f0] pt-4">
              {mods.map((m, mi) => (
                <li key={m.id}>
                  <p className="text-sm font-medium">{mi + 1}. {m.title}</p>
                  <ul className="mt-1 space-y-0.5 pl-5 text-sm a-muted">
                    {m.lessons.length === 0 && <li className="italic">Sin lecciones</li>}
                    {m.lessons.map((l) => {
                      const d = parseDuration(l.duration);
                      return (
                        <li key={l.id} className="flex justify-between gap-3">
                          <span>{l.title}</span>
                          <span className="shrink-0 text-xs">{!l.videoKey.trim() ? "Sin vídeo" : typeof d === "number" ? formatDuration(d) : ""}</span>
                        </li>
                      );
                    })}
                  </ul>
                </li>
              ))}
            </ol>
          </div>
          <div className="space-y-4">
            <div className={`a-card p-5 ${issues.length ? "border-amber-200" : "border-teal-200"}`}>
              {issues.length === 0 ? (
                <>
                  <p className="font-medium text-[#0f766e]">Listo para publicar</p>
                  <p className="mt-1 text-sm a-muted">Tiene precio, lecciones y todos los vídeos.</p>
                </>
              ) : (
                <>
                  <p className="font-medium text-[#92400e]">Se puede crear, pero aún no publicar</p>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm a-muted">
                    {issues.map((i) => <li key={i}>{i}</li>)}
                  </ul>
                  <p className="mt-2 text-sm a-muted">Créalo como borrador y complétalo después.</p>
                </>
              )}
            </div>
            <div className="a-card space-y-2 p-5">
              <button type="button" disabled={pending || issues.length > 0} onClick={() => submit(true)} className="a-btn a-btn-primary w-full">
                Crear y publicar
              </button>
              <button type="button" disabled={pending} onClick={() => submit(false)} className="a-btn a-btn-secondary w-full">
                {pending ? "Creando…" : "Guardar como borrador"}
              </button>
              <p className="pt-1 text-xs a-subtle">Después podrás añadir los quizzes de cada lección desde el editor del curso.</p>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between gap-3">
        {step > 0 ? (
          <button type="button" className="a-btn a-btn-secondary" onClick={() => setStep(step - 1)}>Atrás</button>
        ) : (
          <span />
        )}
        {step < 2 && (
          <button type="button" className="a-btn a-btn-primary" onClick={() => go(step + 1)}>
            {step === 0 ? "Siguiente: temario" : "Siguiente: revisar"}
          </button>
        )}
      </div>
    </div>
  );
}

function SyllabusBuilder({ mods, setMods, slug }: { mods: Mod[]; setMods: (fn: (m: Mod[]) => Mod[]) => void; slug: string }) {
  const [bulkFor, setBulkFor] = useState<string | null>(null);
  const [bulk, setBulk] = useState("");
  const setMod = (id: string, patch: Partial<Mod>) => setMods((ms) => ms.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  const setLesson = (mid: string, lid: string, patch: Partial<Lesson>) =>
    setMods((ms) => ms.map((m) => (m.id === mid ? { ...m, lessons: m.lessons.map((l) => (l.id === lid ? { ...l, ...patch } : l)) } : m)));

  return (
    <div className="space-y-4">
      <div className="a-card flex flex-wrap items-center justify-between gap-3 p-5">
        <div>
          <h2 className="text-lg font-semibold">Temario</h2>
          <p className="text-sm a-muted">Arrastra los módulos y las lecciones para ordenarlos. Los vídeos los puedes añadir ahora o más tarde.</p>
        </div>
        <button type="button" className="a-btn a-btn-secondary" onClick={() => setMods((ms) => [...ms, { id: uid(), title: `Módulo ${ms.length + 1}`, lessons: [] }])}>
          Añadir módulo
        </button>
      </div>

      <SortableList items={mods} onReorder={(next) => setMods(() => next)} className="space-y-4" label="módulos">
        {(m, handle, mi) => (
          <div className="a-card overflow-hidden">
            <div className="flex items-center gap-2 border-b border-[#e1e7f0] bg-[#f8fafd] px-3 py-2.5">
              <DragHandle label={`Mover el módulo ${m.title}`} {...handle} />
              <span className="text-sm a-subtle">{mi + 1}.</span>
              <label className="sr-only" htmlFor={`m-${m.id}`}>Título del módulo {mi + 1}</label>
              <input id={`m-${m.id}`} className="a-input flex-1 border-transparent bg-transparent py-1.5 font-medium hover:border-[#cbd5e3]" value={m.title} maxLength={160} onChange={(e) => setMod(m.id, { title: e.target.value })} />
              <button
                type="button"
                className="a-btn a-btn-danger-soft a-btn-sm"
                disabled={mods.length === 1}
                onClick={() => setMods((ms) => ms.filter((x) => x.id !== m.id))}
              >
                Quitar
              </button>
            </div>
            <div className="space-y-2 p-3">
              {m.lessons.length > 0 && (
                <div className="hidden grid-cols-[2rem_minmax(0,1.4fr)_minmax(0,1.4fr)_6rem_2rem] gap-2 px-1 text-xs a-subtle md:grid">
                  <span /><span>Lección</span><span>Vídeo en R2 (opcional)</span><span>Duración</span><span />
                </div>
              )}
              <SortableList items={m.lessons} onReorder={(next) => setMod(m.id, { lessons: next })} className="space-y-2" label={`lecciones de ${m.title}`}>
                {(l, h, li) => (
                  <div className="grid grid-cols-[2rem_minmax(0,1fr)_2rem] items-center gap-2 rounded-xl border border-[#e1e7f0] bg-white p-1.5 md:grid-cols-[2rem_minmax(0,1.4fr)_minmax(0,1.4fr)_6rem_2rem]">
                    <DragHandle label={`Mover la lección ${l.title || li + 1}`} {...h} />
                    <input aria-label={`Título de la lección ${li + 1}`} className="a-input py-1.5" placeholder="Título de la lección" value={l.title} maxLength={160} onChange={(e) => setLesson(m.id, l.id, { title: e.target.value })} />
                    <button type="button" aria-label="Quitar lección" className="row-span-2 grid size-8 place-items-center rounded-lg text-[#8492a8] hover:bg-red-50 hover:text-red-700 md:order-last md:row-span-1" onClick={() => setMod(m.id, { lessons: m.lessons.filter((x) => x.id !== l.id) })}>
                      ×
                    </button>
                    <input aria-label="Vídeo en R2" className="a-input col-start-2 py-1.5 font-mono text-xs md:col-start-auto" placeholder={`cursos/${slug || "curso"}/leccion/index.m3u8`} value={l.videoKey} onChange={(e) => setLesson(m.id, l.id, { videoKey: e.target.value })} />
                    <input aria-label="Duración" className="a-input col-start-2 py-1.5 md:col-start-auto" placeholder="12:34" inputMode="numeric" value={l.duration} onChange={(e) => setLesson(m.id, l.id, { duration: e.target.value })} />
                  </div>
                )}
              </SortableList>
              <div className="flex flex-wrap gap-2 pt-1">
                <button type="button" className="a-btn a-btn-ghost a-btn-sm" onClick={() => setMod(m.id, { lessons: [...m.lessons, { id: uid(), title: "", videoKey: "", duration: "" }] })}>
                  Añadir lección
                </button>
                <button type="button" className="a-btn a-btn-ghost a-btn-sm" onClick={() => { setBulkFor(m.id); setBulk(""); }}>
                  Pegar varias
                </button>
              </div>
              {bulkFor === m.id && (
                <div className="space-y-2 rounded-xl border border-dashed border-[#cbd5e3] p-3">
                  <label className="block">
                    <span className="a-label">Pega los títulos, uno por línea</span>
                    <textarea className="a-input min-h-28" value={bulk} onChange={(e) => setBulk(e.target.value)} autoFocus placeholder={"Introducción\nPrimeros pasos\nCaso práctico"} />
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="a-btn a-btn-primary a-btn-sm"
                      onClick={() => {
                        const titles = bulk.split("\n").map((t) => t.trim()).filter(Boolean).slice(0, 200);
                        setMod(m.id, { lessons: [...m.lessons, ...titles.map((t) => ({ id: uid(), title: t, videoKey: "", duration: "" }))] });
                        setBulkFor(null);
                      }}
                    >
                      Añadir {bulk.split("\n").filter((t) => t.trim()).length || ""} lecciones
                    </button>
                    <button type="button" className="a-btn a-btn-secondary a-btn-sm" onClick={() => setBulkFor(null)}>Cancelar</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </SortableList>
    </div>
  );
}
