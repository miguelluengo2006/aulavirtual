import "server-only";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/db";
import {
  courses,
  lessonProgress,
  lessons,
  modules,
  options,
  questions,
  quizAttempts,
  quizzes,
} from "@/db/schema";

// El catálogo y los temarios son iguales para todos y cambian poco, así que se
// guardan en caché: con muchos alumnos a la vez no se repite la misma consulta
// en cada visita. El panel de admin la vacía al guardar (etiqueta "courses");
// una importación con Claude Code tarda como mucho un minuto en verse.
// El acceso a vídeos y quizzes NO pasa por esta caché (canAccessCourse).
const COURSES_CACHE = { stale: 30, revalidate: 60, expire: 3600 };

/** Cursos publicados para el catálogo de la portada. */
export async function getPublishedCourses() {
  "use cache";
  cacheTag("courses");
  cacheLife(COURSES_CACHE);
  return db
    .select({
      id: courses.id,
      slug: courses.slug,
      title: courses.title,
      description: courses.description,
      priceCents: courses.priceCents,
      currency: courses.currency,
      includedInSubscription: courses.includedInSubscription,
      lessonCount: sql<number>`(select count(*)::int from "lessons" where "lessons"."course_id" = "courses"."id")`,
      totalSeconds: sql<number>`(select coalesce(sum("lessons"."duration_seconds"), 0)::int from "lessons" where "lessons"."course_id" = "courses"."id")`,
    })
    .from(courses)
    .where(eq(courses.status, "published"))
    .orderBy(asc(courses.title));
}

/** Curso con su temario ordenado (sin vídeos ni respuestas). */
export async function getCourseOutline(slug: string) {
  "use cache";
  cacheTag("courses");
  cacheLife(COURSES_CACHE);
  return db.query.courses.findFirst({
    where: eq(courses.slug, slug),
    columns: {
      id: true,
      slug: true,
      title: true,
      description: true,
      priceCents: true,
      currency: true,
      includedInSubscription: true,
      status: true,
    },
    with: {
      modules: {
        orderBy: asc(modules.position),
        columns: { id: true, title: true },
        with: {
          lessons: {
            orderBy: asc(lessons.position),
            columns: { id: true, externalId: true, title: true, durationSeconds: true },
          },
        },
      },
    },
  });
}

export type CourseOutline = NonNullable<Awaited<ReturnType<typeof getCourseOutline>>>;

export function flatLessons(course: CourseOutline) {
  return course.modules.flatMap((m) => m.lessons);
}

/** Progreso del usuario en las lecciones indicadas, por id de lección. */
export async function getProgressMap(userId: string, lessonIds: string[]) {
  if (lessonIds.length === 0) return new Map<string, { completed: boolean; position: number; watched: number }>();
  const rows = await db
    .select({
      lessonId: lessonProgress.lessonId,
      completedAt: lessonProgress.completedAt,
      maxPositionSeconds: lessonProgress.maxPositionSeconds,
      watchedSeconds: lessonProgress.watchedSeconds,
    })
    .from(lessonProgress)
    .where(and(eq(lessonProgress.userId, userId), inArray(lessonProgress.lessonId, lessonIds)));
  return new Map(
    rows.map((r) => [
      r.lessonId,
      { completed: Boolean(r.completedAt), position: r.maxPositionSeconds, watched: r.watchedSeconds },
    ]),
  );
}

/** Quiz de una lección SIN las respuestas correctas (va al navegador). */
export async function getQuizForStudent(lessonId: string) {
  const quiz = await db.query.quizzes.findFirst({
    where: eq(quizzes.lessonId, lessonId),
    columns: { id: true },
    with: {
      questions: {
        orderBy: asc(questions.position),
        columns: { id: true, prompt: true },
        with: { options: { orderBy: asc(options.position), columns: { id: true, text: true } } },
      },
    },
  });
  if (!quiz || quiz.questions.length === 0) return null;
  return quiz;
}

export type StudentQuiz = NonNullable<Awaited<ReturnType<typeof getQuizForStudent>>>;

export async function getLastAttempt(userId: string, quizId: string) {
  const [last] = await db
    .select({ score: quizAttempts.score, total: quizAttempts.total, createdAt: quizAttempts.createdAt })
    .from(quizAttempts)
    .where(and(eq(quizAttempts.userId, userId), eq(quizAttempts.quizId, quizId)))
    .orderBy(desc(quizAttempts.createdAt))
    .limit(1);
  return last ?? null;
}
