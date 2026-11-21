import { asc, eq } from "drizzle-orm";
import { Suspense } from "react";
import { db } from "@/db";
import { courses, courseTeachers } from "@/db/schema";
import { requireRole } from "@/lib/session";

export default function ProfesorPage() {
  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="text-4xl">Tus cursos como profesor</h1>
        <p className="text-muted">Aquí atenderás las dudas y el foro de cada curso.</p>
      </div>
      <Suspense fallback={<p className="text-subtle">Cargando…</p>}>
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
    return (
      <div className="glass p-8 text-muted">
        Todavía no tienes cursos asignados. El administrador te los asignará.
      </div>
    );
  }

  return (
    <ul className="grid gap-5 md:grid-cols-2">
      {list.map((c) => (
        <li key={c.id} className="glass space-y-2 p-6">
          <h2 className="text-xl">{c.title}</h2>
          <p className="text-sm text-muted">
            Dudas y foro: disponibles en la siguiente fase.
          </p>
        </li>
      ))}
    </ul>
  );
}
