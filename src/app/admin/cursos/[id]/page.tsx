import { asc, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { db } from "@/db";
import { courses, lessons, modules, options, questions } from "@/db/schema";
import { formatDuration, formatPrice } from "@/lib/format";
import { requireRole } from "@/lib/session";

// Vista de revisión de un curso (p. ej. recién importado por Claude Code).
// La edición y reordenación llegan en la fase del panel de admin.
export default function AdminCoursePage({ params }: PageProps<"/admin/cursos/[id]">) {
  return (
    <Suspense fallback={<p className="text-stone-400">Cargando…</p>}>
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

  return (
    <div className="space-y-6">
      <Link href="/admin" className="text-sm text-stone-500 hover:underline">
        ← Volver
      </Link>
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">{course.title}</h1>
        <p className="text-stone-600">{course.description}</p>
        <p className="text-sm text-stone-500">
          {course.status === "draft" ? "Borrador" : course.status} ·{" "}
          {formatPrice(course.priceCents, course.currency)}
          {course.includedInSubscription && " · en la suscripción"} · Profesores:{" "}
          {course.teachers.length
            ? course.teachers.map((t) => t.user.name || t.user.email).join(", ")
            : "ninguno"}
        </p>
      </header>

      {course.importNotes.length > 0 && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm">
          <p className="font-medium">Notas de la importación</p>
          <ul className="mt-1 list-disc pl-5">
            {course.importNotes.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
        </div>
      )}

      {course.modules.map((m) => (
        <section key={m.id} className="space-y-2">
          <h2 className="font-semibold">
            {m.position + 1}. {m.title}
          </h2>
          <ol className="space-y-2">
            {m.lessons.map((l) => (
              <li key={l.id} className="rounded-lg border border-stone-200 bg-white p-4">
                <div className="flex items-baseline justify-between gap-4">
                  <span className="font-medium">{l.title}</span>
                  <span className="text-xs text-stone-400">
                    {l.videoProvider} · {formatDuration(l.durationSeconds)}
                  </span>
                </div>
                <div className="text-xs text-stone-400">{l.videoKey}</div>
                {l.quiz && (
                  <details className="mt-2 text-sm">
                    <summary className="cursor-pointer text-stone-600">
                      Quiz: {l.quiz.questions.length} preguntas
                    </summary>
                    <ol className="mt-2 list-decimal space-y-2 pl-5">
                      {l.quiz.questions.map((q) => (
                        <li key={q.id}>
                          <p>{q.prompt}</p>
                          <ul className="ml-2">
                            {q.options.map((o) => (
                              <li key={o.id} className={o.isCorrect ? "font-medium text-green-700" : "text-stone-500"}>
                                {o.isCorrect ? "✓ " : "· "}
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
