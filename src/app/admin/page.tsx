import { desc, sql } from "drizzle-orm";
import Link from "next/link";
import { Suspense } from "react";
import { db } from "@/db";
import { courses } from "@/db/schema";
import { formatPrice } from "@/lib/format";
import { requireRole } from "@/lib/session";

const statusLabel = {
  draft: "Borrador",
  published: "Publicado",
  archived: "Archivado",
} as const;

export default function AdminPage() {
  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="text-4xl">Panel de administración</h1>
        <p className="text-muted">Revisa los cursos importados antes de publicarlos.</p>
      </div>
      <Suspense fallback={<p className="text-subtle">Cargando…</p>}>
        <CourseTable />
      </Suspense>
    </div>
  );
}

async function CourseTable() {
  await requireRole(["admin"], "/admin");

  const list = await db
    .select({
      id: courses.id,
      title: courses.title,
      slug: courses.slug,
      status: courses.status,
      priceCents: courses.priceCents,
      currency: courses.currency,
      updatedAt: courses.updatedAt,
      lessonCount: sql<number>`(select count(*)::int from "lessons" where "lessons"."course_id" = "courses"."id")`,
    })
    .from(courses)
    .orderBy(desc(courses.updatedAt));

  if (list.length === 0) {
    return (
      <div className="glass p-8 text-muted">
        No hay cursos todavía. Pídele a Claude Code que prepare uno a partir de una carpeta, o
        impórtalo con <code className="rounded bg-white/10 px-1.5 py-0.5 text-white">npm run course:import</code>.
      </div>
    );
  }

  return (
    <div className="glass overflow-x-auto p-2">
    <table className="w-full text-sm">
      <thead className="text-left text-subtle">
        <tr>
          <th className="px-4 py-3 font-normal">Curso</th>
          <th className="px-4 py-3 font-normal">Estado</th>
          <th className="px-4 py-3 font-normal">Lecciones</th>
          <th className="px-4 py-3 font-normal">Precio</th>
        </tr>
      </thead>
      <tbody>
        {list.map((c) => (
          <tr key={c.id} className="border-t border-white/8">
            <td className="px-4 py-3">
              <Link href={`/admin/cursos/${c.id}`} className="font-medium hover:underline">
                {c.title}
              </Link>
              <div className="text-xs text-subtle">{c.slug}</div>
            </td>
            <td className="px-4 py-3">
              <span className={`chip ${c.status === "draft" ? "chip-warning" : c.status === "published" ? "chip-accent" : ""}`}>
                {statusLabel[c.status]}
              </span>
            </td>
            <td className="px-4 py-3">{c.lessonCount}</td>
            <td className="px-4 py-3">{formatPrice(c.priceCents, c.currency)}</td>
          </tr>
        ))}
      </tbody>
    </table>
    </div>
  );
}
