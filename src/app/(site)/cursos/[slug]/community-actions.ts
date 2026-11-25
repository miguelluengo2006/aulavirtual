"use server";

import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { courses, forumPosts, forumThreads, lessonAnswers, lessonQuestions } from "@/db/schema";
import {
  canPostNowFor,
  getCommunityRole,
  getThread,
  lessonCourse,
  teacherEmails,
} from "@/lib/community";
import { bodySchema, canDelete, canReply, titleSchema, type CommunityRole } from "@/lib/community-rules";
import { sendEmail } from "@/lib/email";
import { newQuestionTemplate } from "@/lib/email-templates";
import { getCurrentUser, type CurrentUser } from "@/lib/session";
import { siteOrigin } from "@/lib/site-url";

// Foro del curso y dudas de las lecciones. Cada acción comprueba en el servidor
// sesión, acceso al curso y permisos: no basta con ocultar botones en la página.

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

const id = z.string().min(1).max(64);
const NO_ACCESS = "No tienes acceso a este curso.";
const TOO_FAST = "Has publicado muchos mensajes seguidos. Espera un poco y vuelve a intentarlo.";

async function withUser<T>(fn: (u: CurrentUser) => Promise<Result<T>>): Promise<Result<T>> {
  const u = await getCurrentUser();
  if (!u) return { ok: false, error: "Tu sesión ha caducado. Vuelve a entrar." };
  try {
    return await fn(u);
  } catch (e) {
    console.error("[comunidad]", e);
    return { ok: false, error: "No se ha podido guardar. Inténtalo de nuevo." };
  }
}

function firstError(e: z.ZodError): string {
  return e.issues[0]?.message ?? "Datos no válidos";
}

/** Avisa a los profesores del curso (menos al autor). Un fallo de email no anula la publicación. */
async function notifyTeachers(
  courseId: string,
  author: CurrentUser,
  msg: { kind: "lesson" | "forum"; where: string; excerpt: string; path: string },
) {
  try {
    const emails = (await teacherEmails(courseId)).filter((e) => e !== author.email);
    if (emails.length === 0) return;
    const url = `${await siteOrigin()}${msg.path}`;
    const t = newQuestionTemplate({ ...msg, author: author.name, url });
    await Promise.all(emails.map((to) => sendEmail({ to, ...t })));
  } catch (e) {
    console.error("[comunidad] no se ha podido avisar a los profesores", e);
  }
}

async function courseSlug(courseId: string) {
  const [c] = await db.select({ slug: courses.slug }).from(courses).where(eq(courses.id, courseId)).limit(1);
  return c?.slug ?? "";
}

// ─── Foro del curso ───────────────────────────────────────────

const newThreadInput = z.object({ courseId: id, title: titleSchema, body: bodySchema });

export async function createThread(raw: z.input<typeof newThreadInput>): Promise<Result<{ threadId: string }>> {
  return withUser<{ threadId: string }>(async (u) => {
    const p = newThreadInput.safeParse(raw);
    if (!p.success) return { ok: false, error: firstError(p.error) };
    const { courseId, title, body } = p.data;

    const role = await getCommunityRole(u, courseId);
    if (!role.access) return { ok: false, error: NO_ACCESS };
    if (!(await canPostNowFor(u.id))) return { ok: false, error: TOO_FAST };

    const threadId = await db.transaction(async (tx) => {
      const [t] = await tx.insert(forumThreads).values({ courseId, userId: u.id, title }).returning({ id: forumThreads.id });
      await tx.insert(forumPosts).values({ threadId: t.id, userId: u.id, body, isTeacher: role.moderate });
      return t.id;
    });

    if (!role.moderate) {
      const slug = await courseSlug(courseId);
      await notifyTeachers(courseId, u, { kind: "forum", where: title, excerpt: body, path: `/cursos/${slug}/foro/${threadId}` });
    }
    return { ok: true, threadId };
  });
}

const replyInput = z.object({ threadId: id, body: bodySchema });

export async function replyToThread(raw: z.input<typeof replyInput>): Promise<Result> {
  return withUser(async (u) => {
    const p = replyInput.safeParse(raw);
    if (!p.success) return { ok: false, error: firstError(p.error) };
    const thread = await getThread(p.data.threadId);
    if (!thread) return { ok: false, error: "Este tema ya no existe." };

    const role = await getCommunityRole(u, thread.courseId);
    if (!role.access) return { ok: false, error: NO_ACCESS };
    if (!canReply(role, thread.locked)) return { ok: false, error: "Este tema está cerrado." };
    if (!(await canPostNowFor(u.id))) return { ok: false, error: TOO_FAST };

    await db.insert(forumPosts).values({ threadId: thread.id, userId: u.id, body: p.data.body, isTeacher: role.moderate });
    return { ok: true };
  });
}

const moderateInput = z.object({ threadId: id, action: z.enum(["pin", "unpin", "lock", "unlock"]) });

export async function moderateThread(raw: z.input<typeof moderateInput>): Promise<Result> {
  return withUser(async (u) => {
    const p = moderateInput.safeParse(raw);
    if (!p.success) return { ok: false, error: "Acción no válida" };
    const thread = await getThread(p.data.threadId);
    if (!thread) return { ok: false, error: "Este tema ya no existe." };
    const role = await getCommunityRole(u, thread.courseId);
    if (!role.moderate) return { ok: false, error: "Solo los profesores pueden hacer esto." };

    const set = {
      pin: { pinned: true },
      unpin: { pinned: false },
      lock: { locked: true },
      unlock: { locked: false },
    }[p.data.action];
    await db.update(forumThreads).set(set).where(eq(forumThreads.id, thread.id));
    return { ok: true };
  });
}

export async function deleteThread(raw: { threadId: string }): Promise<Result> {
  return withUser(async (u) => {
    const p = z.object({ threadId: id }).safeParse(raw);
    if (!p.success) return { ok: false, error: "Tema no válido" };
    const thread = await getThread(p.data.threadId);
    if (!thread) return { ok: true };
    const role = await getCommunityRole(u, thread.courseId);
    if (!canDelete(role, thread.userId, u.id)) return { ok: false, error: "No puedes borrar este tema." };
    await db.delete(forumThreads).where(eq(forumThreads.id, thread.id)); // borra sus mensajes en cascada
    return { ok: true };
  });
}

export async function deleteForumPost(raw: { postId: string }): Promise<Result> {
  return withUser(async (u) => {
    const p = z.object({ postId: id }).safeParse(raw);
    if (!p.success) return { ok: false, error: "Mensaje no válido" };
    const [post] = await db
      .select({ id: forumPosts.id, userId: forumPosts.userId, threadId: forumPosts.threadId, courseId: forumThreads.courseId })
      .from(forumPosts)
      .innerJoin(forumThreads, eq(forumThreads.id, forumPosts.threadId))
      .where(eq(forumPosts.id, p.data.postId))
      .limit(1);
    if (!post) return { ok: true };
    const role = await getCommunityRole(u, post.courseId);
    if (!canDelete(role, post.userId, u.id)) return { ok: false, error: "No puedes borrar este mensaje." };

    // El primer mensaje es el propio tema: para quitarlo se borra el tema entero.
    const [first] = await db
      .select({ id: forumPosts.id })
      .from(forumPosts)
      .where(eq(forumPosts.threadId, post.threadId))
      .orderBy(asc(forumPosts.createdAt))
      .limit(1);
    if (first?.id === post.id) return { ok: false, error: "Es el mensaje que abre el tema: borra el tema entero." };

    await db.delete(forumPosts).where(eq(forumPosts.id, post.id));
    return { ok: true };
  });
}

// ─── Dudas de una lección ─────────────────────────────────────

const askInput = z.object({ lessonId: id, body: bodySchema });

export async function askLessonQuestion(raw: z.input<typeof askInput>): Promise<Result> {
  return withUser(async (u) => {
    const p = askInput.safeParse(raw);
    if (!p.success) return { ok: false, error: firstError(p.error) };
    const lesson = await lessonCourse(p.data.lessonId);
    if (!lesson) return { ok: false, error: "Esta lección ya no existe." };
    const role = await getCommunityRole(u, lesson.courseId);
    if (!role.access) return { ok: false, error: NO_ACCESS };
    if (!(await canPostNowFor(u.id))) return { ok: false, error: TOO_FAST };

    await db.insert(lessonQuestions).values({ lessonId: p.data.lessonId, userId: u.id, body: p.data.body });
    if (!role.moderate) {
      const slug = await courseSlug(lesson.courseId);
      await notifyTeachers(lesson.courseId, u, {
        kind: "lesson",
        where: lesson.title,
        excerpt: p.data.body,
        path: `/cursos/${slug}/${lesson.externalId}#dudas`,
      });
    }
    return { ok: true };
  });
}

const answerInput = z.object({ questionId: id, body: bodySchema });

export async function answerLessonQuestion(raw: z.input<typeof answerInput>): Promise<Result> {
  return withUser(async (u) => {
    const p = answerInput.safeParse(raw);
    if (!p.success) return { ok: false, error: firstError(p.error) };
    const [q] = await db
      .select({ id: lessonQuestions.id, lessonId: lessonQuestions.lessonId })
      .from(lessonQuestions)
      .where(eq(lessonQuestions.id, p.data.questionId))
      .limit(1);
    if (!q) return { ok: false, error: "Esta duda ya no existe." };
    const lesson = await lessonCourse(q.lessonId);
    if (!lesson) return { ok: false, error: "Esta lección ya no existe." };
    const role = await getCommunityRole(u, lesson.courseId);
    if (!role.access) return { ok: false, error: NO_ACCESS };
    if (!(await canPostNowFor(u.id))) return { ok: false, error: TOO_FAST };

    await db.transaction(async (tx) => {
      await tx.insert(lessonAnswers).values({ questionId: q.id, userId: u.id, body: p.data.body, isTeacher: role.moderate });
      // Una duda queda respondida cuando contesta un profesor.
      if (role.moderate) await tx.update(lessonQuestions).set({ status: "answered" }).where(eq(lessonQuestions.id, q.id));
    });
    return { ok: true };
  });
}

async function lessonRoleFor(u: CurrentUser, lessonId: string): Promise<CommunityRole | null> {
  const lesson = await lessonCourse(lessonId);
  return lesson ? getCommunityRole(u, lesson.courseId) : null;
}

export async function deleteLessonQuestion(raw: { questionId: string }): Promise<Result> {
  return withUser(async (u) => {
    const p = z.object({ questionId: id }).safeParse(raw);
    if (!p.success) return { ok: false, error: "Duda no válida" };
    const [q] = await db
      .select({ id: lessonQuestions.id, lessonId: lessonQuestions.lessonId, userId: lessonQuestions.userId })
      .from(lessonQuestions)
      .where(eq(lessonQuestions.id, p.data.questionId))
      .limit(1);
    if (!q) return { ok: true };
    const role = await lessonRoleFor(u, q.lessonId);
    if (!role || !canDelete(role, q.userId, u.id)) return { ok: false, error: "No puedes borrar esta duda." };
    await db.delete(lessonQuestions).where(eq(lessonQuestions.id, q.id)); // y sus respuestas, en cascada
    return { ok: true };
  });
}

export async function deleteLessonAnswer(raw: { answerId: string }): Promise<Result> {
  return withUser(async (u) => {
    const p = z.object({ answerId: id }).safeParse(raw);
    if (!p.success) return { ok: false, error: "Respuesta no válida" };
    const [a] = await db
      .select({ id: lessonAnswers.id, userId: lessonAnswers.userId, lessonId: lessonQuestions.lessonId, questionId: lessonAnswers.questionId })
      .from(lessonAnswers)
      .innerJoin(lessonQuestions, eq(lessonQuestions.id, lessonAnswers.questionId))
      .where(eq(lessonAnswers.id, p.data.answerId))
      .limit(1);
    if (!a) return { ok: true };
    const role = await lessonRoleFor(u, a.lessonId);
    if (!role || !canDelete(role, a.userId, u.id)) return { ok: false, error: "No puedes borrar esta respuesta." };
    await db.transaction(async (tx) => {
      await tx.delete(lessonAnswers).where(eq(lessonAnswers.id, a.id));
      // Si ya no queda ninguna respuesta de profesor, la duda vuelve a estar pendiente.
      const teacherLeft = await tx
        .select({ id: lessonAnswers.id })
        .from(lessonAnswers)
        .where(and(eq(lessonAnswers.questionId, a.questionId), eq(lessonAnswers.isTeacher, true)))
        .limit(1);
      if (teacherLeft.length === 0) {
        await tx.update(lessonQuestions).set({ status: "open" }).where(eq(lessonQuestions.id, a.questionId));
      }
    });
    return { ok: true };
  });
}
