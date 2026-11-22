import Link from "next/link";
import { Suspense } from "react";
import { listActivity } from "@/lib/admin/queries";
import { formatDateTime, PageHeader, Pagination } from "../_components/ui";

const types = [
  { value: undefined, label: "Todo" },
  { value: "course", label: "Cursos" },
  { value: "lesson", label: "Lecciones" },
  { value: "quiz", label: "Quizzes" },
  { value: "user", label: "Usuarios" },
  { value: "teacher", label: "Profesores" },
  { value: "enrollment", label: "Accesos" },
] as const;

export default function ActivityPage({ searchParams }: PageProps<"/admin/actividad">) {
  return (
    <div className="space-y-6">
      <PageHeader title="Actividad" description="Cada cambio hecho desde el panel: quién, qué y cuándo. No se puede editar ni borrar." />
      <Suspense fallback={<p className="text-subtle">Cargando…</p>}>
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
      <nav aria-label="Filtrar por tipo" className="flex flex-wrap gap-2">
        {types.map((t) => (
          <Link key={t.label} href={href(t.value)} aria-current={type === t.value ? "page" : undefined} className={`btn btn-sm ${type === t.value ? "btn-primary" : "btn-ghost"}`}>
            {t.label}
          </Link>
        ))}
      </nav>
      {rows.length === 0 ? (
        <div className="glass p-8 text-muted">Todavía no hay actividad registrada.</div>
      ) : (
        <ol className="glass divide-y divide-white/8 p-2">
          {rows.map((a) => (
            <li key={a.id} className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
              <p className="text-sm">{a.summary}</p>
              <p className="shrink-0 text-xs text-subtle">
                {a.actorEmail}, {formatDateTime(a.createdAt)}
              </p>
            </li>
          ))}
        </ol>
      )}
      <Pagination page={Math.min(page, pages)} pages={pages} href={(p) => href(type, p)} />
    </div>
  );
}
