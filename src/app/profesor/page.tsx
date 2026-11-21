import { asc, eq } from "drizzle-orm";
import { Suspense } from "react";
import { db } from "@/db";
import { courses, courseTeachers } from "@/db/schema";
import { requireRole } from "@/lib/session";

export default function ProfesorPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Mis cursos como profesor</h1>
      <Suspense fallback={<p className="text-stone-400">Cargando…</p>}>
        <TeacherCourses />
      </Suspense>
    </div>
  );
}

async function TeacherCourses() {
  const user = await requireRole(["teacher", "admin"], "/profesor");

  const list = await db
    .select({ id: courses.id, title: courses.title, status: courses.status })
    .from(courseTeachers)
    .innerJoin(courses, eq(courses.id, courseTeachers.courseId))
    .where(eq(courseTeachers.userId, user.id))
    .orderBy(asc(courses.title));

  if (list.length === 0) {
    return <p className="text-stone-500">No tienes cursos asignados.</p>;
  }

  return (
    <ul className="space-y-3">
      {list.map((c) => (
        <li key={c.id} className="rounded-lg border border-stone-200 bg-white p-4">
          <span className="font-medium">{c.title}</span>
          <p className="text-sm text-stone-500">
            Dudas y foro: disponibles en la siguiente fase.
          </p>
        </li>
      ))}
    </ul>
  );
}
