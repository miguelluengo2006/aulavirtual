import type { ReactNode } from "react";
import { formatDateTime } from "@/lib/format";

/**
 * Un mensaje del foro o de las dudas. El texto se muestra tal cual (sin HTML ni
 * Markdown): React lo escapa, así que nadie puede inyectar código en la página.
 */
export function Message({
  author,
  isTeacher,
  createdAt,
  body,
  actions,
  muted = false,
}: {
  author: string;
  isTeacher: boolean;
  createdAt: Date | string;
  body: string;
  actions?: ReactNode;
  muted?: boolean;
}) {
  return (
    <article className={`space-y-2 ${muted ? "" : "inset px-5 py-4"} ${isTeacher ? "border-l-2 border-accent/70" : ""}`}>
      <header className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        <span className="font-medium">{author}</span>
        {isTeacher && <span className="chip chip-accent">Profesor</span>}
        <time className="text-subtle" dateTime={new Date(createdAt).toISOString()}>
          {formatDateTime(createdAt)}
        </time>
        {actions && <span className="ml-auto flex gap-3">{actions}</span>}
      </header>
      <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-white/90">{body}</p>
    </article>
  );
}
