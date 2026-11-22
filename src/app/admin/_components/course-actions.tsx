"use client";

import { useRouter } from "next/navigation";
import { deleteCourse, setCourseStatus } from "../_actions/courses";
import { ConfirmButton, useAdminAction } from "./feedback";

type Status = "draft" | "published" | "archived";

export function CourseActionsBar({ id, status, issues }: { id: string; status: Status; issues: string[] }) {
  const { run, pending } = useAdminAction();
  const set = (s: Status, msg: string) => run(() => setCourseStatus({ id, status: s }), msg);

  return (
    <div className="flex flex-wrap gap-2">
      {status !== "published" && (
        <ConfirmButton
          label="Publicar"
          className="btn btn-primary btn-sm"
          disabled={pending || issues.length > 0}
          title="¿Publicar el curso?"
          description={<p>Aparecerá en el catálogo y quien tenga acceso podrá verlo.</p>}
          confirmLabel="Publicar"
          onConfirm={() => set("published", "Curso publicado.")}
        />
      )}
      {status === "published" && (
        <ConfirmButton
          label="Pasar a borrador"
          className="btn btn-ghost btn-sm"
          disabled={pending}
          title="¿Pasar a borrador?"
          description={
            <p>Desaparecerá del catálogo y los alumnos dejarán de verlo hasta que lo vuelvas a publicar.</p>
          }
          confirmLabel="Pasar a borrador"
          onConfirm={() => set("draft", "El curso ya no está publicado.")}
        />
      )}
      {status !== "archived" && (
        <ConfirmButton
          label="Archivar"
          className="btn btn-ghost btn-sm"
          disabled={pending}
          title="¿Archivar el curso?"
          description={
            <p>
              Sale del catálogo y nadie nuevo puede acceder. Quien lo compró lo conserva. Puedes volver a publicarlo cuando
              quieras.
            </p>
          }
          confirmLabel="Archivar"
          onConfirm={() => set("archived", "Curso archivado.")}
        />
      )}
    </div>
  );
}

export function DeleteCourse({ id, slug, title, status, purchases }: { id: string; slug: string; title: string; status: Status; purchases: number }) {
  const router = useRouter();
  const { run } = useAdminAction();
  const blocked =
    status === "published"
      ? "Para eliminarlo, pásalo antes a borrador o archívalo."
      : purchases > 0
        ? "Hay alumnos que lo han comprado: solo se puede archivar."
        : null;

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">
        Eliminar un curso borra para siempre sus módulos, lecciones, quizzes, el progreso de los alumnos y su foro. Los vídeos
        de R2 no se tocan.
      </p>
      {blocked && <p className="text-sm text-warning">{blocked}</p>}
      <ConfirmButton
        label="Eliminar curso"
        danger
        className="btn btn-sm border border-danger/50 text-danger hover:bg-danger/10"
        disabled={Boolean(blocked)}
        title={`¿Eliminar "${title}"?`}
        description={<p>Esto no se puede deshacer.</p>}
        typeToConfirm={slug}
        confirmLabel="Eliminar para siempre"
        onConfirm={(typed) => run(() => deleteCourse({ id, confirmSlug: typed }), "Curso eliminado.", () => router.push("/admin/cursos"))}
      />
    </div>
  );
}
