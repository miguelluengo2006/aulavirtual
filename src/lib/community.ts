import "server-only";
import { and, asc, count, desc, eq, gt, inArray, max, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  courseTeachers,
  forumPosts,
  forumThreads,
  lessonAnswers,
  lessonQuestions,
  lessons,
  user,
} from "@/db/schema";
import { canAccessCourse } from "./access";
import { canPostNow, communityRole, type CommunityRole } from "./community-rules";
import type { CurrentUser } from "./session";

// Foro del curso y dudas de cada lección. Todo pasa por canAccessCourse:
// sin acceso al curso no se lee ni se escribe nada.

export async function getCommunityRole(u: CurrentUser, courseId: string): Promise<CommunityRole> {
  const [hasAccess, teacher] = await Promise.all([
    canAccessCourse(u.id, courseId),
    db
      .select({ one: sql<number>`1` })
      .from(courseTeachers)
      .where(and(eq(courseTeachers.courseId, courseId), eq(courseTeachers.userId, u.id)))
      .limit(1),
  ]);
  return communityRole({ hasAccess, role: u.role, isTeacherOfCourse: teacher.length > 0 });
}

/** ¿Puede publicar ahora? (hilos, respuestas, dudas: límite por minuto y por hora) */
export async function canPostNowFor(userId: string): Promise<boolean> {
  const since = (interval: string) => sql`now() - ${sql.raw(`interval '${interval}'`)}`;
  const tally = async (interval: string) => {
    const rows = await Promise.all(
      [forumThreads, forumPosts, lessonQuestions, lessonAnswers].map((t) =>
        db
          .select({ n: count() })
          .from(t)
          .where(and(eq(t.userId, userId), gt(t.createdAt, since(interval)))),
      ),
    );
    return rows.reduce((s, [r]) => s + r.n, 0);
  };
  const [minute, hour] = await Promise.all([tally("1 minute"), tally("1 hour")]);
  return canPostNow(minute, hour);
}

// ─── Foro del curso ───────────────────────────────────────────

export async function listThreads(courseId: string) {
  const lastActivity = max(forumPosts.createdAt);
  return db
    .select({
      id: forumThreads.id,
      title: forumThreads.title,
      pinned: forumThreads.pinned,
      locked: forumThreads.locked,
      createdAt: forumThreads.createdAt,
      author: user.name,
      replies: sql<number>`(count(${forumPosts.id}) - 1)::int`,
      lastActivity: sql<Date>`coalesce(${lastActivity}, ${forumThreads.createdAt})`,
    })
    .from(forumThreads)
    .innerJoin(user, eq(user.id, forumThreads.userId))
    .leftJoin(forumPosts, eq(forumPosts.threadId, forumThreads.id))
    .where(eq(forumThreads.courseId, courseId))
    .groupBy(forumThreads.id, user.name)
    .orderBy(desc(forumThreads.pinned), desc(sql`coalesce(${lastActivity}, ${forumThreads.createdAt})`))
    .limit(200);
}

export async function getThread(threadId: string) {
  const [thread] = await db
    .select({
      id: forumThreads.id,
      courseId: forumThreads.courseId,
      userId: forumThreads.userId,
      title: forumThreads.title,
      pinned: forumThreads.pinned,
      locked: forumThreads.locked,
      createdAt: forumThreads.createdAt,
    })
    .from(forumThreads)
    .where(eq(forumThreads.id, threadId))
    .limit(1);
  if (!thread) return null;
  const posts = await db
    .select({
      id: forumPosts.id,
      userId: forumPosts.userId,
      body: forumPosts.body,
      isTeacher: forumPosts.isTeacher,
      createdAt: forumPosts.createdAt,
      author: user.name,
    })
    .from(forumPosts)
    .innerJoin(user, eq(user.id, forumPosts.userId))
    .where(eq(forumPosts.threadId, threadId))
    .orderBy(asc(forumPosts.createdAt))
    .limit(500);
  return { ...thread, posts };
}

// ─── Dudas de una lección ─────────────────────────────────────

export async function listLessonQuestions(lessonId: string) {
  const qs = await db
    .select({
      id: lessonQuestions.id,
      userId: lessonQuestions.userId,
      body: lessonQuestions.body,
      status: lessonQuestions.status,
      createdAt: lessonQuestions.createdAt,
      author: user.name,
    })
    .from(lessonQuestions)
    .innerJoin(user, eq(user.id, lessonQuestions.userId))
    .where(eq(lessonQuestions.lessonId, lessonId))
    .orderBy(desc(lessonQuestions.createdAt))
    .limit(100);
  if (qs.length === 0) return [];
  const answers = await db
    .select({
      id: lessonAnswers.id,
      questionId: lessonAnswers.questionId,
      userId: lessonAnswers.userId,
      body: lessonAnswers.body,
      isTeacher: lessonAnswers.isTeacher,
      createdAt: lessonAnswers.createdAt,
      author: user.name,
    })
    .from(lessonAnswers)
    .innerJoin(user, eq(user.id, lessonAnswers.userId))
    .where(inArray(lessonAnswers.questionId, qs.map((q) => q.id)))
    .orderBy(asc(lessonAnswers.createdAt));
  return qs.map((q) => ({ ...q, answers: answers.filter((a) => a.questionId === q.id) }));
}

/** Curso al que pertenece una lección (para comprobar el acceso). */
export async function lessonCourse(lessonId: string) {
  const [row] = await db
    .select({ courseId: lessons.courseId, title: lessons.title, externalId: lessons.externalId })
    .from(lessons)
    .where(eq(lessons.id, lessonId))
    .limit(1);
  return row ?? null;
}

/** Emails de los profesores de un curso (para avisarles de dudas nuevas). */
export async function teacherEmails(courseId: string): Promise<string[]> {
  const rows = await db
    .select({ email: user.email })
    .from(courseTeachers)
    .innerJoin(user, eq(user.id, courseTeachers.userId))
    .where(and(eq(courseTeachers.courseId, courseId), eq(user.banned, false)));
  return rows.map((r) => r.email);
}

/** Dudas sin respuesta de profesor en los cursos indicados (panel del profesor). */
export async function pendingDoubts(courseIds: string[]) {
  if (courseIds.length === 0) return [];
  return db
    .select({
      id: lessonQuestions.id,
      body: lessonQuestions.body,
      createdAt: lessonQuestions.createdAt,
      author: user.name,
      courseId: lessons.courseId,
      lessonTitle: lessons.title,
      lessonExternalId: lessons.externalId,
    })
    .from(lessonQuestions)
    .innerJoin(lessons, eq(lessons.id, lessonQuestions.lessonId))
    .innerJoin(user, eq(user.id, lessonQuestions.userId))
    .where(and(inArray(lessons.courseId, courseIds), eq(lessonQuestions.status, "open")))
    .orderBy(asc(lessonQuestions.createdAt))
    .limit(200);
}
