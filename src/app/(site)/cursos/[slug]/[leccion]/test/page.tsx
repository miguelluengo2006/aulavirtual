import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { LessonFrame } from "@/components/classroom/lesson-frame";
import { LessonQuiz } from "@/components/lesson-quiz";
import { getLastAttempt, getQuizForStudent } from "@/lib/course-data";
import { lessonUrl, loadLesson } from "@/lib/lesson-page";

export default function LessonTestPage({ params }: PageProps<"/cursos/[slug]/[leccion]/test">) {
  return (
    <Suspense fallback={<p className="text-subtle">Cargando el test…</p>}>
      <LessonTest params={params} />
    </Suspense>
  );
}

// Página del test: separada del vídeo. Las respuestas se corrigen en el servidor.
async function LessonTest({ params }: { params: Promise<{ slug: string; leccion: string }> }) {
  const { slug, leccion } = await params;
  const ctx = await loadLesson(slug, leccion, `/cursos/${slug}/${leccion}/test`);
  const { course, lesson, user, progress } = ctx;

  const quiz = await getQuizForStudent(lesson.id, user.id);
  if (!quiz) redirect(lessonUrl(course.slug, lesson.externalId));
  const lastAttempt = await getLastAttempt(user.id, quiz.id);
  const watched = progress.get(lesson.id)?.completed;

  return (
    <LessonFrame ctx={ctx} tab="test">
      {!watched && (
        <p className="inset flex flex-wrap items-center justify-between gap-3 px-5 py-4 text-sm text-muted">
          <span>Te recomendamos ver el vídeo antes de hacer el test.</span>
          <Link href={lessonUrl(course.slug, lesson.externalId)} className="btn btn-ghost btn-sm">
            Ver el vídeo
          </Link>
        </p>
      )}
      <LessonQuiz quiz={quiz} lastAttempt={lastAttempt} />
    </LessonFrame>
  );
}
