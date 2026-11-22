import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { canAccessCourse } from "@/lib/access";
import { flatLessons, getCourseOutline, getProgressMap } from "@/lib/course-data";
import { formatDuration, formatPrice, formatTotalMinutes, plural } from "@/lib/format";
import { getCurrentUser } from "@/lib/session";

export default function CoursePage({ params }: PageProps<"/cursos/[slug]">) {
  return (
    <Suspense fallback={<p className="text-subtle">Cargando…</p>}>
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
  const totalSeconds = all.reduce((s, l) => s + (l.durationSeconds ?? 0), 0);
  const pct = all.length ? Math.round((done / all.length) * 100) : 0;

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px] lg:items-start">
      <div className="space-y-8">
        <header className="space-y-4">
          {course.status === "draft" && (
            <span className="chip chip-warning">Borrador: solo lo ven el admin y los profesores</span>
          )}
          <h1 className="text-4xl sm:text-5xl">{course.title}</h1>
          <p className="max-w-2xl text-lg text-muted">{course.description}</p>
          <p className="text-sm text-subtle">
            {plural(all.length, "lección", "lecciones")} en{" "}
            {plural(course.modules.length, "módulo", "módulos")}
            {totalSeconds > 0 && `, ${formatTotalMinutes(totalSeconds)} de vídeo`}
          </p>
        </header>

        <section className="space-y-4">
          <h2 className="text-2xl">Temario</h2>
          {course.modules.map((m) => (
            <div key={m.id} className="glass overflow-hidden p-2">
              <h3 className="px-4 pb-2 pt-3 text-base font-medium">{m.title}</h3>
              <ol className="space-y-1">
                {m.lessons.map((l) => {
                  const completed = progress.get(l.id)?.completed;
                  const row = (
                    <span className="flex items-center gap-3 rounded-2xl px-4 py-2.5 text-sm">
                      <span
                        aria-label={completed ? "Completada" : undefined}
                        className={`grid size-5 shrink-0 place-items-center rounded-full text-[10px] ${completed ? "bg-accent text-navy" : "border border-white/25"}`}
                      >
                        {completed && "✓"}
                      </span>
                      <span className="flex-1">{l.title}</span>
                      <span className="text-subtle tabular-nums">{formatDuration(l.durationSeconds)}</span>
                    </span>
                  );
                  return (
                    <li key={l.id}>
                      {hasAccess ? (
                        <Link href={`/cursos/${course.slug}/${l.externalId}`} className="block rounded-2xl hover:bg-white/5">
                          {row}
                        </Link>
                      ) : (
                        <span className="block text-muted">{row}</span>
                      )}
                    </li>
                  );
                })}
              </ol>
            </div>
          ))}
        </section>
      </div>

      <aside className="glass space-y-5 p-6 lg:sticky lg:top-24">
        {hasAccess ? (
          <>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted">Tu progreso</span>
                <span className={pct === 100 ? "text-accent" : "text-muted"}>{pct} %</span>
              </div>
              <div className="progress-track">
                <div className="progress-bar" style={{ width: `${pct}%` }} />
              </div>
              <p className="text-sm text-subtle">
                {done} de {plural(all.length, "lección completada", "lecciones completadas")}
              </p>
            </div>
            {next && (
              <Link href={`/cursos/${course.slug}/${next.externalId}`} className="btn btn-primary w-full">
                {done === 0 ? "Empezar el curso" : done === all.length ? "Repasar el curso" : "Continuar"}
              </Link>
            )}
          </>
        ) : (
          <>
            <div className="space-y-1">
              <p className="text-3xl font-semibold tracking-tight">
                {formatPrice(course.priceCents, course.currency)}
              </p>
              <p className="text-sm text-muted">Pago único, acceso para siempre.</p>
            </div>
            <button className="btn btn-primary w-full" disabled>
              Comprar curso (muy pronto)
            </button>
            {course.includedInSubscription && (
              <p className="text-sm text-muted">También incluido en la suscripción a todo el catálogo.</p>
            )}
            {!user && (
              <p className="text-sm text-muted">
                ¿Ya lo tienes?{" "}
                <Link href={`/entrar?next=/cursos/${course.slug}`} className="link">
                  Entra en tu cuenta
                </Link>
              </p>
            )}
          </>
        )}
      </aside>
    </div>
  );
}
