import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  courses,
  courseTeachers,
  enrollments,
  subscriptions,
  user,
} from "@/db/schema";
import { decideCourseAccess } from "./access-rules";

/**
 * Punto único para saber si un usuario puede ver un curso.
 * Todo (vídeo, quiz, dudas, foro) debe pasar por aquí.
 */
export async function canAccessCourse(
  userId: string,
  courseId: string,
): Promise<boolean> {
  const [u, course, enrollment, subs, teacher] = await Promise.all([
    db.query.user.findFirst({ where: eq(user.id, userId), columns: { role: true } }),
    db.query.courses.findFirst({
      where: eq(courses.id, courseId),
      columns: { status: true, includedInSubscription: true },
    }),
    db.query.enrollments.findFirst({
      where: and(eq(enrollments.userId, userId), eq(enrollments.courseId, courseId)),
      columns: { source: true },
    }),
    db
      .select({ status: subscriptions.status })
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.userId, userId),
          inArray(subscriptions.status, ["active", "trialing"]),
        ),
      )
      .limit(1),
    db.query.courseTeachers.findFirst({
      where: and(eq(courseTeachers.userId, userId), eq(courseTeachers.courseId, courseId)),
    }),
  ]);

  if (!u || !course) return false;

  return decideCourseAccess({
    role: u.role,
    courseStatus: course.status,
    includedInSubscription: course.includedInSubscription,
    hasEnrollment: Boolean(enrollment),
    hasActiveSubscription: subs.length > 0,
    isTeacherOfCourse: Boolean(teacher),
  });
}
