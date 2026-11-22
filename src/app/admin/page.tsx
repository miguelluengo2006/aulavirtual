import Link from "next/link";
import { Suspense } from "react";
import { getOverview } from "@/lib/admin/queries";
import { formatDateTime, PageHeader } from "./_components/ui";

export default function AdminHome() {
  return (
    <Suspense fallback={<p className="text-subtle">Cargando…</p>}>
      <Overview />
    </Suspense>
  );
}

async function Overview() {
  const o = await getOverview();
  const stats = [
    { label: "Cursos publicados", value: o.courses.published, href: "/admin/cursos?estado=published" },
    { label: "Borradores", value: o.courses.draft, href: "/admin/cursos?estado=draft" },
    { label: "Alumnos", value: o.users.student, href: "/admin/usuarios?rol=student" },
    { label: "Profesores", value: o.users.teacher, href: "/admin/usuarios?rol=teacher" },
    { label: "Accesos a cursos", value: o.enrollments, href: "/admin/cursos" },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Resumen"
        description="Lo esencial de la plataforma de un vistazo."
        actions={
          <Link href="/admin/cursos/nuevo" className="btn btn-primary btn-sm">
            Crear curso
          </Link>
        }
      />

      <ul className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        {stats.map((s) => (
          <li key={s.label}>
            <Link href={s.href} className="glass block space-y-1 p-5 transition-colors hover:bg-white/10">
              <p className="text-3xl font-semibold tabular-nums tracking-tight">{s.value}</p>
              <p className="text-sm text-muted">{s.label}</p>
            </Link>
          </li>
        ))}
      </ul>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="glass space-y-4 p-6">
          <h2 className="text-xl">Borradores</h2>
          {o.drafts.length === 0 ? (
            <p className="text-sm text-muted">No hay cursos en borrador.</p>
          ) : (
            <ul className="space-y-3">
              {o.drafts.map((d) => (
                <li key={d.id} className="inset space-y-1 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <Link href={`/admin/cursos/${d.id}`} className="font-medium hover:underline">
                      {d.title}
                    </Link>
                    {d.issues.length === 0 ? (
                      <span className="chip chip-accent">Listo para publicar</span>
                    ) : (
                      <span className="chip chip-warning">
                        {d.issues.length} pendiente{d.issues.length === 1 ? "" : "s"}
                      </span>
                    )}
                  </div>
                  {d.issues.length > 0 && <p className="text-sm text-muted">{d.issues[0]}</p>}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="glass space-y-4 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl">Actividad reciente</h2>
            <Link href="/admin/actividad" className="link text-sm">
              Ver toda
            </Link>
          </div>
          {o.recent.length === 0 ? (
            <p className="text-sm text-muted">Aquí aparecerá cada cambio que se haga desde el panel.</p>
          ) : (
            <ul className="space-y-3 text-sm">
              {o.recent.map((a) => (
                <li key={a.id} className="space-y-0.5">
                  <p>{a.summary}</p>
                  <p className="text-xs text-subtle">
                    {a.actorEmail}, {formatDateTime(a.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
