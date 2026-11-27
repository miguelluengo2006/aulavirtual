import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getCourseForEdit } from "@/lib/admin/queries";
import { resourcesForCourseEdit } from "@/lib/resources";
import { formatPrice, plural } from "@/lib/format";
import { ContentEditor } from "../../_components/content-editor";
import { CourseActionsBar, DeleteCourse } from "../../_components/course-actions";
import { CourseForm } from "../../_components/course-form";
import { AccessPanel, TeachersPanel } from "../../_components/people-panels";
import { ResourcesPanel } from "../../_components/resources-panel";
import { Card, PageHeader, StatusChip, Tabs } from "../../_components/ui";

const TABS = ["temario", "recursos", "datos", "personas", "ajustes"] as const;
type Tab = (typeof TABS)[number];

export default function AdminCoursePage({ params, searchParams }: PageProps<"/admin/cursos/[id]">) {
  return (
    <Suspense fallback={<p className="a-subtle">Cargando…</p>}>
      <Editor params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function Editor({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const rawTab = Array.isArray(sp.tab) ? sp.tab[0] : sp.tab;
  const tab: Tab = TABS.includes(rawTab as Tab) ? (rawTab as Tab) : "temario";
  const data = await getCourseForEdit(id);
  if (!data) notFound();
  const courseResources = await resourcesForCourseEdit(id);
  const { course, teachers, access, progressByLesson, issues } = data;
  const lessonCount = course.modules.reduce((n, m) => n + m.lessons.length, 0);
  const purchases = access.filter((a) => a.source === "purchase").length;
  const href = (t: Tab) => (t === "temario" ? `/admin/cursos/${id}` : `/admin/cursos/${id}?tab=${t}`);

  return (
    <div className="space-y-6">
      <PageHeader
        back={{ href: "/admin/cursos", label: "Cursos" }}
        title={course.title}
        description={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <StatusChip status={course.status} />
            <span>{formatPrice(course.priceCents, course.currency)}</span>
            <span>{plural(course.modules.length, "módulo", "módulos")}, {plural(lessonCount, "lección", "lecciones")}</span>
            <Link href={`/cursos/${course.slug}`} className="font-medium text-[#1d4ed8] hover:underline">Ver como alumno</Link>
          </span>
        }
        actions={<CourseActionsBar id={course.id} status={course.status} issues={issues} />}
      />

      {course.status !== "published" && issues.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
          <p className="font-medium">Para publicarlo falta:</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5">
            {issues.map((i) => <li key={i}>{i}</li>)}
          </ul>
        </div>
      )}

      <Tabs
        active={tab}
        items={[
          { key: "temario", label: "Temario", href: href("temario"), count: lessonCount },
          { key: "recursos", label: "Recursos", href: href("recursos"), count: courseResources.length },
          { key: "datos", label: "Datos y precio", href: href("datos") },
          { key: "personas", label: "Profesores y alumnos", href: href("personas"), count: teachers.length + access.length },
          { key: "ajustes", label: "Ajustes", href: href("ajustes") },
        ]}
      />

      {tab === "temario" && (
        <>
          {course.importNotes.length > 0 && (
            <div className="rounded-xl border border-[#bfd2f8] bg-[#f5f8ff] px-5 py-4 text-sm">
              <p className="font-medium">Notas de la importación con Claude Code</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-5 a-muted">
                {course.importNotes.map((n, i) => <li key={i}>{n}</li>)}
              </ul>
            </div>
          )}
          <p className="text-sm a-muted">Arrastra módulos y lecciones para ordenarlos. Los cambios de orden se guardan solos.</p>
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
        </>
      )}

      {tab === "recursos" && (
        <>
          <p className="text-sm a-muted">
            Material de apoyo que los alumnos ven en cada lección: archivos (PDF, planos, modelos…) o enlaces. Los de un módulo
            aparecen en todas sus lecciones. Solo los ven quienes tienen acceso al curso.
          </p>
          <ResourcesPanel
            modules={course.modules.map((m) => ({ id: m.id, title: m.title, lessons: m.lessons.map((l) => ({ id: l.id, title: l.title })) }))}
            resources={courseResources}
          />
        </>
      )}

      {tab === "datos" && (
        <Card title="Datos y precio">
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
        </Card>
      )}

      {tab === "personas" && (
        <div className="grid gap-6 xl:grid-cols-2">
          <Card title="Profesores" description="Atienden las dudas y el foro de este curso.">
            <TeachersPanel courseId={course.id} teachers={teachers} />
          </Card>
          <Card title="Alumnos" description="Da acceso gratis a quien quieras: becas, pruebas o colaboradores.">
            <AccessPanel courseId={course.id} access={access} />
          </Card>
        </div>
      )}

      {tab === "ajustes" && (
        <Card title="Eliminar el curso">
          <DeleteCourse id={course.id} slug={course.slug} title={course.title} status={course.status} purchases={purchases} />
        </Card>
      )}
    </div>
  );
}
