// Reglas del panel de administración. Funciones puras y esquemas, con tests.
import { z } from "zod";

export type Role = "admin" | "teacher" | "student";

// ─── Validación de datos ──────────────────────────────────────

export const slugSchema = z
  .string()
  .trim()
  .min(2, "La dirección debe tener al menos 2 caracteres")
  .max(80, "La dirección es demasiado larga")
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Usa solo minúsculas, números y guiones");

export const titleSchema = z.string().trim().min(2, "El título es demasiado corto").max(160, "El título es demasiado largo");

/** Clave del vídeo en R2: ruta relativa sin "..", o "TODO" si aún no hay vídeo. */
export const videoKeySchema = z
  .string()
  .trim()
  .min(1, "Indica la clave del vídeo (o TODO si aún no lo tienes)")
  .max(300)
  .refine((k) => k === "TODO" || (/^[a-zA-Z0-9][a-zA-Z0-9/_.-]*\.m3u8$/.test(k) && !k.includes("..")), {
    message: "La clave del vídeo debe ser la ruta del index.m3u8 en R2 (p. ej. cursos/mi-curso/intro/index.m3u8)",
  });

export const priceCentsSchema = z
  .number()
  .int()
  .min(0, "El precio no puede ser negativo")
  .max(100_000_00, "El precio es demasiado alto")
  .nullable();

export const courseFieldsSchema = z.object({
  title: titleSchema,
  slug: slugSchema,
  description: z.string().trim().min(10, "La descripción es demasiado corta").max(2000),
  priceCents: priceCentsSchema,
  currency: z.enum(["eur", "usd"]),
  includedInSubscription: z.boolean(),
});

export const optionSchema = z.object({
  id: z.string().max(64).optional(),
  text: z.string().trim().min(1, "Hay una opción vacía").max(300),
  isCorrect: z.boolean(),
});

export const questionSchema = z
  .object({
    id: z.string().max(64).optional(),
    prompt: z.string().trim().min(5, "Hay una pregunta demasiado corta").max(500),
    explanation: z.string().trim().min(5, "Falta la explicación de una pregunta").max(1000),
    options: z.array(optionSchema).min(2, "Cada pregunta necesita al menos 2 opciones").max(6, "Máximo 6 opciones por pregunta"),
  })
  .refine((q) => q.options.filter((o) => o.isCorrect).length === 1, {
    message: "Cada pregunta debe tener exactamente una respuesta correcta",
  });

export const quizSchema = z.object({
  lessonId: z.string().min(1).max(64),
  questions: z.array(questionSchema).max(20, "Máximo 20 preguntas por lección"),
});

// ─── Utilidades ───────────────────────────────────────────────

export function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
}

// ─── Reglas de negocio ────────────────────────────────────────

export type PublishInput = {
  priceCents: number | null;
  lessons: { title: string; videoKey: string; durationSeconds: number | null }[];
};

/** Lo que impide publicar un curso. Vacío = se puede publicar. */
export function publishIssues(c: PublishInput): string[] {
  const issues: string[] = [];
  if (c.priceCents === null) issues.push("Falta el precio del curso.");
  if (c.lessons.length === 0) issues.push("El curso no tiene lecciones.");
  const noVideo = c.lessons.filter((l) => l.videoKey === "TODO");
  if (noVideo.length) {
    issues.push(
      `${noVideo.length === 1 ? "Una lección no tiene" : `${noVideo.length} lecciones no tienen`} vídeo: ${noVideo
        .slice(0, 3)
        .map((l) => `"${l.title}"`)
        .join(", ")}${noVideo.length > 3 ? "…" : ""}.`,
    );
  }
  return issues;
}

/** Motivo por el que no se puede eliminar un curso, o null si se puede. */
export function deleteCourseIssue(c: { status: string; purchases: number }): string | null {
  if (c.status === "published") return "Un curso publicado no se puede eliminar. Archívalo o pásalo a borrador primero.";
  if (c.purchases > 0) {
    return `${c.purchases === 1 ? "Un alumno ha comprado" : `${c.purchases} alumnos han comprado`} este curso: no se puede eliminar, solo archivar.`;
  }
  return null;
}

/** Motivo por el que no se puede cambiar el rol, o null si se puede. */
export function roleChangeIssue(p: {
  actorId: string;
  targetId: string;
  currentRole: Role;
  newRole: Role;
  adminCount: number;
}): string | null {
  if (p.currentRole === p.newRole) return "El usuario ya tiene ese rol.";
  if (p.actorId === p.targetId) return "No puedes cambiar tu propio rol. Pídeselo a otro administrador.";
  if (p.currentRole === "admin" && p.adminCount <= 1) return "Tiene que quedar al menos un administrador.";
  return null;
}

/** Las acciones delicadas exigen haber entrado hace poco. */
export const FRESH_SESSION_MS = 12 * 60 * 60 * 1000;

export function isSessionFresh(sessionCreatedAt: Date, now = new Date(), maxAgeMs = FRESH_SESSION_MS): boolean {
  return now.getTime() - sessionCreatedAt.getTime() <= maxAgeMs;
}

/** Nueva posición tras mover un elemento arriba o abajo. Devuelve null si no se puede mover. */
export function swapIndex(index: number, length: number, direction: "up" | "down"): number | null {
  const target = direction === "up" ? index - 1 : index + 1;
  return target < 0 || target >= length ? null : target;
}

/** Euros escritos por una persona ("49,90", "49.9", "49") → céntimos. null si está vacío. */
export function parsePrice(input: string): number | null | "invalid" {
  const s = input.trim().replace(/\s|€/g, "");
  if (!s) return null;
  if (!/^\d{1,6}([.,]\d{1,2})?$/.test(s)) return "invalid";
  return Math.round(Number(s.replace(",", ".")) * 100);
}
