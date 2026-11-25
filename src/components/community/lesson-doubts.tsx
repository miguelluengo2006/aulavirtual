import type { CommunityRole } from "@/lib/community-rules";
import { canDelete } from "@/lib/community-rules";
import { listLessonQuestions } from "@/lib/community";
import { plural } from "@/lib/format";
import { AnswerDoubtForm, AskDoubtForm, CommunityAction } from "./forms";
import { Message } from "./message";

/** Dudas de una lección: preguntar, responder y moderar. */
export async function LessonDoubts({
  lessonId,
  userId,
  role,
  forumUrl,
}: {
  lessonId: string;
  userId: string;
  role: CommunityRole;
  forumUrl: string;
}) {
  const doubts = await listLessonQuestions(lessonId);
  const open = doubts.filter((d) => d.status === "open").length;

  return (
    <section id="dudas" aria-labelledby="dudas-titulo" className="glass scroll-mt-24 space-y-6 p-6 sm:p-8">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 id="dudas-titulo" className="text-2xl">
            Dudas sobre esta lección
          </h2>
          <p className="text-sm text-muted">
            Pregunta lo que no te haya quedado claro del vídeo: te responde el profesor del curso. Para temas más
            generales, usa el{" "}
            <a href={forumUrl} className="link">
              foro del curso
            </a>
            .
          </p>
        </div>
        {doubts.length > 0 && (
          <span className={`chip ${open ? "chip-warning" : "chip-accent"}`}>
            {open ? plural(open, "pendiente", "pendientes") : "Todas respondidas"}
          </span>
        )}
      </header>

      <AskDoubtForm lessonId={lessonId} />

      {doubts.length === 0 ? (
        <p className="text-sm text-subtle">Todavía no hay dudas en esta lección. Si tienes una, escríbela arriba.</p>
      ) : (
        <ol className="space-y-4">
          {doubts.map((d) => (
            <li key={d.id} className="inset space-y-3 px-5 py-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`chip ${d.status === "answered" ? "chip-accent" : "chip-warning"}`}>
                  {d.status === "answered" ? "Respondida por el profesor" : "Pendiente de respuesta"}
                </span>
              </div>
              <Message
                muted
                author={d.author}
                isTeacher={false}
                createdAt={d.createdAt}
                body={d.body}
                actions={
                  canDelete(role, d.userId, userId) ? (
                    <CommunityAction action="deleteQuestion" id={d.id} label="Borrar" confirm="¿Borrar esta duda y sus respuestas?" />
                  ) : undefined
                }
              />
              {d.answers.length > 0 && (
                <ol className="space-y-2 border-l border-white/10 pl-4">
                  {d.answers.map((a) => (
                    <li key={a.id}>
                      <Message
                        author={a.author}
                        isTeacher={a.isTeacher}
                        createdAt={a.createdAt}
                        body={a.body}
                        actions={
                          canDelete(role, a.userId, userId) ? (
                            <CommunityAction action="deleteAnswer" id={a.id} label="Borrar" confirm="¿Borrar esta respuesta?" />
                          ) : undefined
                        }
                      />
                    </li>
                  ))}
                </ol>
              )}
              <AnswerDoubtForm questionId={d.id} />
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
