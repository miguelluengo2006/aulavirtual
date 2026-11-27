import "server-only";
import { notFound, redirect } from "next/navigation";
import { getCommunityRole } from "./community";
import { flatLessons, getCourseOutline, getProgressMap, getQuizResults } from "./course-data";
import { resourceCounts } from "./resources";
import { requireUser } from "./session";

/**
 * Todo lo que necesitan las páginas del aula (vídeo y test) de una lección:
 * comprueba sesión y acceso, y carga temario, progreso, tests y recursos.
 */
export async function loadLesson(slug: string, leccion: string, path: string) {
  const user = await requireUser(path);
  const course = await getCourseOutline(slug);
  if (!course) notFound();
  // Acceso al curso (y si modera el foro y las dudas: admin o profesor del curso).
  const role = await getCommunityRole(user, course.id);
  if (!role.access) redirect(`/cursos/${slug}`);

  const all = flatLessons(course);
  const index = all.findIndex((l) => l.externalId === leccion);
  if (index === -1) notFound();
  const lesson = all[index];
  const moduleIndex = course.modules.findIndex((m) => m.lessons.some((l) => l.id === lesson.id));
  const currentModule = course.modules[moduleIndex];

  const quizIds = all.flatMap((l) => (l.quiz ? [l.quiz.id] : []));
  const [progress, quizResults, counts] = await Promise.all([
    getProgressMap(user.id, all.map((l) => l.id)),
    getQuizResults(user.id, quizIds),
    resourceCounts(course.id),
  ]);

  return {
    user,
    role,
    course,
    all,
    index,
    lesson,
    currentModule,
    moduleIndex,
    prev: all[index - 1] ?? null,
    next: all[index + 1] ?? null,
    progress,
    quizResults,
    resourceCounts: counts,
    // Email y fecha en la marca de agua: cualquier captura o grabación queda identificada.
    watermark: `${user.email} · ${new Date().toLocaleDateString("es-ES", { timeZone: "Europe/Madrid" })}`,
  };
}

export type LessonContext = Awaited<ReturnType<typeof loadLesson>>;

export const lessonUrl = (slug: string, externalId: string) => `/cursos/${slug}/${externalId}`;
export const testUrl = (slug: string, externalId: string) => `/cursos/${slug}/${externalId}/test`;
