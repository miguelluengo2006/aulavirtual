import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { lessons } from "@/db/schema";
import { canAccessCourse } from "./access";
import { getCurrentUser, type CurrentUser } from "./session";

export type LessonForUser = {
  user: CurrentUser;
  lesson: {
    id: string;
    courseId: string;
    videoProvider: "r2" | "stream";
    videoKey: string;
    durationSeconds: number | null;
  };
};

/**
 * Para route handlers: devuelve la lección si el usuario tiene acceso,
 * o la respuesta de error que hay que devolver.
 */
export async function lessonForRequest(
  lessonId: string,
): Promise<LessonForUser | { error: Response }> {
  const user = await getCurrentUser();
  if (!user) return { error: new Response("No autenticado", { status: 401 }) };

  const lesson = await db.query.lessons.findFirst({
    where: eq(lessons.id, lessonId),
    columns: {
      id: true,
      courseId: true,
      videoProvider: true,
      videoKey: true,
      durationSeconds: true,
    },
  });
  // Mismo 404 si no existe o no hay acceso: no revela qué lecciones existen.
  if (!lesson || !(await canAccessCourse(user.id, lesson.courseId))) {
    return { error: new Response("No encontrado", { status: 404 }) };
  }
  return { user, lesson };
}
