import { and, asc, eq, inArray, isNotNull, or, sql } from "drizzle-orm";
import Link from "next/link";
import { Suspense } from "react";
import { db } from "@/db";
import { courses, enrollments, lessonProgress, lessons, subscriptions } from "@/db/schema";
import { requireUser } from "@/lib/session";

export default function MisCursosPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Mis cursos</h1>
      <Suspense fallback={<p className="text-stone-400">Cargando…</p>}>
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
      total: sql<number>`(select count(*)::int from ${lessons} where ${lessons.courseId} = ${courses.id})`,
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
      <p className="text-stone-500">
        Aún no tienes cursos. Cuando compres uno o te suscribas aparecerán aquí.
      </p>
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
    <ul className="space-y-3">
      {list.map((c) => {
        const n = done.get(c.id) ?? 0;
        const pct = c.total ? Math.round((n / c.total) * 100) : 0;
        return (
          <li key={c.id}>
            <Link href={`/cursos/${c.slug}`} className="block rounded-lg border border-stone-200 bg-white p-4 hover:border-stone-400">
              <h2 className="font-medium">{c.title}</h2>
              <p className="text-sm text-stone-600">{c.description}</p>
              <div className="mt-3 flex items-center gap-3 text-xs text-stone-500">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-stone-100">
                  <div className="h-full bg-green-600" style={{ width: `${pct}%` }} />
                </div>
                {n}/{c.total} lecciones
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
