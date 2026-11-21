import { asc, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { db } from "@/db";
import { courses, lessons, modules, options, questions } from "@/db/schema";
import { formatDuration, formatPrice, plural } from "@/lib/format";
import { requireRole } from "@/lib/session";

// Vista de revisión de un curso (p. ej. recién importado por Claude Code).
// La edición y reordenación llegan en la fase del panel de admin.
export default function AdminCoursePage({ params }: PageProps<"/admin/cursos/[id]">) {
  return (
    <Suspense fallback={<p className="text-subtle">Cargando…</p>}>
      <CourseDetail params={params} />
    </Suspense>
  );
}

async function CourseDetail({ params }: { params: Promise<{ id: string }> }) {
  await requireRole(["admin"]);
  const { id } = await params;

  const course = await db.query.courses.findFirst({
    where: eq(courses.id, id),
    with: {
      teachers: { with: { user: { columns: { name: true, email: true } } } },
      modules: {
        orderBy: asc(modules.position),
        with: {
          lessons: {
            orderBy: asc(lessons.position),
            with: {
              quiz: {
                with: {
                  questions: {
                    orderBy: asc(questions.position),
                    with: { options: { orderBy: asc(options.position) } },
                  },
                },
              },
            },
          },
        },
      },
    },
  });
  if (!course) notFound();

  const statusChip =
    course.status === "draft" ? (
      <span className="chip chip-warning">Borrador</span>
    ) : course.status === "published" ? (
      <span className="chip chip-accent">Publicado</span>
    ) : (
      <span className="chip">Archivado</span>
    );

  return (
    <div className="space-y-8">
      <Link href="/admin" className="text-sm text-muted hover:text-white">
        Volver al panel
      </Link>
      <header className="glass space-y-4 p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            {statusChip}
            <h1 className="text-3xl">{course.title}</h1>
          </div>
          <Link href={`/cursos/${course.slug}`} className="btn btn-ghost btn-sm">
            Ver como alumno
          </Link>
        </div>
        <p className="max-w-2xl text-muted">{course.description}</p>
        <dl className="grid gap-4 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-subtle">Precio</dt>
            <dd>
              {formatPrice(course.priceCents, course.currency)}
              {course.includedInSubscription && ", incluido en la suscripción"}
            </dd>
          </div>
          <div>
            <dt className="text-subtle">Profesores</dt>
            <dd>
              {course.teachers.length
                ? course.teachers.map((t) => t.user.name || t.user.email).join(", ")
                : "Ninguno asignado"}
            </dd>
          </div>
          <div>
            <dt className="text-subtle">Contenido</dt>
            <dd>
              {plural(course.modules.length, "módulo", "módulos")},{" "}
              {plural(course.modules.reduce((n, m) => n + m.lessons.length, 0), "lección", "lecciones")}
            </dd>
          </div>
        </dl>
      </header>

      {course.importNotes.length > 0 && (
        <div className="glass space-y-2 border-warning/40 p-6 text-sm">
          <p className="font-medium text-warning">Notas de la importación</p>
          <ul className="list-disc space-y-1 pl-5 text-muted">
            {course.importNotes.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
        </div>
      )}

      {course.modules.map((m) => (
        <section key={m.id} className="space-y-3">
          <h2 className="text-xl">
            Módulo {m.position + 1}: {m.title}
          </h2>
          <ol className="space-y-3">
            {m.lessons.map((l) => (
              <li key={l.id} className="glass space-y-3 p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <span className="font-medium">{l.title}</span>
                  <span className="flex gap-2">
                    {l.videoKey === "TODO" ? (
                      <span className="chip chip-warning">Falta el vídeo</span>
                    ) : (
                      <span className="chip">{formatDuration(l.durationSeconds)}</span>
                    )}
                    {!l.quiz && <span className="chip chip-warning">Sin quiz</span>}
                  </span>
                </div>
                <p className="break-all font-mono text-xs text-subtle">{l.videoKey}</p>
                {l.quiz && (
                  <details className="inset px-4 py-3 text-sm">
                    <summary className="cursor-pointer text-muted">
                      Quiz de {plural(l.quiz.questions.length, "pregunta", "preguntas")}
                    </summary>
                    <ol className="mt-3 list-decimal space-y-3 pl-5">
                      {l.quiz.questions.map((q) => (
                        <li key={q.id} className="space-y-1">
                          <p>{q.prompt}</p>
                          <ul className="space-y-0.5">
                            {q.options.map((o) => (
                              <li key={o.id} className={o.isCorrect ? "text-accent" : "text-subtle"}>
                                {o.isCorrect ? "✓ " : "– "}
                                {o.text}
                              </li>
                            ))}
                          </ul>
                        </li>
                      ))}
                    </ol>
                  </details>
                )}
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}
