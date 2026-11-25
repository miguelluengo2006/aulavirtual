import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { CommunityAction, ReplyForm } from "@/components/community/forms";
import { Message } from "@/components/community/message";
import { getCommunityRole, getThread } from "@/lib/community";
import { canDelete, canReply } from "@/lib/community-rules";
import { getCourseOutline } from "@/lib/course-data";
import { requireUser } from "@/lib/session";

export const metadata = { title: "Foro del curso" };

export default function ThreadPage({ params }: PageProps<"/cursos/[slug]/foro/[hilo]">) {
  return (
    <Suspense fallback={<p className="text-subtle">Cargando el tema…</p>}>
      <ThreadView params={params} />
    </Suspense>
  );
}

async function ThreadView({ params }: { params: Promise<{ slug: string; hilo: string }> }) {
  const { slug, hilo } = await params;
  const user = await requireUser(`/cursos/${slug}/foro/${hilo}`);
  const course = await getCourseOutline(slug);
  if (!course) notFound();
  const thread = await getThread(hilo);
  // Mismo 404 si no existe o es de otro curso.
  if (!thread || thread.courseId !== course.id) notFound();
  const role = await getCommunityRole(user, course.id);
  if (!role.access) redirect(`/cursos/${slug}`);

  const forumUrl = `/cursos/${slug}/foro`;
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="space-y-3">
        <Link href={forumUrl} className="text-sm text-muted hover:text-white">
          Foro de {course.title}
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          {thread.pinned && <span className="chip chip-accent">Fijado</span>}
          {thread.locked && <span className="chip">Cerrado</span>}
        </div>
        <h1 className="text-3xl break-words">{thread.title}</h1>
        {(role.moderate || canDelete(role, thread.userId, user.id)) && (
          <div className="flex flex-wrap gap-4">
            {role.moderate && (
              <>
                <CommunityAction action={thread.pinned ? "unpin" : "pin"} id={thread.id} label={thread.pinned ? "Quitar de fijados" : "Fijar arriba"} />
                <CommunityAction action={thread.locked ? "unlock" : "lock"} id={thread.id} label={thread.locked ? "Reabrir tema" : "Cerrar tema"} />
              </>
            )}
            <CommunityAction
              action="deleteThread"
              id={thread.id}
              label="Borrar tema"
              confirm="¿Borrar el tema y todas sus respuestas? No se puede deshacer."
              redirectTo={forumUrl}
            />
          </div>
        )}
      </header>

      <ol className="space-y-3">
        {thread.posts.map((p, i) => (
          <li key={p.id}>
            <Message
              author={p.author}
              isTeacher={p.isTeacher}
              createdAt={p.createdAt}
              body={p.body}
              actions={
                i > 0 && canDelete(role, p.userId, user.id) ? (
                  <CommunityAction action="deletePost" id={p.id} label="Borrar" confirm="¿Borrar este mensaje?" />
                ) : undefined
              }
            />
          </li>
        ))}
      </ol>

      {canReply(role, thread.locked) ? (
        <section className="glass space-y-3 p-6">
          <h2 className="text-xl">Responder</h2>
          <ReplyForm threadId={thread.id} />
        </section>
      ) : (
        <p className="inset px-5 py-4 text-sm text-muted">Este tema está cerrado. Si tienes otra duda, abre un tema nuevo en el foro.</p>
      )}
    </div>
  );
}
