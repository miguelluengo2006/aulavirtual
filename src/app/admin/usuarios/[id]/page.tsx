import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getUserForAdmin } from "@/lib/admin/queries";
import { RoleSelect, UserActions, UserCourses } from "../../_components/user-controls";
import { Card, formatDate, formatDateTime, PageHeader } from "../../_components/ui";

export default function UserPage({ params }: PageProps<"/admin/usuarios/[id]">) {
  return (
    <Suspense fallback={<p className="a-subtle">Cargando…</p>}>
      <UserDetail params={params} />
    </Suspense>
  );
}

async function UserDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getUserForAdmin(id);
  if (!data) notFound();
  const { user: u, isMe, enrolled, teaching, activeSessions, activity, completedLessons, hasPassword, courseOptions } = data;

  return (
    <div className="space-y-6">
      <PageHeader
        back={{ href: "/admin/usuarios", label: "Usuarios" }}
        title={
          <span className="flex items-center gap-3">
            <span aria-hidden className="grid size-11 shrink-0 place-items-center rounded-full bg-[#e7eefb] text-lg font-medium text-[#1e40af]">
              {u.name.slice(0, 1).toUpperCase()}
            </span>
            <span className="min-w-0">
              {u.name}
              <span className="block text-sm font-normal a-muted">{u.email}</span>
            </span>
          </span>
        }
      />

      {u.banned && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-800">
          <p className="font-medium">Cuenta bloqueada{u.bannedAt ? ` desde el ${formatDate(u.bannedAt)}` : ""}</p>
          {u.banReason && <p className="mt-1">Motivo: {u.banReason}</p>}
        </div>
      )}
      {!hasPassword && !u.banned && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
          Todavía no ha elegido su contraseña (invitación pendiente).
        </div>
      )}

      <Card title="Cuenta">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,280px)_1fr]">
          <div className="space-y-1.5">
            <span className="a-label">Rol</span>
            <RoleSelect userId={u.id} email={u.email} role={u.role} disabled={isMe} />
            {isMe && <span className="a-help">Es tu cuenta: solo otro administrador puede cambiar tu rol.</span>}
          </div>
          <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
            {[
              ["Alta", formatDate(u.createdAt)],
              ["Email", u.emailVerified ? "Confirmado" : "Sin confirmar"],
              ["Sesiones abiertas", String(activeSessions)],
              ["Lecciones completadas", String(completedLessons)],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="text-xs a-subtle">{k}</dt>
                <dd className="mt-0.5 font-medium">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
        {!isMe && (
          <div className="mt-6 border-t border-[#e1e7f0] pt-5">
            <UserActions userId={u.id} email={u.email} banned={u.banned} role={u.role} isMe={isMe} hasPassword={hasPassword} activeSessions={activeSessions} />
          </div>
        )}
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Card title="Cursos" description="Comprados o con acceso gratis. La suscripción da acceso aparte.">
          <UserCourses
            userId={u.id}
            enrolled={enrolled.map((e) => ({ courseId: e.courseId, title: e.title, source: e.source, date: formatDate(e.createdAt) }))}
            options={courseOptions}
          />
        </Card>
        <Card title="Profesor de">
          {teaching.length === 0 ? (
            <p className="text-sm a-muted">Ningún curso. Se asigna desde la pestaña «Profesores y alumnos» de cada curso.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {teaching.map((t) => (
                <li key={t.courseId}>
                  <Link href={`/admin/cursos/${t.courseId}?tab=personas`} className="font-medium text-[#1d4ed8] hover:underline">{t.title}</Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card title="Actividad" description="Cambios hechos sobre esta cuenta o por esta persona desde el panel.">
        {activity.length === 0 ? (
          <p className="text-sm a-muted">Sin actividad registrada.</p>
        ) : (
          <ul className="space-y-3 text-sm">
            {activity.map((a) => (
              <li key={a.id} className="flex flex-col gap-0.5 sm:flex-row sm:justify-between sm:gap-6">
                <span>{a.summary}</span>
                <span className="shrink-0 text-xs a-subtle">{a.actorEmail}, {formatDateTime(a.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
