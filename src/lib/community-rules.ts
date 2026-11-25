// Reglas del foro del curso y de las dudas de cada lección. Funciones puras, con tests.
import { z } from "zod";

/** Quita espacios sobrantes y caracteres de control (deja los saltos de línea). */
export function cleanText(s: string): string {
  return s
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const text = (min: number, max: number, tooShort: string, tooLong: string) =>
  z.string().transform(cleanText).pipe(z.string().min(min, tooShort).max(max, tooLong));

export const titleSchema = text(5, 150, "El título es demasiado corto", "El título es demasiado largo (máximo 150 caracteres)");
export const bodySchema = text(3, 5000, "El mensaje es demasiado corto", "El mensaje es demasiado largo (máximo 5000 caracteres)");

/** Mensajes que puede publicar una persona (hilos, respuestas, dudas): por minuto y por hora. */
export const POST_LIMITS = { perMinute: 5, perHour: 40 };

export function canPostNow(lastMinute: number, lastHour: number): boolean {
  return lastMinute < POST_LIMITS.perMinute && lastHour < POST_LIMITS.perHour;
}

export type CommunityRole = { access: boolean; moderate: boolean };

/**
 * Quién modera: el admin y los profesores del curso. Los alumnos con acceso
 * participan. Nadie sin acceso al curso lee ni escribe.
 */
export function communityRole(input: {
  hasAccess: boolean;
  role: "admin" | "teacher" | "student";
  isTeacherOfCourse: boolean;
}): CommunityRole {
  if (!input.hasAccess) return { access: false, moderate: false };
  return { access: true, moderate: input.role === "admin" || input.isTeacherOfCourse };
}

/** Se puede borrar un mensaje propio o, si se modera, cualquiera. */
export function canDelete(role: CommunityRole, authorId: string, userId: string): boolean {
  return role.access && (role.moderate || authorId === userId);
}

/** En un hilo cerrado solo escriben los moderadores. */
export function canReply(role: CommunityRole, locked: boolean): boolean {
  return role.access && (!locked || role.moderate);
}
