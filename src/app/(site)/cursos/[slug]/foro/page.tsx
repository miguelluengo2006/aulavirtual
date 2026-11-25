import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { NewThreadForm } from "@/components/community/forms";
import { getCommunityRole, listThreads } from "@/lib/community";
import { getCourseOutline } from "@/lib/course-data";
import { formatDateTime, plural } from "@/lib/format";
import { requireUser } from "@/lib/session";

export const metadata = { title: "Foro del curso" };

export default function ForumPage({ params }: PageProps<"/cursos/[slug]/foro">) {
  return (
    <Suspense fallback={<p className="text-subtle">Cargando el foro…</p>}>
      <Forum params={params} />
    </Suspense>
  );
}

async function Forum({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await requireUser(`/cursos/${slug}/foro`);
  const course = await getCourseOutline(slug);
  if (!course) notFound();
  const role = await getCommunityRole(user, course.id);
  if (!role.access) redirect(`/cursos/${slug}`);

  const threads = await listThreads(course.id);

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <header className="space-y-2">
        <Link href={`/cursos/${slug}`} className="text-sm text-muted hover:text-white">
          {course.title}
        </Link>
        <h1 className="text-4xl">Foro del curso</h1>
        <p className="text-muted">
          Pregunta, comparte lo que estás haciendo y ayuda a tus compañeros. Los profesores del curso responden aquí. Para
          dudas de un vídeo concreto, usa también el apartado «Dudas» de cada lección.
        </p>
      </header>

      <section aria-labelledby="temas" className="space-y-3">
        <h2 id="temas" className="sr-only">
          Temas
        </h2>
        {threads.length === 0 ? (
          <div className="glass p-8 text-center text-muted">
            Todavía no hay temas. Abre el primero con el formulario de abajo.
          </div>
        ) : (
          <ul className="glass divide-y divide-white/8 overflow-hidden p-2">
            {threads.map((t) => (
              <li key={t.id}>
                <Link href={`/cursos/${slug}/foro/${t.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-2xl px-4 py-3 hover:bg-white/5">
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      {t.pinned && <span className="chip chip-accent">Fijado</span>}
                      {t.locked && <span className="chip">Cerrado</span>}
                      <span className="font-medium">{t.title}</span>
                    </span>
                    <span className="mt-0.5 block text-xs text-subtle">
                      {t.author} · {formatDateTime(t.createdAt)}
                    </span>
                  </span>
                  <span className="text-right text-xs text-subtle">
                    {plural(t.replies, "respuesta", "respuestas")}
                    <span className="block">Última: {formatDateTime(t.lastActivity)}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="nuevo" className="glass space-y-4 p-6 sm:p-8">
        <h2 id="nuevo" className="text-2xl">
          Abrir un tema
        </h2>
        <NewThreadForm courseId={course.id} slug={slug} />
      </section>
    </div>
  );
}
