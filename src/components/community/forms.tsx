"use client";

import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import {
  answerLessonQuestion,
  askLessonQuestion,
  createThread,
  deleteForumPost,
  deleteLessonAnswer,
  deleteLessonQuestion,
  deleteThread,
  moderateThread,
  replyToThread,
} from "@/app/(site)/cursos/[slug]/community-actions";

type Res = { ok: true } | { ok: false; error: string };

/** Formulario de texto: envía, muestra el error si lo hay y refresca la página. */
function TextForm({
  label,
  placeholder,
  submitLabel,
  rows = 4,
  withTitle = false,
  onSend,
  compact = false,
}: {
  label: string;
  placeholder: string;
  submitLabel: string;
  rows?: number;
  withTitle?: boolean;
  onSend: (data: { title: string; body: string }) => Promise<Res>;
  compact?: boolean;
}) {
  const ids = useId();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    start(async () => {
      setError(null);
      const r = await onSend({ title, body });
      if (!r.ok) return setError(r.error);
      setTitle("");
      setBody("");
      router.refresh();
    });
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      {withTitle && (
        <div className="space-y-1.5">
          <label htmlFor={`${ids}-t`} className="text-sm font-medium">
            Título
          </label>
          <input
            id={`${ids}-t`}
            className="field w-full"
            value={title}
            maxLength={150}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Resume tu pregunta en una frase"
            required
          />
        </div>
      )}
      <div className="space-y-1.5">
        <label htmlFor={`${ids}-b`} className={compact ? "sr-only" : "text-sm font-medium"}>
          {label}
        </label>
        <textarea
          id={`${ids}-b`}
          className="field w-full resize-y !rounded-2xl"
          rows={rows}
          maxLength={5000}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={placeholder}
          required
        />
      </div>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      <button type="submit" disabled={pending || !body.trim() || (withTitle && !title.trim())} className={compact ? "btn btn-ghost btn-sm" : "btn btn-primary"}>
        {pending ? "Publicando…" : submitLabel}
      </button>
    </form>
  );
}

export function NewThreadForm({ courseId, slug }: { courseId: string; slug: string }) {
  const router = useRouter();
  return (
    <TextForm
      withTitle
      label="Tu mensaje"
      placeholder="Explica tu duda o lo que quieres compartir. Si es sobre una lección, di cuál."
      submitLabel="Publicar tema"
      rows={5}
      onSend={async ({ title, body }) => {
        const r = await createThread({ courseId, title, body });
        if (r.ok) router.push(`/cursos/${slug}/foro/${r.threadId}`);
        return r;
      }}
    />
  );
}

export function ReplyForm({ threadId }: { threadId: string }) {
  return (
    <TextForm
      label="Tu respuesta"
      placeholder="Escribe tu respuesta"
      submitLabel="Responder"
      onSend={({ body }) => replyToThread({ threadId, body })}
    />
  );
}

export function AskDoubtForm({ lessonId }: { lessonId: string }) {
  return (
    <TextForm
      label="Tu duda sobre esta lección"
      placeholder="¿Qué no te ha quedado claro del vídeo? Si es un momento concreto, indica el minuto."
      submitLabel="Enviar duda"
      rows={3}
      onSend={({ body }) => askLessonQuestion({ lessonId, body })}
    />
  );
}

export function AnswerDoubtForm({ questionId }: { questionId: string }) {
  const [open, setOpen] = useState(false);
  if (!open)
    return (
      <button type="button" onClick={() => setOpen(true)} className="btn btn-ghost btn-sm">
        Responder
      </button>
    );
  return (
    <TextForm
      compact
      label="Tu respuesta"
      placeholder="Escribe tu respuesta"
      submitLabel="Publicar respuesta"
      rows={3}
      onSend={(d) => answerLessonQuestion({ questionId, body: d.body })}
    />
  );
}

const actions = {
  deleteThread: (id: string) => deleteThread({ threadId: id }),
  deletePost: (id: string) => deleteForumPost({ postId: id }),
  deleteQuestion: (id: string) => deleteLessonQuestion({ questionId: id }),
  deleteAnswer: (id: string) => deleteLessonAnswer({ answerId: id }),
  pin: (id: string) => moderateThread({ threadId: id, action: "pin" }),
  unpin: (id: string) => moderateThread({ threadId: id, action: "unpin" }),
  lock: (id: string) => moderateThread({ threadId: id, action: "lock" }),
  unlock: (id: string) => moderateThread({ threadId: id, action: "unlock" }),
};

/** Botón pequeño de moderación o borrado (con confirmación si se indica). */
export function CommunityAction({
  action,
  id,
  label,
  confirm,
  redirectTo,
}: {
  action: keyof typeof actions;
  id: string;
  label: string;
  confirm?: string;
  redirectTo?: string;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const run = () => {
    if (confirm && !window.confirm(confirm)) return;
    start(async () => {
      setError(null);
      const r = await actions[action](id);
      if (!r.ok) return setError(r.error);
      if (redirectTo) router.push(redirectTo);
      else router.refresh();
    });
  };
  return (
    <span className="inline-flex items-center gap-2">
      <button type="button" onClick={run} disabled={pending} className="text-xs text-subtle underline-offset-2 hover:text-white hover:underline">
        {pending ? "…" : label}
      </button>
      {error && (
        <span role="alert" className="text-xs text-danger">
          {error}
        </span>
      )}
    </span>
  );
}
