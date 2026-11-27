import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { buyingFaqs, Check, CourseCover, Faq, lessonParts, SectionHeading } from "@/components/landing/marketing";
import { canAccessCourse } from "@/lib/access";
import { flatLessons, getCourseOutline, getCourseQuestionCount, getProgressMap } from "@/lib/course-data";
import { formatDuration, formatPrice, formatTotalMinutes, plural } from "@/lib/format";
import { getCurrentUser } from "@/lib/session";

export async function generateMetadata({ params }: PageProps<"/cursos/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const course = await getCourseOutline(slug);
  if (!course || course.status !== "published") return { title: "Curso" };
  return { title: course.title, description: course.description };
}

export default function CoursePage({ params }: PageProps<"/cursos/[slug]">) {
  return (
    <Suspense fallback={<p className="text-subtle">Cargando…</p>}>
      <Course params={params} />
    </Suspense>
  );
}

// Ficha del curso: lo que se aprende, temario, cómo es cada lección, profesor y compra.
async function Course({ params }: { params: Promise<{ slug: string }> }) {
  await connection();
  const { slug } = await params;
  const [course, user] = await Promise.all([getCourseOutline(slug), getCurrentUser()]);
  if (!course) notFound();

  const hasAccess = user ? await canAccessCourse(user.id, course.id) : false;
  // Los borradores solo existen para quien puede verlos (admin y profesores del curso).
  if (course.status === "draft" && !hasAccess) notFound();

  const all = flatLessons(course);
  const [progress, questionCount] = await Promise.all([
    user && hasAccess ? getProgressMap(user.id, all.map((l) => l.id)) : Promise.resolve(new Map()),
    getCourseQuestionCount(course.id),
  ]);
  const done = all.filter((l) => progress.get(l.id)?.completed).length;
  const next = all.find((l) => !progress.get(l.id)?.completed) ?? all[0];
  const totalSeconds = all.reduce((s, l) => s + (l.durationSeconds ?? 0), 0);
  const pct = all.length ? Math.round((done / all.length) * 100) : 0;

  const stats = [
    { value: String(course.modules.length), label: course.modules.length === 1 ? "módulo" : "módulos" },
    { value: String(all.length), label: all.length === 1 ? "lección" : "lecciones" },
    ...(totalSeconds >= 60 ? [{ value: formatTotalMinutes(totalSeconds), label: "de vídeo" }] : []),
    ...(questionCount > 0 ? [{ value: String(questionCount), label: "preguntas de repaso" }] : []),
  ];

  return (
    <div className="space-y-12 pb-8">
      {/* Cabecera */}
      <CourseCover slug={course.slug} className="rounded-[2.5rem] border border-white/10">
        <div className="space-y-7 px-6 py-10 sm:px-12 sm:py-14">
          <nav aria-label="Ruta" className="text-sm text-white/70">
            <Link href="/cursos" className="hover:text-white">
              Cursos
            </Link>
            <span aria-hidden> / </span>
            <span className="text-white/90">{course.title}</span>
          </nav>
          <div className="flex flex-wrap gap-2">
            {course.status === "draft" && <span className="chip chip-warning">Borrador: solo lo ven el admin y los profesores</span>}
            <span className="chip border-white/20 bg-black/25 text-white">Online · a tu ritmo</span>
            {course.includedInSubscription && <span className="chip chip-accent">Incluido en la suscripción</span>}
          </div>
          <div className="max-w-3xl space-y-4">
            <h1 className="text-4xl sm:text-6xl">{course.title}</h1>
            <p className="text-lg text-white/80 sm:text-xl">{course.description}</p>
          </div>
          <dl className="grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="rounded-2xl border border-white/12 bg-black/20 px-4 py-3 backdrop-blur-sm">
                <dt className="sr-only">{s.label}</dt>
                <dd>
                  <span className="block text-2xl font-semibold tracking-tight">{s.value}</span>
                  <span className="text-sm text-white/70">{s.label}</span>
                </dd>
              </div>
            ))}
          </dl>
          {course.instructors.length > 0 && (
            <p className="flex items-center gap-3 text-sm">
              <span aria-hidden className="grid size-9 place-items-center rounded-full bg-white text-sm font-semibold text-navy">
                {course.instructors[0].name.charAt(0)}
              </span>
              <span className="text-white/80">
                Imparte <span className="font-medium text-white">{course.instructors[0].name}</span>
              </span>
            </p>
          )}
        </div>
      </CourseCover>

      <div className="grid gap-10 lg:grid-cols-[1fr_380px] lg:items-start">
        {/* Compra o progreso: en móvil, justo después de la cabecera */}
        <aside className="space-y-4 lg:sticky lg:top-24 lg:order-last">
          <div className="glass glass-strong space-y-6 p-6 sm:p-7">
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
                <Link href={`/cursos/${course.slug}/foro`} className="btn btn-ghost w-full">
                  Entrar en el foro del curso
                </Link>
              </>
            ) : (
              <>
                <div className="space-y-1">
                  <p className="text-4xl font-semibold tracking-tight">{formatPrice(course.priceCents, course.currency)}</p>
                  <p className="text-sm text-muted">Pago único · acceso para siempre</p>
                </div>
                <button className="btn btn-primary w-full" disabled>
                  Comprar curso (muy pronto)
                </button>
                {course.includedInSubscription && (
                  <p className="text-center text-sm text-muted">
                    o accede con la{" "}
                    <Link href="/cursos#precios" className="link">
                      suscripción a todo el catálogo
                    </Link>
                  </p>
                )}
                <div className="space-y-3 border-t border-white/10 pt-5">
                  <p className="text-sm font-medium">El curso incluye</p>
                  <ul className="space-y-2.5 text-sm text-muted">
                    <Included>
                      {plural(all.length, "lección", "lecciones")} en vídeo
                      {totalSeconds >= 60 && ` (${formatTotalMinutes(totalSeconds)})`}
                    </Included>
                    <Included>Resumen de cada vídeo con sus ideas clave</Included>
                    {questionCount > 0 && <Included>{questionCount} preguntas de repaso, distintas en cada intento</Included>}
                    <Included>Dudas resueltas por el profesor en cada lección</Included>
                    <Included>Foro del curso con el resto de alumnos</Included>
                    <Included>Desde el ordenador, la tablet o el móvil</Included>
                  </ul>
                </div>
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
          </div>
        </aside>

        <div className="min-w-0 space-y-16">
          {course.highlights.length > 0 && (
            <section className="space-y-6" aria-labelledby="aprenderas">
              <h2 id="aprenderas" className="text-3xl">
                Lo que aprenderás
              </h2>
              <ul className="glass grid gap-x-8 gap-y-4 p-6 sm:grid-cols-2 sm:p-8">
                {course.highlights.map((h) => (
                  <li key={h} className="flex gap-3 text-sm leading-relaxed">
                    <span className="mt-0.5">
                      <Check />
                    </span>
                    <span>{h}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {course.audience && (
            <section className="space-y-4" aria-labelledby="para-quien">
              <h2 id="para-quien" className="text-3xl">
                Para quién es
              </h2>
              <p className="inset px-6 py-5 text-lg text-muted">{course.audience}</p>
            </section>
          )}

          <section className="space-y-6" aria-labelledby="temario">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <h2 id="temario" className="text-3xl">
                Temario
              </h2>
              <p className="text-sm text-subtle">
                {plural(course.modules.length, "módulo", "módulos")} · {plural(all.length, "lección", "lecciones")}
                {totalSeconds >= 60 && ` · ${formatTotalMinutes(totalSeconds)}`}
              </p>
            </div>
            <div className="space-y-3">
              {course.modules.map((m, mi) => {
                const moduleSeconds = m.lessons.reduce((s, l) => s + (l.durationSeconds ?? 0), 0);
                const moduleDone = m.lessons.filter((l) => progress.get(l.id)?.completed).length;
                return (
                  <details key={m.id} open={mi === 0} className="glass group overflow-hidden">
                    <summary className="flex cursor-pointer list-none items-center gap-4 px-5 py-4 sm:px-6 [&::-webkit-details-marker]:hidden">
                      <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-white/10 text-sm font-semibold">
                        {mi + 1}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium">{m.title}</span>
                        <span className="block text-xs text-subtle">
                          {plural(m.lessons.length, "lección", "lecciones")}
                          {moduleSeconds > 0 && ` · ${formatTotalMinutes(moduleSeconds)}`}
                          {hasAccess && moduleDone > 0 && ` · ${moduleDone}/${m.lessons.length} completadas`}
                        </span>
                      </span>
                      <span
                        aria-hidden
                        className="grid size-7 shrink-0 place-items-center rounded-full bg-white/10 text-lg leading-none transition-transform group-open:rotate-45 motion-reduce:transition-none"
                      >
                        +
                      </span>
                    </summary>
                    <ol className="space-y-1 border-t border-white/8 p-2">
                      {m.lessons.map((l, li) => {
                        const completed = progress.get(l.id)?.completed;
                        const row = (
                          <span className="flex items-start gap-3 rounded-2xl px-3 py-3 text-sm sm:px-4">
                            <span
                              aria-label={completed ? "Completada" : undefined}
                              className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-full text-[10px] ${completed ? "bg-accent text-navy" : "border border-white/20 text-subtle"}`}
                            >
                              {completed ? "✓" : li + 1}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block font-medium">{l.title}</span>
                              {l.description && <span className="mt-0.5 line-clamp-2 text-xs text-subtle">{l.description}</span>}
                            </span>
                            <span className="shrink-0 tabular-nums text-subtle">{formatDuration(l.durationSeconds)}</span>
                          </span>
                        );
                        return (
                          <li key={l.id}>
                            {hasAccess ? (
                              <Link href={`/cursos/${course.slug}/${l.externalId}`} className="block rounded-2xl hover:bg-white/5">
                                {row}
                              </Link>
                            ) : (
                              row
                            )}
                          </li>
                        );
                      })}
                    </ol>
                  </details>
                );
              })}
            </div>
          </section>

          <section className="space-y-6" aria-labelledby="cada-leccion">
            <SectionHeading title="Cómo es cada lección" text="Todas siguen la misma estructura, para que sepas siempre dónde está cada cosa." />
            <ol className="grid gap-3 sm:grid-cols-2">
              {lessonParts.map((p, i) => (
                <li key={p.title} className="glass flex gap-4 p-5">
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-accent/15 text-sm font-semibold text-accent">
                    {i + 1}
                  </span>
                  <div className="space-y-1">
                    <h3 className="text-base font-medium">{p.title}</h3>
                    <p className="text-sm text-muted">{p.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          {course.instructors.length > 0 && (
            <section className="space-y-6" aria-labelledby="profesor">
              <h2 id="profesor" className="text-3xl">
                {course.instructors.length === 1 ? "Tu profesor" : "Tus profesores"}
              </h2>
              <ul className="grid gap-3 sm:grid-cols-2">
                {course.instructors.map((t) => (
                  <li key={t.name} className="glass flex items-center gap-4 p-5">
                    <span aria-hidden className="grid size-14 shrink-0 place-items-center rounded-full bg-gradient-to-br from-info/50 to-accent/50 text-xl font-semibold">
                      {t.name.charAt(0)}
                    </span>
                    <div>
                      <p className="font-medium">{t.name}</p>
                      <p className="text-sm text-muted">{t.role}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {!hasAccess && (
            <section className="space-y-6" aria-labelledby="dudas-compra">
              <h2 id="dudas-compra" className="text-3xl">
                Antes de comprar
              </h2>
              <Faq items={buyingFaqs} />
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function Included({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-0.5">
        <Check />
      </span>
      <span>{children}</span>
    </li>
  );
}
