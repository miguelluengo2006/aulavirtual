import Link from "next/link";
import { Suspense } from "react";
import { listCourses } from "@/lib/admin/queries";
import { formatPrice, plural } from "@/lib/format";
import { formatDate, PageHeader, StatusChip } from "../_components/ui";

const filters = [
  { value: undefined, label: "Todos" },
  { value: "draft", label: "Borradores" },
  { value: "published", label: "Publicados" },
  { value: "archived", label: "Archivados" },
] as const;

export default function CoursesPage({ searchParams }: PageProps<"/admin/cursos">) {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Cursos"
        description="Crea cursos, edita su contenido y decide cuándo se publican."
        actions={
          <Link href="/admin/cursos/nuevo" className="btn btn-primary btn-sm">
            Crear curso
          </Link>
        }
      />
      <Suspense fallback={<p className="text-subtle">Cargando…</p>}>
        <CourseTable searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function CourseTable({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const raw = Array.isArray(sp.estado) ? sp.estado[0] : sp.estado;
  const status = raw === "draft" || raw === "published" || raw === "archived" ? raw : undefined;
  const list = await listCourses(status);

  return (
    <div className="space-y-4">
      <nav aria-label="Filtrar por estado" className="flex flex-wrap gap-2">
        {filters.map((f) => (
          <Link
            key={f.label}
            href={f.value ? `/admin/cursos?estado=${f.value}` : "/admin/cursos"}
            aria-current={status === f.value ? "page" : undefined}
            className={`btn btn-sm ${status === f.value ? "btn-primary" : "btn-ghost"}`}
          >
            {f.label}
          </Link>
        ))}
      </nav>

      {list.length === 0 ? (
        <div className="glass space-y-3 p-8 text-muted">
          <p>{status ? "No hay cursos con este estado." : "Todavía no hay cursos."}</p>
          <p className="text-sm">
            Crea uno desde aquí o pídele a Claude Code que lo prepare a partir de una carpeta.
          </p>
        </div>
      ) : (
        <div className="glass overflow-x-auto p-2">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="text-left text-subtle">
              <tr>
                <th className="px-4 py-3 font-normal">Curso</th>
                <th className="px-4 py-3 font-normal">Estado</th>
                <th className="px-4 py-3 font-normal">Contenido</th>
                <th className="px-4 py-3 font-normal">Precio</th>
                <th className="px-4 py-3 font-normal">Actualizado</th>
              </tr>
            </thead>
            <tbody>
              {list.map((c) => (
                <tr key={c.id} className="border-t border-white/8">
                  <td className="px-4 py-3">
                    <Link href={`/admin/cursos/${c.id}`} className="font-medium hover:underline">
                      {c.title}
                    </Link>
                    <div className="text-xs text-subtle">/cursos/{c.slug}</div>
                  </td>
                  <td className="px-4 py-3"><StatusChip status={c.status} /></td>
                  <td className="px-4 py-3 text-muted">
                    {plural(c.lessonCount, "lección", "lecciones")}, {plural(c.studentCount, "alumno", "alumnos")}
                  </td>
                  <td className="px-4 py-3">{formatPrice(c.priceCents, c.currency)}</td>
                  <td className="px-4 py-3 text-muted">{formatDate(c.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
