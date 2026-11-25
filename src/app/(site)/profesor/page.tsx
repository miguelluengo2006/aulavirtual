import { asc, eq } from "drizzle-orm";
import Link from "next/link";
import { Suspense } from "react";
import { db } from "@/db";
import { courses, courseTeachers } from "@/db/schema";
import { pendingDoubts } from "@/lib/community";
import { formatDateTime, plural } from "@/lib/format";
import { requireRole } from "@/lib/session";

export default function ProfesorPage() {
  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="text-4xl">Tus cursos como profesor</h1>
        <p className="text-muted">Las dudas pendientes de tus cursos, de la más antigua a la más reciente, y el acceso a cada foro.</p>
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
    .select({ id: courses.id, slug: courses.slug, title: courses.title, status: courses.status })
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

  const pending = await pendingDoubts(list.map((c) => c.id));

  return (
    <ul className="space-y-6">
      {list.map((c) => {
        const mine = pending.filter((d) => d.courseId === c.id);
        return (
          <li key={c.id} className="glass space-y-4 p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl">{c.title}</h2>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`chip ${mine.length ? "chip-warning" : "chip-accent"}`}>
                  {mine.length ? plural(mine.length, "duda pendiente", "dudas pendientes") : "Sin dudas pendientes"}
                </span>
                <Link href={`/cursos/${c.slug}/foro`} className="btn btn-ghost btn-sm">
                  Abrir el foro
                </Link>
              </div>
            </div>
            {mine.length > 0 && (
              <ol className="space-y-2">
                {mine.map((d) => (
                  <li key={d.id}>
                    <Link
                      href={`/cursos/${c.slug}/${d.lessonExternalId}#dudas`}
                      className="inset block space-y-1 px-4 py-3 hover:bg-white/5"
                    >
                      <span className="block text-xs text-subtle">
                        {d.lessonTitle} · {d.author} · {formatDateTime(d.createdAt)}
                      </span>
                      <span className="line-clamp-2 text-sm">{d.body}</span>
                    </Link>
                  </li>
                ))}
              </ol>
            )}
          </li>
        );
      })}
    </ul>
  );
}
