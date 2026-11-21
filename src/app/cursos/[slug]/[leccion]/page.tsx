import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
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
import { requireUser } from "@/lib/session";

export default function LessonPage({ params }: PageProps<"/cursos/[slug]/[leccion]">) {
  return (
    <Suspense fallback={<p className="text-stone-400">Cargando lección…</p>}>
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
  const mine = progress.get(lesson.id);

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_280px]">
      <div className="min-w-0 space-y-6">
        <nav className="text-sm text-stone-500">
          <Link href={`/cursos/${course.slug}`} className="hover:underline">
            {course.title}
          </Link>
        </nav>

        <VideoPlayer
          lessonId={lesson.id}
          watermark={user.email}
          // Retoma donde lo dejó, salvo que ya la haya terminado.
          startAt={mine && !mine.completed ? mine.position : 0}
        />

        <div className="flex items-start justify-between gap-4">
          <h1 className="text-2xl font-semibold">{lesson.title}</h1>
          <div className="flex shrink-0 gap-2 text-sm">
            {prev && (
              <Link href={`/cursos/${course.slug}/${prev.externalId}`} className="rounded-md border border-stone-300 px-3 py-1.5 hover:bg-stone-100">
                ← Anterior
              </Link>
            )}
            {next && (
              <Link href={`/cursos/${course.slug}/${next.externalId}`} className="rounded-md bg-stone-900 px-3 py-1.5 text-white hover:bg-stone-700">
                Siguiente →
              </Link>
            )}
          </div>
        </div>

        {quiz && <LessonQuiz quiz={quiz} lastAttempt={lastAttempt} />}
      </div>

      <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
        {course.modules.map((m) => (
          <div key={m.id}>
            <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-stone-500">{m.title}</h2>
            <ol className="space-y-0.5">
              {m.lessons.map((l) => {
                const completed = progress.get(l.id)?.completed;
                const current = l.id === lesson.id;
                return (
                  <li key={l.id}>
                    <Link
                      href={`/cursos/${course.slug}/${l.externalId}`}
                      aria-current={current ? "page" : undefined}
                      className={`flex items-center justify-between rounded px-2 py-1.5 text-sm ${current ? "bg-stone-900 text-white" : "hover:bg-stone-100"}`}
                    >
                      <span>
                        <span className={completed ? (current ? "text-green-300" : "text-green-600") : "opacity-40"}>
                          {completed ? "✓" : "○"}
                        </span>{" "}
                        {l.title}
                      </span>
                      <span className="text-xs opacity-60">{formatDuration(l.durationSeconds)}</span>
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
