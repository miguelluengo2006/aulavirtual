import { formatBytes, resourceLabel } from "@/lib/resource-rules";
import type { ResourceItem } from "@/lib/resources";

/** Material de apoyo de la lección y de su módulo. Se descarga o se abre en otra pestaña. */
export function LessonResources({
  lesson,
  module,
  moduleTitle,
}: {
  lesson: ResourceItem[];
  module: ResourceItem[];
  moduleTitle?: string;
}) {
  if (lesson.length === 0 && module.length === 0) return null;
  return (
    <section id="recursos" aria-labelledby="recursos-titulo" className="glass scroll-mt-24 space-y-5 p-6 sm:p-8">
      <div className="space-y-1">
        <h2 id="recursos-titulo" className="text-2xl">
          Recursos
        </h2>
        <p className="text-sm text-muted">Material de apoyo para trabajar lo que se explica en el vídeo.</p>
      </div>
      {lesson.length > 0 && <Group title={module.length > 0 ? "De esta lección" : undefined} items={lesson} />}
      {module.length > 0 && <Group title={`De todo el módulo${moduleTitle ? `: ${moduleTitle}` : ""}`} items={module} />}
    </section>
  );
}

function Group({ title, items }: { title?: string; items: ResourceItem[] }) {
  return (
    <div className="space-y-2">
      {title && <h3 className="text-sm font-medium text-muted">{title}</h3>}
      <ul className="grid gap-2 sm:grid-cols-2">
        {items.map((r) => {
          const isFile = r.kind === "file";
          return (
            <li key={r.id}>
              <a
                href={`/api/recursos/${r.id}`}
                {...(isFile ? {} : { target: "_blank", rel: "noopener noreferrer" })}
                className="inset group flex h-full items-center gap-4 p-4 transition-colors hover:border-white/25 hover:bg-white/5"
              >
                <span
                  aria-hidden
                  className={`grid size-11 shrink-0 place-items-center rounded-xl text-[10px] font-semibold tracking-wide ${
                    isFile ? "bg-accent/15 text-accent" : "bg-blue-500/15 text-blue-300"
                  }`}
                >
                  {isFile ? resourceLabel(r).slice(0, 4) : <LinkIcon />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="line-clamp-2 block text-sm font-medium">{r.title}</span>
                  <span className="block truncate text-xs text-subtle">
                    {isFile ? [resourceLabel(r), formatBytes(r.sizeBytes)].filter(Boolean).join(" · ") : `Enlace · ${resourceLabel(r)}`}
                  </span>
                </span>
                <span className="shrink-0 text-xs text-muted group-hover:text-white">{isFile ? "Descargar" : "Abrir"}</span>
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function LinkIcon() {
  return (
    <svg viewBox="0 0 20 20" className="size-5">
      <path
        d="M8.5 11.5a3 3 0 004.2 0l2.6-2.6a3 3 0 00-4.2-4.2l-1 1M11.5 8.5a3 3 0 00-4.2 0l-2.6 2.6a3 3 0 004.2 4.2l1-1"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}
