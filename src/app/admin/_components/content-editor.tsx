"use client";

import Link from "next/link";
import { useState } from "react";
import {
  createLesson,
  createModule,
  deleteLesson,
  deleteModule,
  renameModule,
  reorderLessons,
  reorderModules,
  updateLesson,
} from "../_actions/structure";
import { formatDuration } from "@/lib/format";
import { parseDuration } from "./course-wizard";
import { ConfirmButton, useAdminAction, useToast } from "./feedback";
import { DragHandle, SortableList } from "./sortable";

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

export function ContentEditor({ courseId, courseSlug, modules }: { courseId: string; courseSlug: string; modules: Module[] }) {
  const { run, pending } = useAdminAction();
  // Copia local para que al arrastrar el orden cambie al instante; se resincroniza con el servidor.
  const [mods, setMods] = useState(modules);
  const [seen, setSeen] = useState(modules);
  if (seen !== modules) {
    setSeen(modules);
    setMods(modules);
  }
  const [newModule, setNewModule] = useState("");
  const allModules = mods.map((m) => ({ id: m.id, title: m.title }));

  return (
    <div className="space-y-4">
      <SortableList
        items={mods}
        label="módulos"
        className="space-y-4"
        onReorder={(next) => {
          setMods(next);
          run(() => reorderModules({ courseId, ids: next.map((m) => m.id) }), "Orden guardado.");
        }}
      >
        {(m, handle, mi) => (
          <ModuleBlock
            courseId={courseId}
            courseSlug={courseSlug}
            module={m}
            index={mi}
            handle={handle}
            allModules={allModules}
            onLocalReorder={(lessons) => setMods((ms) => ms.map((x) => (x.id === m.id ? { ...x, lessons } : x)))}
          />
        )}
      </SortableList>

      <form
        className="flex flex-col gap-2 rounded-xl border border-dashed border-[#cbd5e3] bg-white/60 p-3 sm:flex-row"
        onSubmit={async (e) => {
          e.preventDefault();
          if (await run(() => createModule({ courseId, title: newModule }), "Módulo añadido.")) setNewModule("");
        }}
      >
        <label className="sr-only" htmlFor="nuevo-modulo">Título del módulo nuevo</label>
        <input id="nuevo-modulo" className="a-input" placeholder="Título del módulo nuevo" value={newModule} required maxLength={160} onChange={(e) => setNewModule(e.target.value)} />
        <button disabled={pending} className="a-btn a-btn-secondary shrink-0">Añadir módulo</button>
      </form>
    </div>
  );
}

function ModuleBlock({
  courseId,
  courseSlug,
  module: m,
  index,
  handle,
  allModules,
  onLocalReorder,
}: {
  courseId: string;
  courseSlug: string;
  module: Module;
  index: number;
  handle: React.ButtonHTMLAttributes<HTMLButtonElement>;
  allModules: { id: string; title: string }[];
  onLocalReorder: (lessons: Lesson[]) => void;
}) {
  const { run, pending } = useAdminAction();
  const [title, setTitle] = useState(m.title);
  const [seenTitle, setSeenTitle] = useState(m.title);
  const [adding, setAdding] = useState(false);
  if (seenTitle !== m.title) {
    setSeenTitle(m.title);
    setTitle(m.title);
  }

  return (
    <div className="a-card overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 border-b border-[#e1e7f0] bg-[#f8fafd] px-3 py-2.5">
        <DragHandle label={`Mover el módulo ${m.title}`} {...handle} />
        <span className="text-sm a-subtle">{index + 1}.</span>
        <form
          className="flex min-w-0 flex-1"
          onSubmit={(e) => {
            e.preventDefault();
            if (title.trim() !== m.title) run(() => renameModule({ id: m.id, title }), "Módulo renombrado.");
          }}
        >
          <label className="sr-only" htmlFor={`mod-${m.id}`}>Título del módulo</label>
          <input
            id={`mod-${m.id}`}
            className="a-input border-transparent bg-transparent py-1.5 font-medium hover:border-[#cbd5e3]"
            value={title}
            maxLength={160}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => {
              if (title.trim() && title.trim() !== m.title) run(() => renameModule({ id: m.id, title }), "Módulo renombrado.");
            }}
          />
        </form>
        <span className="text-xs a-subtle">{m.lessons.length} lección{m.lessons.length === 1 ? "" : "es"}</span>
        {m.lessons.length === 0 && (
          <ConfirmButton
            label="Quitar"
            className="a-btn a-btn-danger-soft a-btn-sm"
            title={`¿Quitar el módulo "${m.title}"?`}
            description={<p>Está vacío, así que no se pierde nada más.</p>}
            confirmLabel="Quitar módulo"
            danger
            onConfirm={() => run(() => deleteModule({ id: m.id }), "Módulo quitado.")}
          />
        )}
      </div>

      <div className="space-y-2 p-3">
        {m.lessons.length === 0 && !adding && <p className="px-2 py-1 text-sm a-muted">Este módulo aún no tiene lecciones.</p>}
        <SortableList
          items={m.lessons}
          label={`lecciones de ${m.title}`}
          className="space-y-2"
          onReorder={(next) => {
            onLocalReorder(next);
            run(() => reorderLessons({ moduleId: m.id, ids: next.map((l) => l.id) }), "Orden guardado.");
          }}
        >
          {(l, h) => <LessonRow courseId={courseId} courseSlug={courseSlug} lesson={l} moduleId={m.id} handle={h} allModules={allModules} />}
        </SortableList>
        {adding ? (
          <LessonForm courseSlug={courseSlug} moduleId={m.id} allModules={allModules} onDone={() => setAdding(false)} />
        ) : (
          <button type="button" disabled={pending} className="a-btn a-btn-ghost a-btn-sm" onClick={() => setAdding(true)}>
            Añadir lección
          </button>
        )}
      </div>
    </div>
  );
}

function LessonRow({
  courseId,
  courseSlug,
  lesson: l,
  moduleId,
  handle,
  allModules,
}: {
  courseId: string;
  courseSlug: string;
  lesson: Lesson;
  moduleId: string;
  handle: React.ButtonHTMLAttributes<HTMLButtonElement>;
  allModules: { id: string; title: string }[];
}) {
  const { run } = useAdminAction();
  const [editing, setEditing] = useState(false);

  if (editing) {
    return <LessonForm courseSlug={courseSlug} moduleId={moduleId} lesson={l} allModules={allModules} onDone={() => setEditing(false)} />;
  }

  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-2 rounded-xl border border-[#e1e7f0] bg-white px-2 py-2 sm:grid-cols-[auto_minmax(0,1fr)_auto]">
      <DragHandle label={`Mover la lección ${l.title}`} {...handle} />
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{l.title}</p>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {l.videoKey === "TODO" ? (
            <span className="a-chip a-chip-amber">Falta el vídeo</span>
          ) : (
            <span className="a-chip">{l.durationSeconds ? formatDuration(l.durationSeconds) : "Vídeo"}</span>
          )}
          {l.questionCount > 0 ? <span className="a-chip a-chip-teal">Quiz de {l.questionCount}</span> : <span className="a-chip">Sin quiz</span>}
        </div>
      </div>
      <div className="col-start-2 flex flex-wrap items-center gap-1 sm:col-start-auto">
        <button type="button" className="a-btn a-btn-ghost a-btn-sm" onClick={() => setEditing(true)}>Editar</button>
        <Link href={`/admin/cursos/${courseId}/lecciones/${l.id}`} className="a-btn a-btn-ghost a-btn-sm">
          {l.questionCount > 0 ? "Quiz" : "Añadir quiz"}
        </Link>
        <ConfirmButton
          label="Eliminar"
          className="a-btn a-btn-danger-soft a-btn-sm"
          title={`¿Eliminar la lección "${l.title}"?`}
          description={
            <>
              <p>Se borran la lección, su quiz y los intentos. El vídeo de R2 no se toca.</p>
              {l.progressCount > 0 && (
                <p className="text-amber-700">
                  {l.progressCount === 1 ? "Un alumno tiene" : `${l.progressCount} alumnos tienen`} progreso en esta lección y lo perderán.
                </p>
              )}
            </>
          }
          confirmLabel="Eliminar lección"
          danger
          onConfirm={() => run(() => deleteLesson({ id: l.id, confirm: true }), "Lección eliminada.")}
        />
      </div>
    </div>
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
  const [videoKey, setVideoKey] = useState(lesson && lesson.videoKey !== "TODO" ? lesson.videoKey : "");
  const [duration, setDuration] = useState(lesson?.durationSeconds ? formatDuration(lesson.durationSeconds) : "");
  const [description, setDescription] = useState(lesson?.description ?? "");
  const [target, setTarget] = useState(moduleId);

  return (
    <form
      className="grid gap-4 rounded-xl border border-[#bfd2f8] bg-[#f5f8ff] p-4 sm:grid-cols-2"
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
      <label className="block sm:col-span-2">
        <span className="a-label">Título de la lección</span>
        <input className="a-input" required maxLength={160} value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
      </label>
      <label className="block">
        <span className="a-label">Vídeo en R2</span>
        <input className="a-input font-mono text-sm" placeholder={`cursos/${courseSlug}/leccion/index.m3u8`} value={videoKey} onChange={(e) => setVideoKey(e.target.value)} />
        <span className="a-help">La ruta del index.m3u8. Vacío si aún no tienes el vídeo.</span>
      </label>
      <label className="block">
        <span className="a-label">Duración</span>
        <input className="a-input" placeholder="12:34" inputMode="numeric" value={duration} onChange={(e) => setDuration(e.target.value)} />
        <span className="a-help">Si la dejas vacía, se toma del vídeo la primera vez que alguien lo vea.</span>
      </label>
      {lesson && allModules.length > 1 && (
        <label className="block sm:col-span-2">
          <span className="a-label">Módulo</span>
          <select className="a-input" value={target} onChange={(e) => setTarget(e.target.value)}>
            {allModules.map((m, i) => (
              <option key={m.id} value={m.id}>{i + 1}. {m.title}</option>
            ))}
          </select>
        </label>
      )}
      <label className="block sm:col-span-2">
        <span className="a-label">Descripción (opcional)</span>
        <textarea className="a-input min-h-20" maxLength={2000} value={description} onChange={(e) => setDescription(e.target.value)} />
      </label>
      <div className="flex gap-2 sm:col-span-2">
        <button disabled={pending} className="a-btn a-btn-primary">{pending ? "Guardando…" : lesson ? "Guardar lección" : "Añadir lección"}</button>
        <button type="button" className="a-btn a-btn-secondary" onClick={onDone}>Cancelar</button>
      </div>
    </form>
  );
}
