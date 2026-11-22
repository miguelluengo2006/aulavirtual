import { Suspense } from "react";
import { listActivity } from "@/lib/admin/queries";
import { Card, EmptyState, FilterPills, formatDateTime, PageHeader, Pagination } from "../_components/ui";

const types = [
  { key: undefined, label: "Todo" },
  { key: "course", label: "Cursos" },
  { key: "lesson", label: "Lecciones" },
  { key: "quiz", label: "Quizzes" },
  { key: "user", label: "Usuarios" },
  { key: "teacher", label: "Profesores" },
  { key: "enrollment", label: "Accesos" },
] as const;

export default function ActivityPage({ searchParams }: PageProps<"/admin/actividad">) {
  return (
    <div className="space-y-6">
      <PageHeader title="Actividad" description="Cada cambio hecho desde el panel: quién, qué y cuándo. No se puede editar ni borrar." />
      <Suspense fallback={<p className="a-subtle">Cargando…</p>}>
        <Log searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Log({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const type = one(sp.tipo);
  const page = Number(one(sp.pagina)) || 1;
  const { rows, pages } = await listActivity({ page, type });
  const href = (t?: string, p?: number) => {
    const s = new URLSearchParams();
    if (t) s.set("tipo", t);
    if (p && p > 1) s.set("pagina", String(p));
    const str = s.toString();
    return `/admin/actividad${str ? `?${str}` : ""}`;
  };

  return (
    <div className="space-y-4">
      <FilterPills active={type} items={types.map((t) => ({ key: t.key, label: t.label, href: href(t.key) }))} />
      <Card padded={false}>
        {rows.length === 0 ? (
          <EmptyState title="Todavía no hay actividad" text="Aquí aparecerá cada cambio que se haga desde el panel." />
        ) : (
          <ol className="divide-y divide-[#e1e7f0]">
            {rows.map((a) => (
              <li key={a.id} className="flex flex-col gap-1 px-5 py-3.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
                <p className="text-sm">{a.summary}</p>
                <p className="shrink-0 text-xs a-subtle">{a.actorEmail}, {formatDateTime(a.createdAt)}</p>
              </li>
            ))}
          </ol>
        )}
      </Card>
      <Pagination page={Math.min(page, pages)} pages={pages} href={(p) => href(type, p)} />
    </div>
  );
}
