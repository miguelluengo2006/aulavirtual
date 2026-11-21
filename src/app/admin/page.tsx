import { desc, sql } from "drizzle-orm";
import Link from "next/link";
import { Suspense } from "react";
import { db } from "@/db";
import { courses, lessons } from "@/db/schema";
import { formatPrice } from "@/lib/format";
import { requireRole } from "@/lib/session";

const statusLabel = {
  draft: "Borrador",
  published: "Publicado",
  archived: "Archivado",
} as const;

export default function AdminPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Panel de administración</h1>
      <Suspense fallback={<p className="text-stone-400">Cargando…</p>}>
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
      lessonCount: sql<number>`(select count(*)::int from ${lessons} where ${lessons.courseId} = ${courses.id})`,
    })
    .from(courses)
    .orderBy(desc(courses.updatedAt));

  if (list.length === 0) {
    return (
      <p className="text-stone-500">
        No hay cursos todavía. Importa uno con{" "}
        <code className="rounded bg-stone-100 px-1">npm run course:import</code>.
      </p>
    );
  }

  return (
    <table className="w-full overflow-hidden rounded-lg border border-stone-200 bg-white text-sm">
      <thead className="bg-stone-50 text-left text-stone-500">
        <tr>
          <th className="px-4 py-2 font-medium">Curso</th>
          <th className="px-4 py-2 font-medium">Estado</th>
          <th className="px-4 py-2 font-medium">Lecciones</th>
          <th className="px-4 py-2 font-medium">Precio</th>
        </tr>
      </thead>
      <tbody>
        {list.map((c) => (
          <tr key={c.id} className="border-t border-stone-100">
            <td className="px-4 py-2">
              <Link href={`/admin/cursos/${c.id}`} className="font-medium hover:underline">
                {c.title}
              </Link>
              <div className="text-xs text-stone-400">{c.slug}</div>
            </td>
            <td className="px-4 py-2">{statusLabel[c.status]}</td>
            <td className="px-4 py-2">{c.lessonCount}</td>
            <td className="px-4 py-2">{formatPrice(c.priceCents, c.currency)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
