import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getLessonQuizForEdit } from "@/lib/admin/queries";
import { QuizEditor } from "../../../../_components/quiz-editor";
import { PageHeader } from "../../../../_components/ui";

export default function QuizPage({ params }: PageProps<"/admin/cursos/[id]/lecciones/[lessonId]">) {
  return (
    <Suspense fallback={<p className="a-subtle">Cargando…</p>}>
      <Quiz params={params} />
    </Suspense>
  );
}

async function Quiz({ params }: { params: Promise<{ id: string; lessonId: string }> }) {
  const { id, lessonId } = await params;
  const data = await getLessonQuizForEdit(id, lessonId);
  if (!data) notFound();
  const { lesson, course } = data;
  return (
    <div className="space-y-6">
      <PageHeader
        back={{ href: `/admin/cursos/${course.id}`, label: `Volver a ${course.title}` }}
        title={`Quiz: ${lesson.title}`}
        description="Preguntas clave que el alumno responde al terminar el vídeo. Cada pregunta necesita una sola respuesta correcta y una explicación."
      />
      <QuizEditor
        lessonId={lesson.id}
        initial={(lesson.quiz?.questions ?? []).map((q) => ({
          id: q.id,
          prompt: q.prompt,
          explanation: q.explanation,
          options: q.options,
        }))}
      />
    </div>
  );
}
