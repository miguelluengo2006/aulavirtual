"use server";

import { and, count, eq } from "drizzle-orm";
import { z } from "zod";
import { courseTeachers, courses, enrollments, session, user } from "@/db/schema";
import { AdminError, adminAction, emailInput, idInput, type Tx } from "@/lib/admin/action";
import { roleChangeIssue } from "@/lib/admin/rules";

async function findUserByEmail(tx: Tx, email: string) {
  const u = await tx.query.user.findFirst({ where: eq(user.email, email) });
  if (!u) throw new AdminError(`No hay ninguna cuenta con ${email}. Tiene que registrarse primero.`);
  return u;
}

async function getCourse(tx: Tx, id: string) {
  const c = await tx.query.courses.findFirst({ where: eq(courses.id, id), columns: { id: true, title: true } });
  if (!c) throw new AdminError("El curso no existe.");
  return c;
}

// ─── Profesores de un curso ───────────────────────────────────

const addTeacherSchema = z.object({ courseId: idInput, email: emailInput });
const addTeacherImpl = adminAction({
  schema: addTeacherSchema,
  run: async ({ courseId, email }, { tx }) => {
    const c = await getCourse(tx, courseId);
    const u = await findUserByEmail(tx, email);
    const inserted = await tx.insert(courseTeachers).values({ courseId, userId: u.id }).onConflictDoNothing().returning();
    if (!inserted.length) throw new AdminError(`${email} ya es profesor de este curso.`);
    // Un alumno pasa a profesor; un admin sigue siendo admin.
    if (u.role === "student") await tx.update(user).set({ role: "teacher" }).where(eq(user.id, u.id));
    return {
      data: undefined,
      audit: { action: "teacher.add", targetType: "teacher", targetId: u.id, summary: `Asignó a ${email} como profesor de "${c.title}"`, details: { courseId } },
    };
  },
});
export async function addTeacher(input: z.input<typeof addTeacherSchema>) {
  return addTeacherImpl(input);
}

const removeTeacherSchema = z.object({ courseId: idInput, userId: idInput });
const removeTeacherImpl = adminAction({
  schema: removeTeacherSchema,
  run: async ({ courseId, userId }, { tx }) => {
    const c = await getCourse(tx, courseId);
    const deleted = await tx
      .delete(courseTeachers)
      .where(and(eq(courseTeachers.courseId, courseId), eq(courseTeachers.userId, userId)))
      .returning();
    if (!deleted.length) throw new AdminError("No era profesor de este curso.");
    const u = await tx.query.user.findFirst({ where: eq(user.id, userId), columns: { email: true, role: true } });
    // Si ya no le queda ningún curso, vuelve a ser alumno.
    const [{ n }] = await tx.select({ n: count() }).from(courseTeachers).where(eq(courseTeachers.userId, userId));
    if (n === 0 && u?.role === "teacher") await tx.update(user).set({ role: "student" }).where(eq(user.id, userId));
    return {
      data: undefined,
      audit: { action: "teacher.remove", targetType: "teacher", targetId: userId, summary: `Quitó a ${u?.email ?? userId} como profesor de "${c.title}"`, details: { courseId } },
    };
  },
});
export async function removeTeacher(input: z.input<typeof removeTeacherSchema>) {
  return removeTeacherImpl(input);
}

// ─── Acceso manual de alumnos ─────────────────────────────────

const grantSchema = z.object({ courseId: idInput, email: emailInput });
const grantImpl = adminAction({
  schema: grantSchema,
  run: async ({ courseId, email }, { tx }) => {
    const c = await getCourse(tx, courseId);
    const u = await findUserByEmail(tx, email);
    const inserted = await tx.insert(enrollments).values({ courseId, userId: u.id, source: "manual" }).onConflictDoNothing().returning();
    if (!inserted.length) throw new AdminError(`${email} ya tiene acceso a este curso.`);
    return {
      data: undefined,
      audit: { action: "enrollment.grant", targetType: "enrollment", targetId: u.id, summary: `Dio acceso a ${email} a "${c.title}"`, details: { courseId } },
    };
  },
});
export async function grantAccess(input: z.input<typeof grantSchema>) {
  return grantImpl(input);
}

const revokeSchema = z.object({ courseId: idInput, userId: idInput });
const revokeImpl = adminAction({
  schema: revokeSchema,
  run: async ({ courseId, userId }, { tx }) => {
    const c = await getCourse(tx, courseId);
    const e = await tx.query.enrollments.findFirst({ where: and(eq(enrollments.courseId, courseId), eq(enrollments.userId, userId)) });
    if (!e) throw new AdminError("Ese alumno no tiene acceso manual a este curso.");
    // Las compras no se quitan desde aquí: se gestionan con un reembolso en Stripe.
    if (e.source !== "manual") throw new AdminError("Este alumno compró el curso. Para quitarle el acceso hay que hacer un reembolso.");
    await tx.delete(enrollments).where(and(eq(enrollments.courseId, courseId), eq(enrollments.userId, userId)));
    const u = await tx.query.user.findFirst({ where: eq(user.id, userId), columns: { email: true } });
    return {
      data: undefined,
      audit: { action: "enrollment.revoke", targetType: "enrollment", targetId: userId, summary: `Quitó el acceso de ${u?.email ?? userId} a "${c.title}"`, details: { courseId } },
    };
  },
});
export async function revokeAccess(input: z.input<typeof revokeSchema>) {
  return revokeImpl(input);
}

// ─── Usuarios ─────────────────────────────────────────────────

const roleSchema = z.object({ userId: idInput, role: z.enum(["admin", "teacher", "student"]) });
const roleImpl = adminAction({
  schema: roleSchema,
  sensitive: true,
  run: async ({ userId, role }, { tx, actor }) => {
    const target = await tx.query.user.findFirst({ where: eq(user.id, userId) });
    if (!target) throw new AdminError("El usuario no existe.");
    // Se cuenta dentro de la transacción y bloqueando, para que dos admins no se quiten a la vez.
    const admins = await tx.select({ id: user.id }).from(user).where(eq(user.role, "admin")).for("update");
    const issue = roleChangeIssue({
      actorId: actor.id,
      targetId: userId,
      currentRole: target.role,
      newRole: role,
      adminCount: admins.length,
    });
    if (issue) throw new AdminError(issue);
    await tx.update(user).set({ role }).where(eq(user.id, userId));
    // Al quitar permisos, se cierran sus sesiones para que el cambio sea inmediato en todos sus dispositivos.
    if (target.role === "admin") await tx.delete(session).where(eq(session.userId, userId));
    // Un alumno no atiende cursos: se le quita de los que tuviera como profesor.
    const unassigned = role === "student" ? await tx.delete(courseTeachers).where(eq(courseTeachers.userId, userId)).returning() : [];
    const names = { admin: "administrador", teacher: "profesor", student: "alumno" };
    return {
      data: undefined,
      audit: {
        action: "user.role",
        targetType: "user",
        targetId: userId,
        summary: `Cambió el rol de ${target.email}: ${names[target.role]} → ${names[role]}${unassigned.length ? ` (deja de ser profesor de ${unassigned.length} curso${unassigned.length === 1 ? "" : "s"})` : ""}`,
      },
    };
  },
});
export async function changeRole(input: z.input<typeof roleSchema>) {
  return roleImpl(input);
}

const sessionsSchema = z.object({ userId: idInput });
const sessionsImpl = adminAction({
  schema: sessionsSchema,
  sensitive: true,
  run: async ({ userId }, { tx, actor }) => {
    if (userId === actor.id) throw new AdminError("Para cerrar tus propias sesiones, usa «Salir».");
    const target = await tx.query.user.findFirst({ where: eq(user.id, userId), columns: { email: true } });
    if (!target) throw new AdminError("El usuario no existe.");
    const deleted = await tx.delete(session).where(eq(session.userId, userId)).returning({ id: session.id });
    return {
      data: { closed: deleted.length },
      audit: { action: "user.sessions", targetType: "user", targetId: userId, summary: `Cerró ${deleted.length} sesión(es) de ${target.email}` },
    };
  },
});
export async function revokeSessions(input: z.input<typeof sessionsSchema>) {
  return sessionsImpl(input);
}
