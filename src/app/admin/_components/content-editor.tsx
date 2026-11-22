"use client";

import Link from "next/link";
import { useState } from "react";
import {
  createLesson,
  createModule,
  deleteLesson,
  deleteModule,
  moveLesson,
  moveModule,
  renameModule,
  updateLesson,
} from "../_actions/structure";
import { formatDuration } from "@/lib/format";
import { ConfirmButton, useAdminAction, useToast } from "./feedback";

type Lesson = {
  id: string;
  title: string;
  description: string | null;
  videoKey: string;
  durationSeconds: number | null;
  questionCount: number;
  progressCount: number;
};
type Module = { id: string; title: string; lessons: Lesson[] };

/** "12:34", "1:02:03" o "754" → segundos. */
function parseDuration(text: string): number | null | "invalid" {
  const t = text.trim();
  if (!t) return null;
  if (/^\d+$/.test(t)) return Number(t) || "invalid";
  const parts = t.split(":").map(Number);
  if (parts.some((p) => !Number.isInteger(p) || p < 0) || parts.length > 3) return "invalid";
  const secs = parts.reduce((acc, p) => acc * 60 + p, 0);
  return secs > 0 ? secs : "invalid";
}

function IconButton({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="grid size-8 place-items-center rounded-full text-muted hover:bg-white/10 hover:text-white disabled:opacity-30"
    >
      {children}
    </button>
  );
}

const Up = () => (
  <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
    <path d="m6 15 6-6 6 6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const Down = () => (
  <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
    <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export function ContentEditor({ courseId, courseSlug, modules }: { courseId: string; courseSlug: string; modules: Module[] }) {
  const { run, pending } = useAdminAction();
  const [newModule, setNewModule] = useState("");

  return (
    <div className="space-y-5">
      {modules.map((m, mi) => (
        <ModuleBlock
          key={m.id}
          courseId={courseId}
          courseSlug={courseSlug}
          module={m}
          index={mi}
          total={modules.length}
          allModules={modules.map((x) => ({ id: x.id, title: x.title }))}
        />
      ))}

      <form
        className="flex flex-col gap-2 sm:flex-row"
        onSubmit={async (e) => {
          e.preventDefault();
          if (await run(() => createModule({ courseId, title: newModule }), "Módulo añadido.")) setNewModule("");
        }}
      >
        <label className="sr-only" htmlFor="nuevo-modulo">
          Título del módulo nuevo
        </label>
        <input
          id="nuevo-modulo"
          className="field"
          placeholder="Título del módulo nuevo"
          value={newModule}
          required
          maxLength={160}
          onChange={(e) => setNewModule(e.target.value)}
        />
        <button disabled={pending} className="btn btn-ghost shrink-0">
          Añadir módulo
        </button>
      </form>
    </div>
  );
}

function ModuleBlock({
  courseId,
  courseSlug,
  module: m,
  index,
  total,
  allModules,
}: {
  courseId: string;
  courseSlug: string;
  module: Module;
  index: number;
  total: number;
  allModules: { id: string; title: string }[];
}) {
  const { run, pending } = useAdminAction();
  const [renaming, setRenaming] = useState(false);
  const [title, setTitle] = useState(m.title);
  const [adding, setAdding] = useState(false);

  return (
    <div className="inset space-y-3 p-3 sm:p-4">
      <div className="flex flex-wrap items-center gap-2">
        {renaming ? (
          <form
            className="flex flex-1 flex-wrap gap-2"
            onSubmit={async (e) => {
              e.preventDefault();
              if (await run(() => renameModule({ id: m.id, title }), "Módulo renombrado.")) setRenaming(false);
            }}
          >
            <label className="sr-only" htmlFor={`mod-${m.id}`}>Título del módulo</label>
            <input id={`mod-${m.id}`} className="field flex-1 py-2" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus required maxLength={160} />
            <button disabled={pending} className="btn btn-primary btn-sm">Guardar</button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setRenaming(false); setTitle(m.title); }}>Cancelar</button>
          </form>
        ) : (
          <>
            <h3 className="flex-1 font-medium">
              <span className="text-subtle">Módulo {index + 1}.</span> {m.title}
            </h3>
            <IconButton label={`Subir el módulo ${m.title}`} disabled={pending || index === 0} onClick={() => run(() => moveModule({ id: m.id, direction: "up" }))}>
              <Up />
            </IconButton>
            <IconButton label={`Bajar el módulo ${m.title}`} disabled={pending || index === total - 1} onClick={() => run(() => moveModule({ id: m.id, direction: "down" }))}>
              <Down />
            </IconButton>
            <button type="button" className="btn btn-sm text-muted hover:text-white" onClick={() => setRenaming(true)}>
              Renombrar
            </button>
            {m.lessons.length === 0 && (
              <ConfirmButton
                label="Eliminar"
                className="btn btn-sm text-danger hover:bg-danger/10"
                title={`¿Eliminar el módulo "${m.title}"?`}
                description={<p>Está vacío, así que no se pierde nada más.</p>}
                confirmLabel="Eliminar módulo"
                danger
                onConfirm={() => run(() => deleteModule({ id: m.id }), "Módulo eliminado.")}
              />
            )}
          </>
        )}
      </div>

      {m.lessons.length === 0 && !adding && <p className="px-1 text-sm text-subtle">Este módulo aún no tiene lecciones.</p>}

      <ol className="space-y-2">
        {m.lessons.map((l, li) => (
          <LessonRow
            key={l.id}
            courseId={courseId}
            courseSlug={courseSlug}
            lesson={l}
            moduleId={m.id}
            index={li}
            total={m.lessons.length}
            allModules={allModules}
          />
        ))}
      </ol>

      {adding ? (
        <LessonForm
          courseSlug={courseSlug}
          moduleId={m.id}
          allModules={allModules}
          onDone={() => setAdding(false)}
        />
      ) : (
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setAdding(true)}>
          Añadir lección
        </button>
      )}
    </div>
  );
}

function LessonRow({
  courseId,
  courseSlug,
  lesson: l,
  moduleId,
  index,
  total,
  allModules,
}: {
  courseId: string;
  courseSlug: string;
  lesson: Lesson;
  moduleId: string;
  index: number;
  total: number;
  allModules: { id: string; title: string }[];
}) {
  const { run, pending } = useAdminAction();
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <li>
        <LessonForm courseSlug={courseSlug} moduleId={moduleId} lesson={l} allModules={allModules} onDone={() => setEditing(false)} />
      </li>
    );
  }

  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl bg-white/[0.03] px-3 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{l.title}</p>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {l.videoKey === "TODO" ? (
            <span className="chip chip-warning">Falta el vídeo</span>
          ) : (
            <span className="chip">{l.durationSeconds ? formatDuration(l.durationSeconds) : "Vídeo sin duración"}</span>
          )}
          {l.questionCount > 0 ? (
            <span className="chip chip-accent">Quiz de {l.questionCount}</span>
          ) : (
            <span className="chip">Sin quiz</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1">
        <IconButton label={`Subir "${l.title}"`} disabled={pending || index === 0} onClick={() => run(() => moveLesson({ id: l.id, direction: "up" }))}>
          <Up />
        </IconButton>
        <IconButton label={`Bajar "${l.title}"`} disabled={pending || index === total - 1} onClick={() => run(() => moveLesson({ id: l.id, direction: "down" }))}>
          <Down />
        </IconButton>
        <button type="button" className="btn btn-sm text-muted hover:text-white" onClick={() => setEditing(true)}>
          Editar
        </button>
        <Link href={`/admin/cursos/${courseId}/lecciones/${l.id}`} className="btn btn-sm text-muted hover:text-white">
          Quiz
        </Link>
        <ConfirmButton
          label="Eliminar"
          className="btn btn-sm text-danger hover:bg-danger/10"
          title={`¿Eliminar la lección "${l.title}"?`}
          description={
            <>
              <p>Se borran la lección, su quiz y los intentos. El vídeo de R2 no se toca.</p>
              {l.progressCount > 0 && (
                <p className="text-warning">
                  {l.progressCount === 1 ? "Un alumno tiene" : `${l.progressCount} alumnos tienen`} progreso en esta lección y lo
                  perderán.
                </p>
              )}
            </>
          }
          confirmLabel="Eliminar lección"
          danger
          onConfirm={() => run(() => deleteLesson({ id: l.id, confirm: true }), "Lección eliminada.")}
        />
      </div>
    </li>
  );
}

function LessonForm({
  courseSlug,
  moduleId,
  lesson,
  allModules,
  onDone,
}: {
  courseSlug: string;
  moduleId: string;
  lesson?: Lesson;
  allModules: { id: string; title: string }[];
  onDone: () => void;
}) {
  const toast = useToast();
  const { run, pending } = useAdminAction();
  const [title, setTitle] = useState(lesson?.title ?? "");
  const [videoKey, setVideoKey] = useState(lesson?.videoKey ?? "");
  const [duration, setDuration] = useState(lesson?.durationSeconds ? formatDuration(lesson.durationSeconds) : "");
  const [description, setDescription] = useState(lesson?.description ?? "");
  const [target, setTarget] = useState(moduleId);

  return (
    <form
      className="glass glass-strong grid gap-4 p-4 sm:grid-cols-2"
      onSubmit={async (e) => {
        e.preventDefault();
        const durationSeconds = parseDuration(duration);
        if (durationSeconds === "invalid") {
          toast({ tone: "error", text: "Escribe la duración como minutos:segundos, por ejemplo 12:34." });
          return;
        }
        const fields = { title, description, videoKey: videoKey.trim() || "TODO", durationSeconds };
        const ok = lesson
          ? await run(() => updateLesson({ id: lesson.id, moduleId: target, ...fields }), "Lección guardada.")
          : await run(() => createLesson({ moduleId, ...fields }), "Lección añadida.");
        if (ok) onDone();
      }}
    >
      <label className="block space-y-1.5 sm:col-span-2">
        <span className="pl-1 text-sm text-muted">Título de la lección</span>
        <input className="field" required maxLength={160} value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
      </label>
      <label className="block space-y-1.5">
        <span className="pl-1 text-sm text-muted">Vídeo en R2 (ruta del index.m3u8)</span>
        <input
          className="field font-mono text-sm"
          placeholder={`cursos/${courseSlug}/leccion/index.m3u8`}
          value={videoKey}
          onChange={(e) => setVideoKey(e.target.value)}
        />
        <span className="block pl-1 text-xs text-subtle">Déjalo vacío si aún no tienes el vídeo.</span>
      </label>
      <label className="block space-y-1.5">
        <span className="pl-1 text-sm text-muted">Duración</span>
        <input className="field" placeholder="12:34" inputMode="numeric" value={duration} onChange={(e) => setDuration(e.target.value)} />
        <span className="block pl-1 text-xs text-subtle">Si la dejas vacía, se toma del vídeo la primera vez que alguien lo vea.</span>
      </label>
      {lesson && allModules.length > 1 && (
        <label className="block space-y-1.5 sm:col-span-2">
          <span className="pl-1 text-sm text-muted">Módulo</span>
          <select className="field" value={target} onChange={(e) => setTarget(e.target.value)}>
            {allModules.map((m, i) => (
              <option key={m.id} value={m.id}>
                Módulo {i + 1}. {m.title}
              </option>
            ))}
          </select>
        </label>
      )}
      <label className="block space-y-1.5 sm:col-span-2">
        <span className="pl-1 text-sm text-muted">Descripción (opcional)</span>
        <textarea className="field min-h-20 rounded-3xl py-3" maxLength={2000} value={description} onChange={(e) => setDescription(e.target.value)} />
      </label>
      <div className="flex gap-2 sm:col-span-2">
        <button disabled={pending} className="btn btn-primary btn-sm">
          {pending ? "Guardando…" : lesson ? "Guardar lección" : "Añadir lección"}
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onDone}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
