import { and, asc, eq, inArray, isNotNull, or, sql } from "drizzle-orm";
import Link from "next/link";
import { Suspense } from "react";
import { db } from "@/db";
import { courses, enrollments, lessonProgress, lessons, subscriptions } from "@/db/schema";
import { plural } from "@/lib/format";
import { requireUser } from "@/lib/session";

export default function MisCursosPage() {
  return (
    <div className="space-y-8">
      <h1 className="text-4xl">Mis cursos</h1>
      <Suspense fallback={<p className="text-subtle">Cargando…</p>}>
        <MyCourses />
      </Suspense>
    </div>
  );
}

async function MyCourses() {
  const user = await requireUser("/mis-cursos");

  const [sub] = await db
    .select({ id: subscriptions.id })
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.userId, user.id),
        inArray(subscriptions.status, ["active", "trialing"]),
      ),
    )
    .limit(1);

  const purchased = db
    .select({ courseId: enrollments.courseId })
    .from(enrollments)
    .where(eq(enrollments.userId, user.id));

  const list = await db
    .select({
      id: courses.id,
      slug: courses.slug,
      title: courses.title,
      description: courses.description,
      total: sql<number>`(select count(*)::int from "lessons" where "lessons"."course_id" = "courses"."id")`,
    })
    .from(courses)
    .where(
      and(
        inArray(courses.status, ["published", "archived"]),
        sub
          ? or(
              inArray(courses.id, purchased),
              and(eq(courses.status, "published"), eq(courses.includedInSubscription, true)),
            )
          : inArray(courses.id, purchased),
      ),
    )
    .orderBy(asc(courses.title));

  if (list.length === 0) {
    return (
      <div className="glass space-y-4 p-8">
        <p className="text-muted">
          Aún no tienes cursos. Cuando compres uno o te suscribas, aparecerán aquí.
        </p>
        <Link href="/#cursos" className="btn btn-primary">
          Ver el catálogo
        </Link>
      </div>
    );
  }

  const doneRows = await db
    .select({ courseId: lessons.courseId, done: sql<number>`count(*)::int` })
    .from(lessonProgress)
    .innerJoin(lessons, eq(lessons.id, lessonProgress.lessonId))
    .where(
      and(
        eq(lessonProgress.userId, user.id),
        isNotNull(lessonProgress.completedAt),
        inArray(lessons.courseId, list.map((c) => c.id)),
      ),
    )
    .groupBy(lessons.courseId);
  const done = new Map(doneRows.map((r) => [r.courseId, r.done]));

  return (
    <ul className="grid gap-5 md:grid-cols-2">
      {list.map((c) => {
        const n = done.get(c.id) ?? 0;
        const pct = c.total ? Math.round((n / c.total) * 100) : 0;
        return (
          <li key={c.id}>
            <Link
              href={`/cursos/${c.slug}`}
              className="glass flex h-full flex-col gap-4 p-6 transition-colors hover:bg-white/10"
            >
              <div className="flex-1 space-y-2">
                <h2 className="text-xl">{c.title}</h2>
                <p className="line-clamp-2 text-sm text-muted">{c.description}</p>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted">
                    {n} de {plural(c.total, "lección", "lecciones")}
                  </span>
                  <span className={pct === 100 ? "text-accent" : "text-muted"}>{pct} %</span>
                </div>
                <div className="progress-track">
                  <div className="progress-bar" style={{ width: `${pct}%` }} />
                </div>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
