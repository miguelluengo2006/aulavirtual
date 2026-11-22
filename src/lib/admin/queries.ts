import "server-only";
import { and, asc, count, desc, eq, ilike, inArray, isNotNull, or, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  account,
  adminAuditLog,
  courseTeachers,
  courses,
  enrollments,
  lessonProgress,
  lessons,
  modules,
  options,
  questions,
  session,
  user,
} from "@/db/schema";
import { requireRole } from "@/lib/session";
import { publishIssues } from "./rules";

/** Cada consulta del panel comprueba el rol por sí misma (defensa en profundidad). */
async function admin() {
  return requireRole(["admin"], "/admin");
}

export async function getOverview() {
  await admin();
  const [statusCounts, roleCounts, [enr], recent, drafts] = await Promise.all([
    db.select({ status: courses.status, n: count() }).from(courses).groupBy(courses.status),
    db.select({ role: user.role, n: count() }).from(user).groupBy(user.role),
    db.select({ n: count() }).from(enrollments),
    db.select().from(adminAuditLog).orderBy(desc(adminAuditLog.createdAt)).limit(8),
    db.query.courses.findMany({
      where: eq(courses.status, "draft"),
      columns: { id: true, title: true, priceCents: true },
      with: { modules: { with: { lessons: { columns: { title: true, videoKey: true, durationSeconds: true } } } } },
      orderBy: desc(courses.updatedAt),
      limit: 10,
    }),
  ]);
  const byStatus = Object.fromEntries(statusCounts.map((r) => [r.status, r.n]));
  const byRole = Object.fromEntries(roleCounts.map((r) => [r.role, r.n]));
  return {
    courses: { draft: byStatus.draft ?? 0, published: byStatus.published ?? 0, archived: byStatus.archived ?? 0 },
    users: { student: byRole.student ?? 0, teacher: byRole.teacher ?? 0, admin: byRole.admin ?? 0 },
    enrollments: enr.n,
    recent,
    drafts: drafts.map((d) => ({
      id: d.id,
      title: d.title,
      issues: publishIssues({ priceCents: d.priceCents, lessons: d.modules.flatMap((m) => m.lessons) }),
    })),
  };
}

export async function listCourses(status?: "draft" | "published" | "archived") {
  await admin();
  return db
    .select({
      id: courses.id,
      title: courses.title,
      slug: courses.slug,
      status: courses.status,
      priceCents: courses.priceCents,
      currency: courses.currency,
      updatedAt: courses.updatedAt,
      lessonCount: sql<number>`(select count(*)::int from "lessons" where "lessons"."course_id" = "courses"."id")`,
      studentCount: sql<number>`(select count(*)::int from "enrollments" where "enrollments"."course_id" = "courses"."id")`,
    })
    .from(courses)
    .where(status ? eq(courses.status, status) : undefined)
    .orderBy(desc(courses.updatedAt));
}

export async function getCourseForEdit(id: string) {
  await admin();
  const course = await db.query.courses.findFirst({
    where: eq(courses.id, id),
    with: {
      modules: {
        orderBy: asc(modules.position),
        with: {
          lessons: {
            orderBy: asc(lessons.position),
            with: { quiz: { columns: { id: true }, with: { questions: { columns: { id: true } } } } },
          },
        },
      },
    },
  });
  if (!course) return null;

  const lessonIds = course.modules.flatMap((m) => m.lessons.map((l) => l.id));
  const [teachers, access, progress] = await Promise.all([
    db
      .select({ userId: user.id, name: user.name, email: user.email })
      .from(courseTeachers)
      .innerJoin(user, eq(user.id, courseTeachers.userId))
      .where(eq(courseTeachers.courseId, id))
      .orderBy(asc(user.name)),
    db
      .select({ userId: user.id, name: user.name, email: user.email, source: enrollments.source, createdAt: enrollments.createdAt })
      .from(enrollments)
      .innerJoin(user, eq(user.id, enrollments.userId))
      .where(eq(enrollments.courseId, id))
      .orderBy(desc(enrollments.createdAt)),
    lessonIds.length
      ? db
          .select({ lessonId: lessonProgress.lessonId, n: count() })
          .from(lessonProgress)
          .where(inArray(lessonProgress.lessonId, lessonIds))
          .groupBy(lessonProgress.lessonId)
      : Promise.resolve([]),
  ]);
  const progressByLesson = Object.fromEntries(progress.map((p) => [p.lessonId, p.n]));
  return {
    course,
    teachers,
    access,
    progressByLesson,
    issues: publishIssues({ priceCents: course.priceCents, lessons: course.modules.flatMap((m) => m.lessons) }),
  };
}

export async function getLessonQuizForEdit(courseId: string, lessonId: string) {
  await admin();
  const lesson = await db.query.lessons.findFirst({
    where: and(eq(lessons.id, lessonId), eq(lessons.courseId, courseId)),
    columns: { id: true, title: true, sourceFile: true },
    with: {
      quiz: {
        with: {
          questions: {
            orderBy: asc(questions.position),
            with: { options: { orderBy: asc(options.position), columns: { id: true, text: true, isCorrect: true } } },
          },
        },
      },
    },
  });
  if (!lesson) return null;
  const course = await db.query.courses.findFirst({ where: eq(courses.id, courseId), columns: { id: true, title: true } });
  return { lesson, course: course! };
}

const PAGE_SIZE = 50;

export async function listUsers(params: { q?: string; role?: "admin" | "teacher" | "student"; banned?: boolean; page?: number }) {
  const me = await admin();
  const page = Math.max(1, params.page ?? 1);
  const q = params.q?.trim().slice(0, 100);
  const where = and(
    params.role ? eq(user.role, params.role) : undefined,
    params.banned ? eq(user.banned, true) : undefined,
    q ? or(ilike(user.email, `%${q.replace(/[%_\\]/g, "\\$&")}%`), ilike(user.name, `%${q.replace(/[%_\\]/g, "\\$&")}%`)) : undefined,
  );
  const [rows, [{ total }]] = await Promise.all([
    db
      .select({ id: user.id, name: user.name, email: user.email, role: user.role, emailVerified: user.emailVerified, banned: user.banned, createdAt: user.createdAt })
      .from(user)
      .where(where)
      .orderBy(desc(user.createdAt))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db.select({ total: count() }).from(user).where(where),
  ]);
  return { rows, total, page, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)), meId: me.id };
}

/** Cursos para elegir (invitar o dar acceso). */
export async function listCourseOptions() {
  await admin();
  return db
    .select({ id: courses.id, title: courses.title, status: courses.status })
    .from(courses)
    .orderBy(asc(courses.title));
}

export async function getUserForAdmin(id: string) {
  const me = await admin();
  const u = await db.query.user.findFirst({ where: eq(user.id, id) });
  if (!u) return null;
  const [enrolled, teaching, [sessions], activity, [completed]] = await Promise.all([
    db
      .select({ courseId: courses.id, title: courses.title, source: enrollments.source, createdAt: enrollments.createdAt })
      .from(enrollments)
      .innerJoin(courses, eq(courses.id, enrollments.courseId))
      .where(eq(enrollments.userId, id)),
    db
      .select({ courseId: courses.id, title: courses.title })
      .from(courseTeachers)
      .innerJoin(courses, eq(courses.id, courseTeachers.courseId))
      .where(eq(courseTeachers.userId, id)),
    db.select({ n: count() }).from(session).where(and(eq(session.userId, id), sql`${session.expiresAt} > now()`)),
    db
      .select()
      .from(adminAuditLog)
      .where(or(and(eq(adminAuditLog.targetId, id), inArray(adminAuditLog.targetType, ["user", "teacher", "enrollment"])), eq(adminAuditLog.actorId, id)))
      .orderBy(desc(adminAuditLog.createdAt))
      .limit(20),
    db.select({ n: count() }).from(lessonProgress).where(and(eq(lessonProgress.userId, id), isNotNull(lessonProgress.completedAt))),
  ]);
  const [hasPassword, allCourses] = await Promise.all([
    db.query.account.findFirst({ where: and(eq(account.userId, id), eq(account.providerId, "credential")), columns: { id: true } }),
    db.select({ id: courses.id, title: courses.title }).from(courses).orderBy(asc(courses.title)),
  ]);
  const enrolledIds = new Set(enrolled.map((e) => e.courseId));
  return {
    user: u,
    isMe: me.id === id,
    enrolled,
    teaching,
    activeSessions: sessions.n,
    activity,
    completedLessons: completed.n,
    hasPassword: Boolean(hasPassword),
    courseOptions: allCourses.filter((c) => !enrolledIds.has(c.id)),
  };
}

export async function listActivity(params: { page?: number; type?: string }) {
  await admin();
  const page = Math.max(1, params.page ?? 1);
  const types = ["course", "module", "lesson", "quiz", "user", "enrollment", "teacher"];
  const where = params.type && types.includes(params.type) ? eq(adminAuditLog.targetType, params.type) : undefined;
  const [rows, [{ total }]] = await Promise.all([
    db.select().from(adminAuditLog).where(where).orderBy(desc(adminAuditLog.createdAt)).limit(PAGE_SIZE).offset((page - 1) * PAGE_SIZE),
    db.select({ total: count() }).from(adminAuditLog).where(where),
  ]);
  return { rows, page, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}
