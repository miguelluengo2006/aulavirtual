import { and, asc, eq, inArray, or } from "drizzle-orm";
import { Suspense } from "react";
import { db } from "@/db";
import { courses, enrollments, subscriptions } from "@/db/schema";
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
    .select({ id: courses.id, title: courses.title, description: courses.description })
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

  return (
    <ul className="space-y-3">
      {list.map((c) => (
        <li key={c.id} className="rounded-lg border border-stone-200 bg-white p-4">
          <h2 className="font-medium">{c.title}</h2>
          <p className="text-sm text-stone-600">{c.description}</p>
        </li>
      ))}
    </ul>
  );
}
