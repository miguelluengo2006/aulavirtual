"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  changeRole,
  grantAccessToUser,
  inviteUser,
  revokeAccess,
  revokeSessions,
  sendPasswordLink,
  setBanned,
} from "../_actions/people";
import { ConfirmButton, ConfirmDialog, Dialog, useAdminAction } from "./feedback";

type Role = "admin" | "teacher" | "student";
const names: Record<Role, string> = { admin: "Administrador", teacher: "Profesor", student: "Alumno" };
const effects: Record<Role, string> = {
  admin: "Tendrá acceso completo al panel: cursos, usuarios, accesos y todo lo demás.",
  teacher: "Podrá atender las dudas y el foro de los cursos que tenga asignados.",
  student: "Solo verá los cursos a los que tenga acceso. Si era profesor, deja de serlo en todos sus cursos.",
};

/** Desplegable de rol que pide confirmación antes de cambiarlo. Sirve en la lista y en la ficha. */
export function RoleSelect({ userId, email, role, disabled, compact }: { userId: string; email: string; role: Role; disabled?: boolean; compact?: boolean }) {
  const { run } = useAdminAction();
  const [pending, setPending] = useState<Role | null>(null);
  const touchesAdmin = pending === "admin" || role === "admin";

  return (
    <>
      <label className="sr-only" htmlFor={`rol-${userId}`}>Rol de {email}</label>
      <select
        id={`rol-${userId}`}
        className={`a-input ${compact ? "w-auto py-1.5 pr-8 text-sm max-sm:w-[8.5rem] max-sm:pr-7" : ""}`}
        value={role}
        disabled={disabled}
        title={disabled ? "No puedes cambiar tu propio rol" : undefined}
        onChange={(e) => setPending(e.target.value as Role)}
      >
        {(Object.keys(names) as Role[]).map((r) => (
          <option key={r} value={r}>{names[r]}</option>
        ))}
      </select>
      <ConfirmDialog
        open={pending !== null}
        onClose={() => setPending(null)}
        title={pending ? `¿Cambiar a ${email} a ${names[pending].toLowerCase()}?` : ""}
        description={
          pending && (
            <>
              <p>{effects[pending]}</p>
              {role === "admin" && <p className="text-amber-700">Se cerrarán todas sus sesiones para que pierda el acceso al panel ya.</p>}
            </>
          )
        }
        typeToConfirm={touchesAdmin ? email : undefined}
        confirmLabel="Cambiar rol"
        danger={role === "admin"}
        onConfirm={() => run(() => changeRole({ userId, role: pending! }), "Rol cambiado.")}
      />
    </>
  );
}

export function UserActions({
  userId,
  email,
  banned,
  role,
  isMe,
  hasPassword,
  activeSessions,
}: {
  userId: string;
  email: string;
  banned: boolean;
  role: Role;
  isMe: boolean;
  hasPassword: boolean;
  activeSessions: number;
}) {
  const { run, pending } = useAdminAction();
  const [reason, setReason] = useState("");
  if (isMe) return null;

  return (
    <div className="flex flex-wrap gap-2">
      <ConfirmButton
        label={hasPassword ? "Enviar enlace para cambiar contraseña" : "Reenviar invitación"}
        className="a-btn a-btn-secondary"
        disabled={pending || banned}
        title={hasPassword ? "¿Enviar un enlace para cambiar la contraseña?" : "¿Reenviar la invitación?"}
        description={<p>Le llegará a {email} un email con un enlace de un solo uso para {hasPassword ? "elegir una contraseña nueva (válido 1 hora)" : "elegir su contraseña (válido 7 días)"}.</p>}
        confirmLabel="Enviar email"
        onConfirm={() => run(() => sendPasswordLink({ userId }), "Email enviado.")}
      />
      <ConfirmButton
        label="Cerrar sesiones"
        className="a-btn a-btn-secondary"
        disabled={pending || activeSessions === 0}
        title="¿Cerrar todas sus sesiones?"
        description={<p>Tendrá que volver a entrar en todos sus dispositivos. Útil si ha perdido el móvil o crees que alguien usa su cuenta.</p>}
        confirmLabel="Cerrar sesiones"
        onConfirm={() => run(() => revokeSessions({ userId }), "Sesiones cerradas.")}
      />
      {banned ? (
        <ConfirmButton
          label="Desbloquear cuenta"
          className="a-btn a-btn-primary"
          disabled={pending}
          title="¿Desbloquear la cuenta?"
          description={<p>Podrá volver a entrar con su contraseña y verá de nuevo sus cursos.</p>}
          confirmLabel="Desbloquear"
          onConfirm={() => run(() => setBanned({ userId, banned: false }), "Cuenta desbloqueada.")}
        />
      ) : (
        <ConfirmButton
          label="Bloquear cuenta"
          className="a-btn a-btn-danger-soft border border-red-200"
          disabled={pending || role === "admin"}
          title={`¿Bloquear a ${email}?`}
          description={
            <>
              <p>No podrá entrar en la plataforma y se cerrarán sus sesiones ahora mismo. Su progreso y sus compras se conservan.</p>
              {role === "admin" && <p className="text-amber-700">Es administrador: quítale antes el rol.</p>}
            </>
          }
          confirmLabel="Bloquear cuenta"
          danger
          onConfirm={() => run(() => setBanned({ userId, banned: true, reason }), "Cuenta bloqueada.")}
        >
          <label className="block">
            <span className="a-label">Motivo (opcional, solo lo ven los administradores)</span>
            <input className="a-input" maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} />
          </label>
        </ConfirmButton>
      )}
    </div>
  );
}

export function UserCourses({
  userId,
  enrolled,
  options,
}: {
  userId: string;
  enrolled: { courseId: string; title: string; source: "purchase" | "manual"; date: string }[];
  options: { id: string; title: string }[];
}) {
  const { run, pending } = useAdminAction();
  const [courseId, setCourseId] = useState("");

  return (
    <div className="space-y-4">
      {enrolled.length === 0 ? (
        <p className="text-sm a-muted">No tiene ningún curso comprado ni con acceso gratis.</p>
      ) : (
        <ul className="divide-y divide-[#e1e7f0] rounded-xl border border-[#e1e7f0]">
          {enrolled.map((e) => (
            <li key={e.courseId} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
              <div>
                <p className="font-medium">{e.title}</p>
                <p className="text-xs a-subtle">
                  {e.source === "purchase" ? "Comprado" : "Acceso gratis"} el {e.date}
                </p>
              </div>
              {e.source === "manual" ? (
                <ConfirmButton
                  label="Quitar"
                  className="a-btn a-btn-ghost a-btn-sm"
                  title={`¿Quitar el acceso a "${e.title}"?`}
                  description={<p>Dejará de poder ver el curso. Su progreso se conserva por si vuelve a tener acceso.</p>}
                  confirmLabel="Quitar acceso"
                  onConfirm={() => run(() => revokeAccess({ courseId: e.courseId, userId }), "Acceso quitado.")}
                />
              ) : (
                <span className="text-xs a-subtle">Se quita con un reembolso</span>
              )}
            </li>
          ))}
        </ul>
      )}
      {options.length > 0 && (
        <form
          className="flex flex-col gap-2 sm:flex-row"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!courseId) return;
            if (await run(() => grantAccessToUser({ userId, courseId }), "Acceso concedido.")) setCourseId("");
          }}
        >
          <label className="sr-only" htmlFor="dar-curso">Curso al que dar acceso</label>
          <select id="dar-curso" className="a-input" value={courseId} onChange={(e) => setCourseId(e.target.value)} required>
            <option value="">Elige un curso…</option>
            {options.map((c) => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
          </select>
          <button disabled={pending || !courseId} className="a-btn a-btn-primary shrink-0">
            Dar acceso gratis
          </button>
        </form>
      )}
    </div>
  );
}

export function InviteButton({ courses }: { courses: { id: string; title: string }[] }) {
  const router = useRouter();
  const { run, pending } = useAdminAction();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("student");
  const [picked, setPicked] = useState<string[]>([]);
  const reset = () => {
    setName("");
    setEmail("");
    setRole("student");
    setPicked([]);
  };

  return (
    <>
      <button type="button" className="a-btn a-btn-primary" onClick={() => setOpen(true)}>
        Invitar usuario
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Invitar a una persona" wide>
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            const ok = await run(
              () => inviteUser({ name, email, role, courseIds: picked }),
              `Invitación enviada a ${email}.`,
              (d) => router.push(`/admin/usuarios/${d.id}`),
            );
            if (ok) {
              reset();
              setOpen(false);
            }
          }}
        >
          <p className="text-sm a-muted">
            Le crearemos la cuenta y le llegará un email para elegir su contraseña. El enlace vale 7 días.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="a-label">Nombre</span>
              <input className="a-input" required maxLength={80} value={name} onChange={(e) => setName(e.target.value)} autoFocus />
            </label>
            <label className="block">
              <span className="a-label">Email</span>
              <input className="a-input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
          </div>
          <fieldset>
            <legend className="a-label">Rol</legend>
            <div className="grid gap-2 sm:grid-cols-3">
              {(Object.keys(names) as Role[]).map((r) => (
                <label key={r} className={`cursor-pointer rounded-xl border p-3 text-sm ${role === r ? "border-[#1d4ed8] bg-[#eff4ff]" : "border-[#e1e7f0] hover:bg-[#f8fafd]"}`}>
                  <input type="radio" name="rol" className="sr-only" checked={role === r} onChange={() => setRole(r)} />
                  <span className="block font-medium">{names[r]}</span>
                  <span className="mt-0.5 block text-xs a-muted">{r === "admin" ? "Control total del panel" : r === "teacher" ? "Atiende dudas y foro" : "Aprende en sus cursos"}</span>
                </label>
              ))}
            </div>
          </fieldset>
          {courses.length > 0 && role !== "admin" && (
            <fieldset>
              <legend className="a-label">Acceso gratis a cursos (opcional)</legend>
              <div className="max-h-44 space-y-1 overflow-y-auto rounded-xl border border-[#e1e7f0] p-2">
                {courses.map((c) => (
                  <label key={c.id} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-[#f3f6fb]">
                    <input
                      type="checkbox"
                      className="size-4 accent-[#1d4ed8]"
                      checked={picked.includes(c.id)}
                      onChange={(e) => setPicked((p) => (e.target.checked ? [...p, c.id] : p.filter((x) => x !== c.id)))}
                    />
                    {c.title}
                  </label>
                ))}
              </div>
            </fieldset>
          )}
          <div className="flex justify-end gap-2">
            <button type="button" className="a-btn a-btn-secondary" onClick={() => setOpen(false)}>Cancelar</button>
            <button disabled={pending} className="a-btn a-btn-primary">{pending ? "Enviando…" : "Enviar invitación"}</button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
