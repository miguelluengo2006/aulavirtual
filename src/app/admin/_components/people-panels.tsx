"use client";

import Link from "next/link";
import { useState } from "react";
import { addTeacher, grantAccess, removeTeacher, revokeAccess } from "../_actions/people";
import { ConfirmButton, useAdminAction } from "./feedback";

function AddByEmail({ id, label, button, onAdd }: { id: string; label: string; button: string; onAdd: (email: string) => Promise<boolean> }) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="flex flex-col gap-2 sm:flex-row"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        if (await onAdd(email)) setEmail("");
        setBusy(false);
      }}
    >
      <label className="sr-only" htmlFor={id}>{label}</label>
      <input id={id} className="a-input" type="email" required placeholder={label} autoComplete="off" value={email} onChange={(e) => setEmail(e.target.value)} />
      <button disabled={busy} className="a-btn a-btn-primary shrink-0">{button}</button>
    </form>
  );
}

function PersonRow({ userId, name, email, children }: { userId: string; name: string; email: string; children: React.ReactNode }) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
      <Link href={`/admin/usuarios/${userId}`} className="flex min-w-0 items-center gap-3 hover:underline">
        <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-full bg-[#e7eefb] text-xs font-medium text-[#1e40af]">
          {name.slice(0, 1).toUpperCase()}
        </span>
        <span className="min-w-0 text-sm">
          <span className="block font-medium">{name}</span>
          <span className="block truncate text-xs a-subtle">{email}</span>
        </span>
      </Link>
      {children}
    </li>
  );
}

export function TeachersPanel({ courseId, teachers }: { courseId: string; teachers: { userId: string; name: string; email: string }[] }) {
  const { run } = useAdminAction();
  return (
    <div className="space-y-4">
      {teachers.length === 0 ? (
        <p className="text-sm text-amber-700">Este curso no tiene profesor: nadie atenderá sus dudas ni su foro.</p>
      ) : (
        <ul className="divide-y divide-[#e1e7f0] rounded-xl border border-[#e1e7f0]">
          {teachers.map((t) => (
            <PersonRow key={t.userId} {...t}>
              <ConfirmButton
                label="Quitar"
                className="a-btn a-btn-ghost a-btn-sm"
                title={`¿Quitar a ${t.name} como profesor?`}
                description={<p>Dejará de ver este curso y sus dudas. Si no le quedan cursos, volverá a ser alumno.</p>}
                confirmLabel="Quitar"
                onConfirm={() => run(() => removeTeacher({ courseId, userId: t.userId }), "Profesor quitado.")}
              />
            </PersonRow>
          ))}
        </ul>
      )}
      <AddByEmail id="add-teacher" label="Email del profesor" button="Asignar profesor" onAdd={(email) => run(() => addTeacher({ courseId, email }), "Profesor asignado.")} />
      <p className="text-xs a-subtle">Tiene que tener cuenta. Si no la tiene, invítale desde Usuarios.</p>
    </div>
  );
}

export function AccessPanel({
  courseId,
  access,
}: {
  courseId: string;
  access: { userId: string; name: string; email: string; source: "purchase" | "manual" }[];
}) {
  const { run } = useAdminAction();
  const purchases = access.filter((a) => a.source === "purchase");
  const manual = access.filter((a) => a.source === "manual");
  return (
    <div className="space-y-4">
      <p className="text-sm a-muted">
        {purchases.length === 0 ? "Nadie lo ha comprado todavía." : `${purchases.length} ${purchases.length === 1 ? "alumno lo ha" : "alumnos lo han"} comprado.`} Los suscriptores
        acceden si el curso está incluido en la suscripción.
      </p>
      {manual.length > 0 && (
        <ul className="divide-y divide-[#e1e7f0] rounded-xl border border-[#e1e7f0]">
          {manual.map((a) => (
            <PersonRow key={a.userId} {...a}>
              <ConfirmButton
                label="Quitar acceso"
                className="a-btn a-btn-ghost a-btn-sm"
                title={`¿Quitar el acceso de ${a.name}?`}
                description={<p>Dejará de poder ver el curso. Su progreso se conserva por si vuelve a tener acceso.</p>}
                confirmLabel="Quitar acceso"
                onConfirm={() => run(() => revokeAccess({ courseId, userId: a.userId }), "Acceso quitado.")}
              />
            </PersonRow>
          ))}
        </ul>
      )}
      <AddByEmail id="add-access" label="Email del alumno" button="Dar acceso gratis" onAdd={(email) => run(() => grantAccess({ courseId, email }), "Acceso concedido.")} />
    </div>
  );
}
