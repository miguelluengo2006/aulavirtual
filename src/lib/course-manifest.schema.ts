// Formato del manifiesto que genera Claude Code y que importa `npm run course:import`.
// Sin "server-only": lo usan también los scripts de la carpeta scripts/.
import { z } from "zod";

export const TODO = "TODO";

// Identificador estable: permite reimportar sin perder el progreso de los alumnos.
const stableId = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Usa minúsculas, números y guiones");

const option = z.object({
  text: z.string().min(1),
  isCorrect: z.boolean(),
});

const question = z
  .object({
    id: stableId,
    prompt: z.string().min(5),
    options: z.array(option).min(3).max(4),
    explanation: z.string().min(5),
  })
  .refine((q) => q.options.filter((o) => o.isCorrect).length === 1, {
    message: "Cada pregunta debe tener exactamente una opción correcta",
  });

const lesson = z.object({
  id: stableId,
  title: z.string().min(1),
  description: z.string().optional(),
  video: z.object({
    provider: z.enum(["r2", "stream"]),
    // Clave del objeto en R2 (p. ej. "cursos/nextjs/01/index.m3u8") o UID de Stream.
    // "TODO" si falta: se importa, pero el curso no se podrá publicar.
    key: z.string().min(1),
    durationSeconds: z.number().int().positive().optional(),
  }),
  // Archivo HTML del que se ha sacado el quiz (para trazabilidad).
  sourceFile: z.string().optional(),
  quiz: z.object({ questions: z.array(question).min(3).max(5) }).optional(),
});

const courseModule = z.object({
  id: stableId,
  title: z.string().min(1),
  lessons: z.array(lesson).min(1),
});

export const courseManifestSchema = z
  .object({
    version: z.literal(1),
    slug: stableId,
    title: z.string().min(1),
    description: z.string().min(1),
    coverImage: z.string().optional(),
    pricing: z.object({
      // null si el precio no viene en la carpeta: se fija desde el panel.
      priceCents: z.number().int().nonnegative().nullable(),
      currency: z.enum(["eur", "usd"]).default("eur"),
      includedInSubscription: z.boolean().default(true),
    }),
    // Emails de los profesores que atienden dudas y foro.
    teachers: z.array(z.email()).default([]),
    modules: z.array(courseModule).min(1),
    // Lo que Claude Code ha tenido que suponer o no ha encontrado.
    notes: z.array(z.string()).default([]),
  })
  .superRefine((course, ctx) => {
    const check = (kind: string, ids: string[]) => {
      const seen = new Set<string>();
      for (const id of ids) {
        if (seen.has(id)) {
          ctx.addIssue({ code: "custom", message: `Id de ${kind} duplicado: ${id}` });
        }
        seen.add(id);
      }
    };
    check("módulo", course.modules.map((m) => m.id));
    // Los ids de lección deben ser únicos en todo el curso.
    check(
      "lección",
      course.modules.flatMap((m) => m.lessons.map((l) => l.id)),
    );
    for (const l of course.modules.flatMap((m) => m.lessons)) {
      if (l.quiz) check(`pregunta (lección ${l.id})`, l.quiz.questions.map((q) => q.id));
    }
  });

export type CourseManifest = z.infer<typeof courseManifestSchema>;

/** Avisos que no impiden importar, pero sí publicar o que conviene revisar. */
export function manifestWarnings(m: CourseManifest): string[] {
  const w: string[] = [];
  if (m.pricing.priceCents === null) w.push("Falta el precio del curso.");
  if (m.teachers.length === 0) w.push("No hay profesores asignados.");
  for (const mod of m.modules) {
    for (const l of mod.lessons) {
      if (l.video.key === TODO) w.push(`Lección "${l.id}": falta el vídeo.`);
      if (!l.quiz) w.push(`Lección "${l.id}": no tiene quiz.`);
      if (!l.video.durationSeconds) w.push(`Lección "${l.id}": falta la duración del vídeo.`);
    }
  }
  return w;
}

/** Formatea los errores de Zod como "ruta: mensaje". */
export function formatManifestErrors(error: z.ZodError): string[] {
  return error.issues.map((i) => `${i.path.join(".") || "(raíz)"}: ${i.message}`);
}
