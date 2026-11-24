import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { preconnect } from "react-dom";
import { CaptureGuard } from "@/components/capture-guard";
import { LessonQuiz } from "@/components/lesson-quiz";
import { VideoPlayer } from "@/components/video-player";
import { canAccessCourse } from "@/lib/access";
import {
  flatLessons,
  getCourseOutline,
  getLastAttempt,
  getProgressMap,
  getQuizForStudent,
} from "@/lib/course-data";
import { formatDuration } from "@/lib/format";
import { r2Origin } from "@/lib/r2";
import { requireUser } from "@/lib/session";

export default function LessonPage({ params }: PageProps<"/cursos/[slug]/[leccion]">) {
  return (
    <Suspense fallback={<p className="text-subtle">Cargando lección…</p>}>
      <Lesson params={params} />
    </Suspense>
  );
}

async function Lesson({ params }: { params: Promise<{ slug: string; leccion: string }> }) {
  const { slug, leccion } = await params;
  const user = await requireUser(`/cursos/${slug}/${leccion}`);

  const course = await getCourseOutline(slug);
  if (!course) notFound();
  if (!(await canAccessCourse(user.id, course.id))) redirect(`/cursos/${slug}`);

  const all = flatLessons(course);
  const index = all.findIndex((l) => l.externalId === leccion);
  if (index === -1) notFound();
  const lesson = all[index];
  const next = all[index + 1];
  const prev = all[index - 1];

  const [progress, quiz] = await Promise.all([
    getProgressMap(user.id, all.map((l) => l.id)),
    getQuizForStudent(lesson.id),
  ]);
  const lastAttempt = quiz ? await getLastAttempt(user.id, quiz.id) : null;

  // Email y fecha en la marca de agua: cualquier captura o grabación queda identificada.
  const mark = `${user.email} · ${new Date().toLocaleDateString("es-ES", { timeZone: "Europe/Madrid" })}`;

  // Abre ya la conexión con R2: el primer segmento llega antes.
  const videoOrigin = r2Origin();
  if (videoOrigin) preconnect(videoOrigin, { crossOrigin: "anonymous" });
  const mine = progress.get(lesson.id);
  const done = all.filter((l) => progress.get(l.id)?.completed).length;

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      {/* Protección frente a capturas: ver CaptureGuard. */}
      <CaptureGuard watermark={mark}>
        <div className="min-w-0 space-y-6">
          <VideoPlayer
            lessonId={lesson.id}
            watermark={mark}
            // Retoma donde lo dejó, salvo que ya la haya terminado.
            startAt={mine && !mine.completed ? mine.position : 0}
          />

          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-1">
              <Link href={`/cursos/${course.slug}`} className="text-sm text-muted hover:text-white">
                {course.title}
              </Link>
              <h1 className="text-3xl">{lesson.title}</h1>
            </div>
            <div className="flex shrink-0 gap-2">
              {prev && (
                <Link href={`/cursos/${course.slug}/${prev.externalId}`} className="btn btn-ghost btn-sm">
                  Anterior
                </Link>
              )}
              {next && (
                <Link href={`/cursos/${course.slug}/${next.externalId}`} className="btn btn-primary btn-sm">
                  Siguiente lección
                </Link>
              )}
            </div>
          </div>

          {quiz && <LessonQuiz quiz={quiz} lastAttempt={lastAttempt} />}
        </div>

      </CaptureGuard>

      <aside className="glass h-fit space-y-5 p-4 lg:sticky lg:top-24">
        <div className="space-y-2 px-2 pt-2">
          <div className="flex justify-between text-sm">
            <span className="font-medium">Contenido del curso</span>
            <span className="text-muted tabular-nums">
              {done}/{all.length}
            </span>
          </div>
          <div className="progress-track">
            <div className="progress-bar" style={{ width: `${all.length ? (done / all.length) * 100 : 0}%` }} />
          </div>
        </div>
        {course.modules.map((m) => (
          <div key={m.id} className="space-y-1">
            <h2 className="px-2 text-sm font-medium text-muted">{m.title}</h2>
            <ol className="space-y-0.5">
              {m.lessons.map((l) => {
                const completed = progress.get(l.id)?.completed;
                const current = l.id === lesson.id;
                return (
                  <li key={l.id}>
                    <Link
                      href={`/cursos/${course.slug}/${l.externalId}`}
                      aria-current={current ? "page" : undefined}
                      className={`flex items-center gap-3 rounded-2xl px-3 py-2 text-sm ${current ? "bg-white text-navy" : "text-muted hover:bg-white/5 hover:text-white"}`}
                    >
                      <span
                        aria-label={completed ? "Completada" : undefined}
                        className={`grid size-4 shrink-0 place-items-center rounded-full text-[9px] ${completed ? "bg-accent text-navy" : current ? "border border-navy/30" : "border border-white/25"}`}
                      >
                        {completed && "✓"}
                      </span>
                      <span className="flex-1">{l.title}</span>
                      <span className="text-xs tabular-nums opacity-60">{formatDuration(l.durationSeconds)}</span>
                    </Link>
                  </li>
                );
              })}
            </ol>
          </div>
        ))}
      </aside>
    </div>
  );
}
