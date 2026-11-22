import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getUserForAdmin } from "@/lib/admin/queries";
import { RoleControl, SessionsControl } from "../../_components/user-controls";
import { formatDate, formatDateTime, PageHeader, roleLabel, Section } from "../../_components/ui";

export default function UserPage({ params }: PageProps<"/admin/usuarios/[id]">) {
  return (
    <Suspense fallback={<p className="text-subtle">Cargando…</p>}>
      <UserDetail params={params} />
    </Suspense>
  );
}

async function UserDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getUserForAdmin(id);
  if (!data) notFound();
  const { user: u, isMe, enrolled, teaching, activeSessions, activity, completedLessons } = data;

  return (
    <div className="space-y-6">
      <PageHeader
        back={{ href: "/admin/usuarios", label: "Volver a usuarios" }}
        title={u.name}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <span>{u.email}</span>
            <span className={`chip ${u.role === "admin" ? "chip-warning" : u.role === "teacher" ? "chip-accent" : ""}`}>{roleLabel[u.role]}</span>
            <span className="chip">{u.emailVerified ? "Email confirmado" : "Email sin confirmar"}</span>
          </span>
        }
      />

      <dl className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          ["Alta", formatDate(u.createdAt)],
          ["Cursos con acceso", String(enrolled.length)],
          ["Lecciones completadas", String(completedLessons)],
          ["Profesor de", `${teaching.length} curso${teaching.length === 1 ? "" : "s"}`],
        ].map(([k, v]) => (
          <div key={k} className="glass space-y-1 p-4">
            <dt className="text-sm text-muted">{k}</dt>
            <dd className="text-lg font-medium">{v}</dd>
          </div>
        ))}
      </dl>

      <div className="grid gap-6 xl:grid-cols-2">
        <Section title="Rol" description="Qué puede hacer en la plataforma.">
          <RoleControl userId={u.id} email={u.email} role={u.role} isMe={isMe} />
        </Section>
        <Section title="Sesiones" description="Dispositivos en los que tiene la sesión iniciada.">
          {isMe ? <p className="text-sm text-muted">Para cerrar tus sesiones, usa «Salir».</p> : <SessionsControl userId={u.id} active={activeSessions} isMe={isMe} />}
        </Section>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Section title="Cursos" description="Los que ha comprado o a los que se le ha dado acceso. La suscripción no aparece aquí.">
          {enrolled.length === 0 ? (
            <p className="text-sm text-muted">Ninguno.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {enrolled.map((e) => (
                <li key={e.courseId} className="inset flex justify-between gap-3 px-4 py-2.5">
                  <Link href={`/admin/cursos/${e.courseId}#alumnos`} className="hover:underline">{e.title}</Link>
                  <span className="text-muted">{e.source === "purchase" ? "Comprado" : "Acceso gratis"}, {formatDate(e.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </Section>
        <Section title="Profesor de">
          {teaching.length === 0 ? (
            <p className="text-sm text-muted">Ningún curso. Se asigna desde la página de cada curso.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {teaching.map((t) => (
                <li key={t.courseId} className="inset px-4 py-2.5">
                  <Link href={`/admin/cursos/${t.courseId}#profesores`} className="hover:underline">{t.title}</Link>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>

      <Section title="Actividad relacionada" description="Cambios hechos sobre esta cuenta o por esta persona desde el panel.">
        {activity.length === 0 ? (
          <p className="text-sm text-muted">Sin actividad registrada.</p>
        ) : (
          <ul className="space-y-3 text-sm">
            {activity.map((a) => (
              <li key={a.id}>
                <p>{a.summary}</p>
                <p className="text-xs text-subtle">{a.actorEmail}, {formatDateTime(a.createdAt)}</p>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}
