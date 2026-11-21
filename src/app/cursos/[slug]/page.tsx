import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { canAccessCourse } from "@/lib/access";
import { flatLessons, getCourseOutline, getProgressMap } from "@/lib/course-data";
import { formatDuration, formatPrice } from "@/lib/format";
import { getCurrentUser } from "@/lib/session";

export default function CoursePage({ params }: PageProps<"/cursos/[slug]">) {
  return (
    <Suspense fallback={<p className="text-stone-400">Cargando…</p>}>
      <Course params={params} />
    </Suspense>
  );
}

async function Course({ params }: { params: Promise<{ slug: string }> }) {
  await connection();
  const { slug } = await params;
  const [course, user] = await Promise.all([getCourseOutline(slug), getCurrentUser()]);
  if (!course) notFound();

  const hasAccess = user ? await canAccessCourse(user.id, course.id) : false;
  // Los borradores solo existen para quien puede verlos (admin y profesores del curso).
  if (course.status === "draft" && !hasAccess) notFound();

  const all = flatLessons(course);
  const progress = user && hasAccess ? await getProgressMap(user.id, all.map((l) => l.id)) : new Map();
  const done = all.filter((l) => progress.get(l.id)?.completed).length;
  const next = all.find((l) => !progress.get(l.id)?.completed) ?? all[0];

  return (
    <div className="space-y-8">
      {course.status === "draft" && (
        <p className="rounded-md bg-amber-50 px-4 py-2 text-sm text-amber-900">
          Borrador: solo lo ven el admin y los profesores del curso.
        </p>
      )}
      <header className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight">{course.title}</h1>
        <p className="max-w-2xl text-stone-600">{course.description}</p>
        {hasAccess ? (
          <div className="flex items-center gap-4">
            {next && (
              <Link
                href={`/cursos/${course.slug}/${next.externalId}`}
                className="rounded-md bg-stone-900 px-4 py-2 text-white hover:bg-stone-700"
              >
                {done === 0 ? "Empezar el curso" : "Continuar"}
              </Link>
            )}
            <span className="text-sm text-stone-500">
              {done} de {all.length} lecciones completadas
            </span>
          </div>
        ) : (
          <div className="space-y-1">
            <p className="text-lg font-medium">{formatPrice(course.priceCents, course.currency)}</p>
            {course.includedInSubscription && (
              <p className="text-sm text-stone-500">También incluido en la suscripción.</p>
            )}
            <p className="text-sm text-stone-500">
              {user ? "La compra estará disponible muy pronto." : (
                <>
                  <Link href={`/entrar?next=/cursos/${course.slug}`} className="underline">Entra</Link>{" "}
                  para ver tus cursos.
                </>
              )}
            </p>
          </div>
        )}
      </header>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Temario</h2>
        {course.modules.map((m) => (
          <div key={m.id} className="rounded-lg border border-stone-200 bg-white">
            <h3 className="border-b border-stone-100 px-4 py-2 font-medium">{m.title}</h3>
            <ol>
              {m.lessons.map((l) => {
                const completed = progress.get(l.id)?.completed;
                const row = (
                  <span className="flex items-center justify-between px-4 py-2 text-sm">
                    <span>
                      <span className={completed ? "text-green-600" : "text-stone-300"}>
                        {completed ? "✓" : "○"}
                      </span>{" "}
                      {l.title}
                    </span>
                    <span className="text-stone-400">{formatDuration(l.durationSeconds)}</span>
                  </span>
                );
                return (
                  <li key={l.id} className="border-t border-stone-50 first:border-0">
                    {hasAccess ? (
                      <Link href={`/cursos/${course.slug}/${l.externalId}`} className="block hover:bg-stone-50">
                        {row}
                      </Link>
                    ) : (
                      row
                    )}
                  </li>
                );
              })}
            </ol>
          </div>
        ))}
      </section>
    </div>
  );
}
