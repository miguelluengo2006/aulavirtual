import Link from "next/link";
import { CaptureGuard } from "@/components/capture-guard";
import { formatDuration, plural } from "@/lib/format";
import { lessonUrl, testUrl, type LessonContext } from "@/lib/lesson-page";

type Tab = "video" | "test";

/**
 * Marco del aula: cabecera de la lección, pestañas (Vídeo / Test / Foro),
 * navegación entre lecciones e índice del curso. El vídeo y el test van en
 * páginas distintas; esto es lo que comparten.
 */
export function LessonFrame({ ctx, tab, children }: { ctx: LessonContext; tab: Tab; children: React.ReactNode }) {
  const { course, lesson, currentModule: module, moduleIndex, index, all, progress, prev, next } = ctx;
  const completed = progress.get(lesson.id)?.completed;

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_330px] lg:items-start">
      <CaptureGuard watermark={ctx.watermark}>
        <div className="min-w-0 space-y-6">
          <header className="space-y-5">
            <nav aria-label="Ruta" className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
              <Link href={`/cursos/${course.slug}`} className="hover:text-white">
                {course.title}
              </Link>
              {module && (
                <>
                  <span aria-hidden className="text-subtle">/</span>
                  <span>
                    Módulo {moduleIndex + 1} · {module.title}
                  </span>
                </>
              )}
            </nav>
            <div className="space-y-2">
              <h1 className="text-3xl sm:text-4xl">{lesson.title}</h1>
              <p className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-subtle">
                <span>
                  Lección {index + 1} de {all.length}
                </span>
                {lesson.durationSeconds ? <span>{formatDuration(lesson.durationSeconds)} de vídeo</span> : null}
                {completed && <span className="chip chip-accent">Vídeo visto</span>}
              </p>
            </div>
            <LessonTabs ctx={ctx} active={tab} />
          </header>

          {children}

          <Pager slug={course.slug} prev={prev} next={next} />
        </div>
      </CaptureGuard>

      <CourseIndex ctx={ctx} />
    </div>
  );
}

function LessonTabs({ ctx, active }: { ctx: LessonContext; active: Tab }) {
  const { course, lesson, quizResults } = ctx;
  const quiz = lesson.quiz;
  const result = quiz ? quizResults.get(quiz.id) : undefined;
  const hasTest = Boolean(quiz && quiz.questions.length > 0);
  const tabClass = (on: boolean) =>
    `flex items-center justify-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition-colors sm:px-4 ${
      on ? "bg-white text-navy" : "text-muted hover:bg-white/8 hover:text-white"
    }`;
  return (
    <nav
      aria-label="Partes de la lección"
      className={`glass grid w-full gap-1 !rounded-full p-1 sm:inline-flex sm:w-auto ${hasTest ? "grid-cols-3" : "grid-cols-2"}`}
    >
      <Link href={lessonUrl(course.slug, lesson.externalId)} aria-current={active === "video" ? "page" : undefined} className={tabClass(active === "video")}>
        <PlayIcon /> Vídeo
      </Link>
      {hasTest && (
        <Link href={testUrl(course.slug, lesson.externalId)} aria-current={active === "test" ? "page" : undefined} className={tabClass(active === "test")}>
          <CheckIcon /> Test
          {result && (
            <span className={`hidden rounded-full px-2 py-0.5 text-xs sm:inline ${active === "test" ? "bg-navy/10" : "bg-accent/15 text-accent"}`}>
              Hecho
            </span>
          )}
        </Link>
      )}
      <Link href={`/cursos/${course.slug}/foro`} className={tabClass(false)}>
        <ChatIcon /> Foro<span className="hidden sm:inline"> del curso</span>
      </Link>
    </nav>
  );
}

function Pager({
  slug,
  prev,
  next,
}: {
  slug: string;
  prev: { externalId: string; title: string } | null;
  next: { externalId: string; title: string } | null;
}) {
  if (!prev && !next) return null;
  return (
    <nav aria-label="Otras lecciones" className="grid gap-3 sm:grid-cols-2">
      {prev ? (
        <Link href={lessonUrl(slug, prev.externalId)} className="glass group space-y-1 p-5 transition-colors hover:border-white/25">
          <span className="text-xs text-subtle">Lección anterior</span>
          <span className="line-clamp-2 block font-medium group-hover:text-white">{prev.title}</span>
        </Link>
      ) : (
        <span className="hidden sm:block" />
      )}
      {next && (
        <Link
          href={lessonUrl(slug, next.externalId)}
          className="glass glass-strong group space-y-1 p-5 text-right transition-colors hover:border-white/25"
        >
          <span className="text-xs text-accent">Siguiente lección</span>
          <span className="line-clamp-2 block font-medium">{next.title}</span>
        </Link>
      )}
    </nav>
  );
}

/** Índice del curso: módulos desplegables (abierto el actual), estado de cada lección, test y recursos. */
function CourseIndex({ ctx }: { ctx: LessonContext }) {
  const { course, lesson, moduleIndex, all, progress, quizResults, resourceCounts } = ctx;
  const done = all.filter((l) => progress.get(l.id)?.completed).length;
  const pct = all.length ? Math.round((done / all.length) * 100) : 0;

  return (
    <aside
      id="indice"
      aria-label="Contenido del curso"
      className="glass h-fit space-y-4 p-3 scroll-mt-24 lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto"
    >
      <div className="space-y-2 px-3 pt-3">
        <Link href={`/cursos/${course.slug}`} className="line-clamp-2 font-medium hover:underline">
          {course.title}
        </Link>
        <div className="progress-track">
          <div className="progress-bar" style={{ width: `${pct}%` }} />
        </div>
        <p className="flex justify-between text-xs text-muted">
          <span>{plural(done, "lección vista", "lecciones vistas")} de {all.length}</span>
          <span className={pct === 100 ? "text-accent" : ""}>{pct} %</span>
        </p>
      </div>

      <div className="space-y-1.5">
        {course.modules.map((m, mi) => {
          const mDone = m.lessons.filter((l) => progress.get(l.id)?.completed).length;
          const mRes = resourceCounts.module.get(m.id) ?? 0;
          return (
            <details key={m.id} open={mi === moduleIndex} className="group rounded-2xl">
              <summary className="flex cursor-pointer list-none items-start gap-3 rounded-2xl px-3 py-2.5 hover:bg-white/5 [&::-webkit-details-marker]:hidden">
                <span className="min-w-0 flex-1">
                  <span className="block text-xs text-subtle">
                    Módulo {mi + 1}
                    {mRes > 0 && ` · ${plural(mRes, "recurso", "recursos")}`}
                  </span>
                  <span className="block text-sm font-medium leading-snug">{m.title}</span>
                </span>
                <span className={`mt-1 text-xs tabular-nums ${mDone === m.lessons.length && mDone > 0 ? "text-accent" : "text-muted"}`}>
                  {mDone}/{m.lessons.length}
                </span>
                <svg aria-hidden viewBox="0 0 20 20" className="mt-1 size-4 shrink-0 text-subtle transition-transform group-open:rotate-180 motion-reduce:transition-none">
                  <path d="M5 8l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </summary>
              <ol className="mt-0.5 space-y-0.5 pb-1">
                {m.lessons.map((l) => {
                  const completed = progress.get(l.id)?.completed;
                  const current = l.id === lesson.id;
                  const testDone = l.quiz ? quizResults.has(l.quiz.id) : false;
                  const res = resourceCounts.lesson.get(l.id) ?? 0;
                  const meta = [
                    l.durationSeconds ? formatDuration(l.durationSeconds) : null,
                    l.quiz && l.quiz.questions.length > 0 ? (testDone ? "Test hecho" : "Test") : null,
                    res > 0 ? plural(res, "recurso", "recursos") : null,
                  ].filter(Boolean);
                  return (
                    <li key={l.id}>
                      <Link
                        href={lessonUrl(course.slug, l.externalId)}
                        aria-current={current ? "page" : undefined}
                        className={`flex items-start gap-3 rounded-2xl px-3 py-2 text-sm ${current ? "bg-white text-navy" : "text-muted hover:bg-white/5 hover:text-white"}`}
                      >
                        <span
                          className={`mt-0.5 grid size-4 shrink-0 place-items-center rounded-full text-[9px] ${completed ? "bg-accent text-navy" : current ? "border border-navy/30" : "border border-white/25"}`}
                        >
                          {completed && <span aria-label="Vista">✓</span>}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block leading-snug">{l.title}</span>
                          {meta.length > 0 && (
                            <span className={`mt-0.5 block text-xs ${current ? "text-navy/60" : "text-subtle"}`}>{meta.join(" · ")}</span>
                          )}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ol>
            </details>
          );
        })}
      </div>
    </aside>
  );
}

function PlayIcon() {
  return (
    <svg aria-hidden viewBox="0 0 20 20" className="size-4">
      <path d="M7 5.5v9l7-4.5-7-4.5z" fill="currentColor" />
    </svg>
  );
}
function CheckIcon() {
  return (
    <svg aria-hidden viewBox="0 0 20 20" className="size-4">
      <path d="M4.5 10.5l3.5 3.5 7.5-8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function ChatIcon() {
  return (
    <svg aria-hidden viewBox="0 0 20 20" className="size-4">
      <path
        d="M4 5.5A1.5 1.5 0 015.5 4h9A1.5 1.5 0 0116 5.5v6a1.5 1.5 0 01-1.5 1.5H9l-3.5 3v-3h0A1.5 1.5 0 014 11.5v-6z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}
