import Link from "next/link";
import { Suspense } from "react";
import { listCourses } from "@/lib/admin/queries";
import { formatPrice, plural } from "@/lib/format";
import { Card, EmptyState, FilterPills, formatDate, PageHeader, StatusChip } from "../_components/ui";

export default function CoursesPage({ searchParams }: PageProps<"/admin/cursos">) {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Cursos"
        description="Crea cursos, edita su temario y decide cuándo se publican."
        actions={<Link href="/admin/cursos/nuevo" className="a-btn a-btn-primary">Crear curso</Link>}
      />
      <Suspense fallback={<p className="a-subtle">Cargando…</p>}>
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
      <FilterPills
        active={status}
        items={[
          { label: "Todos", href: "/admin/cursos" },
          { label: "Borradores", href: "/admin/cursos?estado=draft", key: "draft" },
          { label: "Publicados", href: "/admin/cursos?estado=published", key: "published" },
          { label: "Archivados", href: "/admin/cursos?estado=archived", key: "archived" },
        ]}
      />
      <Card padded={false}>
        {list.length === 0 ? (
          <EmptyState
            title={status ? "No hay cursos con este estado" : "Todavía no hay cursos"}
            text="Crea uno con el asistente, o pídele a Claude Code que lo prepare a partir de una carpeta."
            action={<Link href="/admin/cursos/nuevo" className="a-btn a-btn-primary">Crear curso</Link>}
          />
        ) : (
          <div className="relative overflow-x-auto">
            <table className="a-table min-w-[680px]">
              <thead>
                <tr>
                  <th>Curso</th>
                  <th>Estado</th>
                  <th>Contenido</th>
                  <th>Precio</th>
                  <th>Actualizado</th>
                </tr>
              </thead>
              <tbody>
                {list.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <Link href={`/admin/cursos/${c.id}`} className="font-medium hover:underline">{c.title}</Link>
                      <p className="text-xs a-subtle">/cursos/{c.slug}</p>
                    </td>
                    <td><StatusChip status={c.status} /></td>
                    <td className="a-muted">{plural(c.lessonCount, "lección", "lecciones")}, {plural(c.studentCount, "alumno", "alumnos")}</td>
                    <td>{formatPrice(c.priceCents, c.currency)}</td>
                    <td className="a-muted">{formatDate(c.updatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
