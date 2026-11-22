"use client";

import { useState } from "react";
import { changeRole, revokeSessions } from "../_actions/people";
import { ConfirmButton, useAdminAction } from "./feedback";

type Role = "admin" | "teacher" | "student";
const names: Record<Role, string> = { admin: "Administrador", teacher: "Profesor", student: "Alumno" };
const effects: Record<Role, string> = {
  admin: "Tendrá acceso completo al panel de administración: cursos, usuarios, accesos y todo lo demás.",
  teacher: "Podrá atender las dudas y el foro de los cursos que tenga asignados.",
  student: "Solo verá los cursos a los que tenga acceso. Si era profesor, deja de serlo en todos sus cursos.",
};

export function RoleControl({ userId, email, role, isMe }: { userId: string; email: string; role: Role; isMe: boolean }) {
  const { run } = useAdminAction();
  const [next, setNext] = useState<Role>(role);

  if (isMe) {
    return <p className="text-sm text-muted">Eres tú. Tu rol solo lo puede cambiar otro administrador.</p>;
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <label className="block flex-1 space-y-1.5">
        <span className="pl-1 text-sm text-muted">Rol</span>
        <select className="field" value={next} onChange={(e) => setNext(e.target.value as Role)}>
          {(Object.keys(names) as Role[]).map((r) => (
            <option key={r} value={r}>
              {names[r]}
            </option>
          ))}
        </select>
      </label>
      <ConfirmButton
        label="Cambiar rol"
        className="btn btn-primary"
        disabled={next === role}
        title={`¿Hacer ${names[next].toLowerCase()} a ${email}?`}
        description={
          <>
            <p>{effects[next]}</p>
            {role === "admin" && <p className="text-warning">Se cerrarán todas sus sesiones para que pierda el acceso al panel ya.</p>}
          </>
        }
        typeToConfirm={next === "admin" || role === "admin" ? email : undefined}
        confirmLabel="Cambiar rol"
        danger={role === "admin"}
        onConfirm={() => run(() => changeRole({ userId, role: next }), "Rol cambiado.")}
      />
    </div>
  );
}

export function SessionsControl({ userId, active, isMe }: { userId: string; active: number; isMe: boolean }) {
  const { run } = useAdminAction();
  if (isMe) return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-muted">
        {active === 0 ? "No tiene sesiones abiertas." : `${active} sesión${active === 1 ? "" : "es"} abierta${active === 1 ? "" : "s"}.`}
      </p>
      <ConfirmButton
        label="Cerrar todas sus sesiones"
        className="btn btn-ghost btn-sm"
        disabled={active === 0}
        title="¿Cerrar todas sus sesiones?"
        description={<p>Tendrá que volver a entrar en todos sus dispositivos. Útil si ha perdido el móvil o crees que alguien usa su cuenta.</p>}
        confirmLabel="Cerrar sesiones"
        onConfirm={() => run(() => revokeSessions({ userId }), "Sesiones cerradas.")}
      />
    </div>
  );
}
