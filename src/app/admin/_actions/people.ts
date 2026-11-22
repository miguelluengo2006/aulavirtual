"use server";

import { randomBytes } from "node:crypto";
import { and, count, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { account, courseTeachers, courses, enrollments, session, user, verification } from "@/db/schema";
import { AdminError, adminAction, emailInput, idInput, type Tx } from "@/lib/admin/action";
import { banIssue, roleChangeIssue } from "@/lib/admin/rules";
import { sendEmail } from "@/lib/email";
import { inviteTemplate, resetPasswordTemplate } from "@/lib/email-templates";
import { siteOrigin } from "@/lib/site-url";

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

// ─── Bloqueo, invitaciones y accesos desde la ficha del usuario ─

const banSchema = z.object({
  userId: idInput,
  banned: z.boolean(),
  reason: z.string().trim().max(300).optional(),
});
const banImpl = adminAction({
  schema: banSchema,
  sensitive: true,
  run: async ({ userId, banned, reason }, { tx, actor }) => {
    const target = await tx.query.user.findFirst({ where: eq(user.id, userId) });
    if (!target) throw new AdminError("El usuario no existe.");
    if (banned) {
      const issue = banIssue({ actorId: actor.id, targetId: userId, targetRole: target.role });
      if (issue) throw new AdminError(issue);
      if (target.banned) throw new AdminError("La cuenta ya está bloqueada.");
      await tx.update(user).set({ banned: true, bannedAt: new Date(), banReason: reason || null }).where(eq(user.id, userId));
      // Fuera ya: se cierran todas sus sesiones.
      await tx.delete(session).where(eq(session.userId, userId));
    } else {
      if (!target.banned) throw new AdminError("La cuenta no está bloqueada.");
      await tx.update(user).set({ banned: false, bannedAt: null, banReason: null }).where(eq(user.id, userId));
    }
    return {
      data: undefined,
      audit: {
        action: banned ? "user.ban" : "user.unban",
        targetType: "user",
        targetId: userId,
        summary: banned ? `Bloqueó la cuenta de ${target.email}${reason ? ` (${reason})` : ""}` : `Desbloqueó la cuenta de ${target.email}`,
      },
    };
  },
});
export async function setBanned(input: z.input<typeof banSchema>) {
  return banImpl(input);
}

/** Enlace de un solo uso para elegir contraseña (el mismo mecanismo que "recuperar contraseña"). */
async function createPasswordLink(tx: Tx, userId: string, days: number) {
  const token = randomBytes(24).toString("base64url");
  await tx.insert(verification).values({
    id: randomBytes(16).toString("base64url"),
    identifier: `reset-password:${token}`,
    value: userId,
    expiresAt: new Date(Date.now() + days * 24 * 60 * 60 * 1000),
  });
  return `${await siteOrigin()}/restablecer?token=${encodeURIComponent(token)}`;
}

const inviteSchema = z.object({
  name: z.string().trim().min(1, "Escribe el nombre").max(80, "El nombre es demasiado largo"),
  email: emailInput,
  role: z.enum(["admin", "teacher", "student"]),
  courseIds: z.array(idInput).max(50).default([]),
});
const inviteImpl = adminAction({
  schema: inviteSchema,
  sensitive: true,
  run: async ({ name, email, role, courseIds }, { tx }) => {
    const exists = await tx.query.user.findFirst({ where: eq(user.email, email), columns: { id: true } });
    if (exists) throw new AdminError("Ya hay una cuenta con ese email. Búscala en la lista de usuarios.");
    const found = courseIds.length
      ? await tx.select({ id: courses.id, title: courses.title }).from(courses).where(inArray(courses.id, courseIds))
      : [];
    if (found.length !== new Set(courseIds).size) throw new AdminError("Alguno de los cursos elegidos ya no existe.");

    const id = randomBytes(24).toString("base64url");
    // El admin responde del email, así que la cuenta nace confirmada.
    await tx.insert(user).values({ id, name: name.replace(/\s+/g, " "), email, role, emailVerified: true });
    if (found.length) {
      await tx.insert(enrollments).values(found.map((c) => ({ userId: id, courseId: c.id, source: "manual" as const })));
    }
    const url = await createPasswordLink(tx, id, 7);
    await sendEmail({ to: email, ...inviteTemplate(name, url, role) });
    const names = { admin: "administrador", teacher: "profesor", student: "alumno" };
    return {
      data: { id },
      audit: {
        action: "user.invite",
        targetType: "user",
        targetId: id,
        summary: `Invitó a ${email} como ${names[role]}${found.length ? ` con acceso a ${found.map((c) => `"${c.title}"`).join(", ")}` : ""}`,
      },
    };
  },
});
export async function inviteUser(input: z.input<typeof inviteSchema>) {
  return inviteImpl(input);
}

const linkSchema = z.object({ userId: idInput });
const linkImpl = adminAction({
  schema: linkSchema,
  run: async ({ userId }, { tx }) => {
    const target = await tx.query.user.findFirst({ where: eq(user.id, userId) });
    if (!target) throw new AdminError("El usuario no existe.");
    if (target.banned) throw new AdminError("La cuenta está bloqueada. Desbloquéala antes.");
    const hasPassword = await tx.query.account.findFirst({
      where: and(eq(account.userId, userId), eq(account.providerId, "credential")),
      columns: { id: true },
    });
    const url = await createPasswordLink(tx, userId, hasPassword ? 1 : 7);
    const t = hasPassword ? resetPasswordTemplate(target.name, url) : inviteTemplate(target.name, url, target.role);
    await sendEmail({ to: target.email, ...t });
    return {
      data: undefined,
      audit: {
        action: "user.password_link",
        targetType: "user",
        targetId: userId,
        summary: `Envió a ${target.email} un enlace para ${hasPassword ? "cambiar" : "elegir"} su contraseña`,
      },
    };
  },
});
export async function sendPasswordLink(input: z.input<typeof linkSchema>) {
  return linkImpl(input);
}

const grantToUserSchema = z.object({ userId: idInput, courseId: idInput });
const grantToUserImpl = adminAction({
  schema: grantToUserSchema,
  run: async ({ userId, courseId }, { tx }) => {
    const c = await getCourse(tx, courseId);
    const target = await tx.query.user.findFirst({ where: eq(user.id, userId), columns: { email: true } });
    if (!target) throw new AdminError("El usuario no existe.");
    const inserted = await tx.insert(enrollments).values({ courseId, userId, source: "manual" }).onConflictDoNothing().returning();
    if (!inserted.length) throw new AdminError("Ya tiene acceso a ese curso.");
    return {
      data: undefined,
      audit: { action: "enrollment.grant", targetType: "enrollment", targetId: userId, summary: `Dio acceso a ${target.email} a "${c.title}"`, details: { courseId } },
    };
  },
});
export async function grantAccessToUser(input: z.input<typeof grantToUserSchema>) {
  return grantToUserImpl(input);
}
