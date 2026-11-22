"use server";

import { asc, count, eq } from "drizzle-orm";
import { z } from "zod";
import { courses, lessonProgress, lessons, modules } from "@/db/schema";
import { AdminError, adminAction, idInput, type Tx } from "@/lib/admin/action";
import { slugify, swapIndex, titleSchema, videoKeySchema } from "@/lib/admin/rules";

/** Reescribe las posiciones 0..n-1 en el orden dado. */
async function writeOrder(tx: Tx, table: typeof modules | typeof lessons, ids: string[]) {
  for (const [i, id] of ids.entries()) {
    await tx.update(table).set({ position: i }).where(eq(table.id, id));
  }
}

/** Id estable único dentro del curso, a partir del título. */
async function uniqueExternalId(tx: Tx, table: typeof modules | typeof lessons, courseId: string, title: string) {
  const base = slugify(title) || "elemento";
  const existing = await tx
    .select({ e: table.externalId })
    .from(table)
    .where(eq(table.courseId, courseId));
  const taken = new Set(existing.map((r) => r.e));
  if (!taken.has(base)) return base;
  for (let i = 2; ; i++) if (!taken.has(`${base}-${i}`)) return `${base}-${i}`;
}

async function courseTitle(tx: Tx, courseId: string) {
  const c = await tx.query.courses.findFirst({ where: eq(courses.id, courseId), columns: { title: true } });
  if (!c) throw new AdminError("El curso no existe.");
  return c.title;
}

// ─── Módulos ──────────────────────────────────────────────────

const createModuleSchema = z.object({ courseId: idInput, title: titleSchema });
const createModuleImpl = adminAction({
  schema: createModuleSchema,
  run: async ({ courseId, title }, { tx }) => {
    const ct = await courseTitle(tx, courseId);
    const [{ n }] = await tx.select({ n: count() }).from(modules).where(eq(modules.courseId, courseId));
    const externalId = await uniqueExternalId(tx, modules, courseId, title);
    const [m] = await tx.insert(modules).values({ courseId, title, externalId, position: n }).returning({ id: modules.id });
    return {
      data: { id: m.id },
      audit: { action: "module.create", targetType: "module", targetId: m.id, summary: `Añadió el módulo "${title}" a "${ct}"` },
    };
  },
});
export async function createModule(input: z.input<typeof createModuleSchema>) {
  return createModuleImpl(input);
}

const renameModuleSchema = z.object({ id: idInput, title: titleSchema });
const renameModuleImpl = adminAction({
  schema: renameModuleSchema,
  run: async ({ id, title }, { tx }) => {
    const m = await tx.query.modules.findFirst({ where: eq(modules.id, id) });
    if (!m) throw new AdminError("El módulo no existe.");
    await tx.update(modules).set({ title }).where(eq(modules.id, id));
    return {
      data: undefined,
      audit: { action: "module.rename", targetType: "module", targetId: id, summary: `Renombró el módulo "${m.title}" a "${title}"` },
    };
  },
});
export async function renameModule(input: z.input<typeof renameModuleSchema>) {
  return renameModuleImpl(input);
}

const deleteModuleSchema = z.object({ id: idInput });
const deleteModuleImpl = adminAction({
  schema: deleteModuleSchema,
  run: async ({ id }, { tx }) => {
    const m = await tx.query.modules.findFirst({ where: eq(modules.id, id) });
    if (!m) throw new AdminError("El módulo no existe.");
    const [{ n }] = await tx.select({ n: count() }).from(lessons).where(eq(lessons.moduleId, id));
    if (n > 0) throw new AdminError("El módulo tiene lecciones. Muévelas o elimínalas antes.");
    await tx.delete(modules).where(eq(modules.id, id));
    const rest = await tx.select({ id: modules.id }).from(modules).where(eq(modules.courseId, m.courseId)).orderBy(asc(modules.position));
    await writeOrder(tx, modules, rest.map((r) => r.id));
    return {
      data: undefined,
      audit: { action: "module.delete", targetType: "module", targetId: id, summary: `Eliminó el módulo vacío "${m.title}"` },
    };
  },
});
export async function deleteModule(input: z.input<typeof deleteModuleSchema>) {
  return deleteModuleImpl(input);
}

const moveSchema = z.object({ id: idInput, direction: z.enum(["up", "down"]) });

const moveModuleImpl = adminAction({
  schema: moveSchema,
  run: async ({ id, direction }, { tx }) => {
    const m = await tx.query.modules.findFirst({ where: eq(modules.id, id) });
    if (!m) throw new AdminError("El módulo no existe.");
    const all = await tx.select({ id: modules.id }).from(modules).where(eq(modules.courseId, m.courseId)).orderBy(asc(modules.position));
    const ids = all.map((r) => r.id);
    const i = ids.indexOf(id);
    const j = swapIndex(i, ids.length, direction);
    if (j === null) throw new AdminError("El módulo ya está en el extremo.");
    [ids[i], ids[j]] = [ids[j], ids[i]];
    await writeOrder(tx, modules, ids);
    return {
      data: undefined,
      audit: { action: "module.move", targetType: "module", targetId: id, summary: `Movió el módulo "${m.title}" ${direction === "up" ? "arriba" : "abajo"}` },
    };
  },
});
export async function moveModule(input: z.input<typeof moveSchema>) {
  return moveModuleImpl(input);
}

// ─── Lecciones ────────────────────────────────────────────────

const lessonFields = z.object({
  title: titleSchema,
  description: z.string().trim().max(2000).optional().transform((v) => v || null),
  videoKey: videoKeySchema,
  durationSeconds: z.number().int().min(1).max(6 * 3600).nullable(),
});

const createLessonSchema = lessonFields.extend({ moduleId: idInput });
const createLessonImpl = adminAction({
  schema: createLessonSchema,
  run: async ({ moduleId, ...fields }, { tx }) => {
    const m = await tx.query.modules.findFirst({ where: eq(modules.id, moduleId) });
    if (!m) throw new AdminError("El módulo no existe.");
    const [{ n }] = await tx.select({ n: count() }).from(lessons).where(eq(lessons.moduleId, moduleId));
    const externalId = await uniqueExternalId(tx, lessons, m.courseId, fields.title);
    const [l] = await tx
      .insert(lessons)
      .values({ ...fields, courseId: m.courseId, moduleId, externalId, position: n, videoProvider: "r2" })
      .returning({ id: lessons.id });
    return {
      data: { id: l.id },
      audit: { action: "lesson.create", targetType: "lesson", targetId: l.id, summary: `Añadió la lección "${fields.title}" al módulo "${m.title}"` },
    };
  },
});
export async function createLesson(input: z.input<typeof createLessonSchema>) {
  return createLessonImpl(input);
}

const updateLessonSchema = lessonFields.extend({ id: idInput, moduleId: idInput });
const updateLessonImpl = adminAction({
  schema: updateLessonSchema,
  run: async ({ id, moduleId, ...fields }, { tx }) => {
    const l = await tx.query.lessons.findFirst({ where: eq(lessons.id, id) });
    if (!l) throw new AdminError("La lección no existe.");
    const target = await tx.query.modules.findFirst({ where: eq(modules.id, moduleId) });
    // Solo se puede mover a un módulo del mismo curso.
    if (!target || target.courseId !== l.courseId) throw new AdminError("Ese módulo no es de este curso.");

    let position = l.position;
    if (moduleId !== l.moduleId) {
      const [{ n }] = await tx.select({ n: count() }).from(lessons).where(eq(lessons.moduleId, moduleId));
      position = n; // al final del módulo nuevo
    }
    await tx.update(lessons).set({ ...fields, moduleId, position }).where(eq(lessons.id, id));
    if (moduleId !== l.moduleId) {
      const rest = await tx.select({ id: lessons.id }).from(lessons).where(eq(lessons.moduleId, l.moduleId)).orderBy(asc(lessons.position));
      await writeOrder(tx, lessons, rest.map((r) => r.id));
    }
    return {
      data: undefined,
      audit: {
        action: "lesson.update",
        targetType: "lesson",
        targetId: id,
        summary: `Editó la lección "${fields.title}"${moduleId !== l.moduleId ? ` y la movió al módulo "${target.title}"` : ""}`,
        details: l.videoKey !== fields.videoKey ? { videoKey: { before: l.videoKey, after: fields.videoKey } } : undefined,
      },
    };
  },
});
export async function updateLesson(input: z.input<typeof updateLessonSchema>) {
  return updateLessonImpl(input);
}

const moveLessonImpl = adminAction({
  schema: moveSchema,
  run: async ({ id, direction }, { tx }) => {
    const l = await tx.query.lessons.findFirst({ where: eq(lessons.id, id) });
    if (!l) throw new AdminError("La lección no existe.");
    const all = await tx.select({ id: lessons.id }).from(lessons).where(eq(lessons.moduleId, l.moduleId)).orderBy(asc(lessons.position));
    const ids = all.map((r) => r.id);
    const i = ids.indexOf(id);
    const j = swapIndex(i, ids.length, direction);
    if (j === null) throw new AdminError("La lección ya está en el extremo del módulo.");
    [ids[i], ids[j]] = [ids[j], ids[i]];
    await writeOrder(tx, lessons, ids);
    return {
      data: undefined,
      audit: { action: "lesson.move", targetType: "lesson", targetId: id, summary: `Movió la lección "${l.title}" ${direction === "up" ? "arriba" : "abajo"}` },
    };
  },
});
export async function moveLesson(input: z.input<typeof moveSchema>) {
  return moveLessonImpl(input);
}

const deleteLessonSchema = z.object({ id: idInput, confirm: z.literal(true) });
const deleteLessonImpl = adminAction({
  schema: deleteLessonSchema,
  sensitive: true,
  run: async ({ id }, { tx }) => {
    const l = await tx.query.lessons.findFirst({ where: eq(lessons.id, id) });
    if (!l) throw new AdminError("La lección no existe.");
    const [{ n }] = await tx.select({ n: count() }).from(lessonProgress).where(eq(lessonProgress.lessonId, id));
    await tx.delete(lessons).where(eq(lessons.id, id));
    const rest = await tx.select({ id: lessons.id }).from(lessons).where(eq(lessons.moduleId, l.moduleId)).orderBy(asc(lessons.position));
    await writeOrder(tx, lessons, rest.map((r) => r.id));
    return {
      data: undefined,
      audit: {
        action: "lesson.delete",
        targetType: "lesson",
        targetId: id,
        summary: `Eliminó la lección "${l.title}"${n ? ` (con el progreso de ${n} alumno${n === 1 ? "" : "s"})` : ""}`,
        details: { videoKey: l.videoKey, courseId: l.courseId },
      },
    };
  },
});
export async function deleteLesson(input: z.input<typeof deleteLessonSchema>) {
  return deleteLessonImpl(input);
}
