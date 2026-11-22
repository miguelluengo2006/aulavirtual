"use client";

import Link from "next/link";
import { useState } from "react";
import { addTeacher, grantAccess, removeTeacher, revokeAccess } from "../_actions/people";
import { ConfirmButton, useAdminAction } from "./feedback";

function AddByEmail({ label, button, onAdd }: { label: string; button: string; onAdd: (email: string) => Promise<boolean> }) {
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
      <label className="sr-only" htmlFor={`add-${button}`}>
        {label}
      </label>
      <input
        id={`add-${button}`}
        className="field"
        type="email"
        required
        placeholder={label}
        autoComplete="off"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <button disabled={busy} className="btn btn-ghost shrink-0">
        {button}
      </button>
    </form>
  );
}

export function TeachersPanel({ courseId, teachers }: { courseId: string; teachers: { userId: string; name: string; email: string }[] }) {
  const { run } = useAdminAction();
  return (
    <div className="space-y-4">
      {teachers.length === 0 ? (
        <p className="text-sm text-muted">Este curso no tiene profesor. Nadie atenderá sus dudas ni su foro.</p>
      ) : (
        <ul className="space-y-2">
          {teachers.map((t) => (
            <li key={t.userId} className="inset flex flex-wrap items-center justify-between gap-2 px-4 py-2.5">
              <Link href={`/admin/usuarios/${t.userId}`} className="min-w-0 hover:underline">
                <span className="font-medium">{t.name}</span> <span className="text-sm text-muted">{t.email}</span>
              </Link>
              <ConfirmButton
                label="Quitar"
                className="btn btn-sm text-muted hover:text-white"
                title={`¿Quitar a ${t.name} como profesor?`}
                description={<p>Dejará de ver este curso y sus dudas. Si no le quedan cursos, volverá a ser alumno.</p>}
                confirmLabel="Quitar"
                onConfirm={() => run(() => removeTeacher({ courseId, userId: t.userId }), "Profesor quitado.")}
              />
            </li>
          ))}
        </ul>
      )}
      <AddByEmail
        label="Email del profesor (tiene que tener cuenta)"
        button="Asignar profesor"
        onAdd={(email) => run(() => addTeacher({ courseId, email }), "Profesor asignado.")}
      />
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
  const purchases = access.filter((a) => a.source === "purchase").length;
  const manual = access.filter((a) => a.source === "manual");
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        {purchases === 0 ? "Nadie lo ha comprado todavía." : `${purchases} ${purchases === 1 ? "alumno lo ha" : "alumnos lo han"} comprado.`}{" "}
        Los suscriptores acceden si el curso está incluido en la suscripción.
      </p>
      {manual.length > 0 && (
        <ul className="space-y-2">
          {manual.map((a) => (
            <li key={a.userId} className="inset flex flex-wrap items-center justify-between gap-2 px-4 py-2.5">
              <Link href={`/admin/usuarios/${a.userId}`} className="min-w-0 hover:underline">
                <span className="font-medium">{a.name}</span> <span className="text-sm text-muted">{a.email}</span>
              </Link>
              <ConfirmButton
                label="Quitar acceso"
                className="btn btn-sm text-muted hover:text-white"
                title={`¿Quitar el acceso de ${a.name}?`}
                description={<p>Dejará de poder ver el curso. Su progreso se conserva por si vuelve a tener acceso.</p>}
                confirmLabel="Quitar acceso"
                onConfirm={() => run(() => revokeAccess({ courseId, userId: a.userId }), "Acceso quitado.")}
              />
            </li>
          ))}
        </ul>
      )}
      <AddByEmail
        label="Email del alumno (tiene que tener cuenta)"
        button="Dar acceso gratis"
        onAdd={(email) => run(() => grantAccess({ courseId, email }), "Acceso concedido.")}
      />
    </div>
  );
}
