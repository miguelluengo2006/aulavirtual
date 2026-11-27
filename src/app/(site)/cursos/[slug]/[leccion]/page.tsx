import Link from "next/link";
import { Suspense } from "react";
import { preconnect } from "react-dom";
import { LessonFrame } from "@/components/classroom/lesson-frame";
import { LessonResources } from "@/components/classroom/lesson-resources";
import { LessonDoubts } from "@/components/community/lesson-doubts";
import { VideoPlayer } from "@/components/video-player";
import { plural } from "@/lib/format";
import { loadLesson, testUrl } from "@/lib/lesson-page";
import { QUIZ_DRAW } from "@/lib/quiz";
import { r2Origin } from "@/lib/r2";
import { resourcesForLesson } from "@/lib/resources";

export default function LessonPage({ params }: PageProps<"/cursos/[slug]/[leccion]">) {
  return (
    <Suspense fallback={<p className="text-subtle">Cargando lección…</p>}>
      <Lesson params={params} />
    </Suspense>
  );
}

// Página del vídeo: reproductor, resumen, recursos, acceso al test y dudas.
async function Lesson({ params }: { params: Promise<{ slug: string; leccion: string }> }) {
  const { slug, leccion } = await params;
  const ctx = await loadLesson(slug, leccion, `/cursos/${slug}/${leccion}`);
  const { course, lesson, currentModule, progress, quizResults, user, role } = ctx;

  // Abre ya la conexión con R2: el primer segmento llega antes.
  const videoOrigin = r2Origin();
  if (videoOrigin) preconnect(videoOrigin, { crossOrigin: "anonymous" });

  const res = await resourcesForLesson(lesson.id, currentModule?.id ?? null);
  const mine = progress.get(lesson.id);
  const hasSummary = Boolean(lesson.description) || lesson.keyPoints.length > 0;
  const quiz = lesson.quiz && lesson.quiz.questions.length > 0 ? lesson.quiz : null;
  const result = quiz ? quizResults.get(quiz.id) : undefined;
  const resourceTotal = res.lesson.length + res.module.length;

  return (
    <LessonFrame ctx={ctx} tab="video">
      <VideoPlayer
        lessonId={lesson.id}
        watermark={ctx.watermark}
        // Retoma donde lo dejó, salvo que ya la haya terminado.
        startAt={mine && !mine.completed ? mine.position : 0}
      />

      {/* Atajos a cada apartado de la página */}
      <nav aria-label="Apartados" className="flex flex-wrap gap-2 text-sm">
        {hasSummary && (
          <a href="#resumen" className="chip hover:border-white/30">
            Resumen
          </a>
        )}
        {resourceTotal > 0 && (
          <a href="#recursos" className="chip hover:border-white/30">
            {plural(resourceTotal, "recurso", "recursos")}
          </a>
        )}
        <a href="#dudas" className="chip hover:border-white/30">
          Dudas
        </a>
        <a href="#indice" className="chip hover:border-white/30 lg:hidden">
          Temario del curso
        </a>
      </nav>

      {hasSummary && (
        <section id="resumen" aria-labelledby="resumen-titulo" className="glass scroll-mt-24 space-y-4 p-6 sm:p-8">
          <h2 id="resumen-titulo" className="text-2xl">
            Resumen del vídeo
          </h2>
          {lesson.description && <p className="text-muted">{lesson.description}</p>}
          {lesson.keyPoints.length > 0 && (
            <ul className="space-y-2.5">
              {lesson.keyPoints.map((k, i) => (
                <li key={i} className="flex gap-3 text-sm leading-relaxed">
                  <span aria-hidden className="mt-1.5 size-1.5 shrink-0 rounded-full bg-accent" />
                  <span>{k}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <LessonResources lesson={res.lesson} module={res.module} moduleTitle={currentModule?.title} />

      {quiz && (
        <section
          aria-labelledby="test-titulo"
          className="glass glass-strong flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8"
        >
          <div className="space-y-1">
            <h2 id="test-titulo" className="text-2xl">
              Test de la lección
            </h2>
            <p className="text-sm text-muted">
              {Math.min(QUIZ_DRAW, quiz.questions.length)} preguntas sobre las ideas clave del vídeo
              {quiz.questions.length > QUIZ_DRAW ? `, distintas en cada intento` : ""}. No cuenta para avanzar.
            </p>
            {result && (
              <p className="text-sm text-accent">
                Mejor resultado: {Math.round(result.best * 100)} % · {plural(result.attempts, "intento", "intentos")}
              </p>
            )}
          </div>
          <Link href={testUrl(course.slug, lesson.externalId)} className="btn btn-primary shrink-0">
            {result ? "Repetir el test" : "Hacer el test"}
          </Link>
        </section>
      )}

      <LessonDoubts lessonId={lesson.id} userId={user.id} role={role} forumUrl={`/cursos/${course.slug}/foro`} />
    </LessonFrame>
  );
}
