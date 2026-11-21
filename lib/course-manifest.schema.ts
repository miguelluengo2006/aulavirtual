// lib/course-manifest.schema.ts
// Formato del manifiesto que genera Claude Code y que importa `npm run course:import`.
import { z } from "zod";

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
    key: z.string().min(1),
    durationSeconds: z.number().int().positive().optional(),
  }),
  // Archivo HTML del que se ha sacado el quiz (para trazabilidad).
  sourceFile: z.string().optional(),
  quiz: z
    .object({ questions: z.array(question).min(3).max(5) })
    .optional(),
});

const module_ = z.object({
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
      priceCents: z.number().int().nonnegative(),
      currency: z.enum(["eur", "usd"]).default("eur"),
      includedInSubscription: z.boolean().default(true),
    }),
    // Emails de los profesores que atienden dudas y foro.
    teachers: z.array(z.string().email()).default([]),
    modules: z.array(module_).min(1),
    // Lo que Claude Code ha tenido que suponer o no ha encontrado.
    notes: z.array(z.string()).default([]),
  })
  .superRefine((course, ctx) => {
    // Los ids de lección deben ser únicos en todo el curso.
    const seen = new Set<string>();
    for (const m of course.modules) {
      for (const l of m.lessons) {
        if (seen.has(l.id)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Id de lección duplicado: ${l.id}`,
          });
        }
        seen.add(l.id);
      }
    }
  });

export type CourseManifest = z.infer<typeof courseManifestSchema>;
