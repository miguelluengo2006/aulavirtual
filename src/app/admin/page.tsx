import Link from "next/link";
import { Suspense } from "react";
import { getOverview } from "@/lib/admin/queries";
import { Card, formatDateTime, PageHeader } from "./_components/ui";

export default function AdminHome() {
  return (
    <Suspense fallback={<p className="a-subtle">Cargando…</p>}>
      <Overview />
    </Suspense>
  );
}

async function Overview() {
  const o = await getOverview();
  const stats = [
    { label: "Cursos publicados", value: o.courses.published, href: "/admin/cursos?estado=published", tone: "bg-[#ccfbf1] text-[#0f766e]" },
    { label: "Borradores", value: o.courses.draft, href: "/admin/cursos?estado=draft", tone: "bg-[#fef3c7] text-[#92400e]" },
    { label: "Alumnos", value: o.users.student, href: "/admin/usuarios?filtro=student", tone: "bg-[#dbeafe] text-[#1e40af]" },
    { label: "Profesores", value: o.users.teacher, href: "/admin/usuarios?filtro=teacher", tone: "bg-[#e0e7ff] text-[#3730a3]" },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Resumen"
        description="Lo esencial de IDESIE AV de un vistazo."
        actions={
          <>
            <Link href="/admin/usuarios" className="a-btn a-btn-secondary">Gestionar usuarios</Link>
            <Link href="/admin/cursos/nuevo" className="a-btn a-btn-primary">Crear curso</Link>
          </>
        }
      />

      <ul className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <li key={s.label}>
            <Link href={s.href} className="a-card flex h-full flex-col gap-3 p-5 transition-shadow hover:shadow-md">
              <span className={`w-fit rounded-lg px-2 py-0.5 text-xs font-medium ${s.tone}`}>{s.label}</span>
              <span className="text-3xl font-semibold tabular-nums tracking-tight">{s.value}</span>
            </Link>
          </li>
        ))}
      </ul>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card title="Borradores" description="Cursos sin publicar y lo que les falta." actions={<Link href="/admin/cursos?estado=draft" className="a-btn a-btn-ghost a-btn-sm">Ver todos</Link>}>
          {o.drafts.length === 0 ? (
            <p className="text-sm a-muted">No hay cursos en borrador.</p>
          ) : (
            <ul className="divide-y divide-[#e1e7f0]">
              {o.drafts.map((d) => (
                <li key={d.id} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <Link href={`/admin/cursos/${d.id}`} className="font-medium hover:underline">{d.title}</Link>
                    {d.issues.length > 0 && <p className="text-sm a-muted">{d.issues[0]}</p>}
                  </div>
                  {d.issues.length === 0 ? (
                    <span className="a-chip a-chip-teal">Listo para publicar</span>
                  ) : (
                    <span className="a-chip a-chip-amber">{d.issues.length} pendiente{d.issues.length === 1 ? "" : "s"}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Actividad reciente" actions={<Link href="/admin/actividad" className="a-btn a-btn-ghost a-btn-sm">Ver toda</Link>}>
          {o.recent.length === 0 ? (
            <p className="text-sm a-muted">Aquí aparecerá cada cambio que se haga desde el panel.</p>
          ) : (
            <ul className="space-y-3 text-sm">
              {o.recent.map((a) => (
                <li key={a.id}>
                  <p>{a.summary}</p>
                  <p className="text-xs a-subtle">{a.actorEmail}, {formatDateTime(a.createdAt)}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
