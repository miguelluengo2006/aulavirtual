import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { decideCourseAccess, type AccessInput } from "./access-rules";

type Row = {
  role: AccessInput["role"];
  status: AccessInput["courseStatus"];
  included: boolean;
  has_enrollment: boolean;
  has_subscription: boolean;
  is_teacher: boolean;
};

/**
 * Punto único para saber si un usuario puede ver un curso.
 * Todo (vídeo, quiz, dudas, foro) debe pasar por aquí.
 *
 * Es una sola consulta: se llama en cada latido del reproductor y en cada
 * petición de vídeo, así que tiene que ser barata.
 */
export async function canAccessCourse(
  userId: string,
  courseId: string,
): Promise<boolean> {
  const { rows } = await db.execute<Row>(sql`
    select
      u.role,
      c.status,
      c.included_in_subscription as included,
      exists (select 1 from enrollments e where e.user_id = u.id and e.course_id = c.id) as has_enrollment,
      exists (select 1 from subscriptions s where s.user_id = u.id and s.status in ('active', 'trialing')) as has_subscription,
      exists (select 1 from course_teachers t where t.user_id = u.id and t.course_id = c.id) as is_teacher
    from "user" u, courses c
    where u.id = ${userId} and c.id = ${courseId} and u.banned = false
  `);
  const r = rows[0];
  if (!r) return false;

  return decideCourseAccess({
    role: r.role,
    courseStatus: r.status,
    includedInSubscription: r.included,
    hasEnrollment: r.has_enrollment,
    hasActiveSubscription: r.has_subscription,
    isTeacherOfCourse: r.is_teacher,
  });
}
