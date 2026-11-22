import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getCourseForEdit } from "@/lib/admin/queries";
import { plural } from "@/lib/format";
import { CourseActionsBar, DeleteCourse } from "../../_components/course-actions";
import { ContentEditor } from "../../_components/content-editor";
import { CourseForm } from "../../_components/course-form";
import { AccessPanel, TeachersPanel } from "../../_components/people-panels";
import { PageHeader, Section, StatusChip } from "../../_components/ui";

export default function AdminCoursePage({ params }: PageProps<"/admin/cursos/[id]">) {
  return (
    <Suspense fallback={<p className="text-subtle">Cargando…</p>}>
      <Editor params={params} />
    </Suspense>
  );
}

async function Editor({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getCourseForEdit(id);
  if (!data) notFound();
  const { course, teachers, access, progressByLesson, issues } = data;
  const lessonCount = course.modules.reduce((n, m) => n + m.lessons.length, 0);
  const purchases = access.filter((a) => a.source === "purchase").length;

  return (
    <div className="space-y-6">
      <PageHeader
        back={{ href: "/admin/cursos", label: "Volver a cursos" }}
        title={course.title}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <StatusChip status={course.status} />
            <span>
              {plural(course.modules.length, "módulo", "módulos")}, {plural(lessonCount, "lección", "lecciones")}
            </span>
            <Link href={`/cursos/${course.slug}`} className="link text-sm">
              Ver como alumno
            </Link>
          </span>
        }
        actions={<CourseActionsBar id={course.id} status={course.status} issues={issues} />}
      />

      {course.status !== "published" && issues.length > 0 && (
        <div className="glass space-y-2 border-warning/40 p-5 text-sm">
          <p className="font-medium text-warning">Para poder publicarlo falta:</p>
          <ul className="list-disc space-y-1 pl-5 text-muted">
            {issues.map((i) => (
              <li key={i}>{i}</li>
            ))}
          </ul>
        </div>
      )}

      {course.importNotes.length > 0 && (
        <div className="glass space-y-2 p-5 text-sm">
          <p className="font-medium">Notas de la importación con Claude Code</p>
          <ul className="list-disc space-y-1 pl-5 text-muted">
            {course.importNotes.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
        </div>
      )}

      <Section id="contenido" title="Contenido" description="Ordena los módulos y las lecciones, añade nuevas y edita su vídeo y su quiz.">
        <ContentEditor
          courseId={course.id}
          courseSlug={course.slug}
          modules={course.modules.map((m) => ({
            id: m.id,
            title: m.title,
            lessons: m.lessons.map((l) => ({
              id: l.id,
              title: l.title,
              description: l.description,
              videoKey: l.videoKey,
              durationSeconds: l.durationSeconds,
              questionCount: l.quiz?.questions.length ?? 0,
              progressCount: progressByLesson[l.id] ?? 0,
            })),
          }))}
        />
      </Section>

      <Section id="datos" title="Datos del curso">
        <CourseForm
          course={{
            id: course.id,
            title: course.title,
            slug: course.slug,
            description: course.description,
            priceCents: course.priceCents,
            currency: course.currency,
            includedInSubscription: course.includedInSubscription,
          }}
        />
      </Section>

      <div className="grid gap-6 xl:grid-cols-2">
        <Section id="profesores" title="Profesores" description="Atienden las dudas y el foro de este curso.">
          <TeachersPanel courseId={course.id} teachers={teachers} />
        </Section>
        <Section id="alumnos" title="Alumnos" description="Da acceso gratis a quien quieras (becas, pruebas, colaboradores).">
          <AccessPanel courseId={course.id} access={access} />
        </Section>
      </div>

      <Section id="eliminar" title="Eliminar el curso">
        <DeleteCourse id={course.id} slug={course.slug} title={course.title} status={course.status} purchases={purchases} />
      </Section>
    </div>
  );
}
