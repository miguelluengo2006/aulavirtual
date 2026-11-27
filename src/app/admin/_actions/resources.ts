"use server";

import { and, asc, count, eq } from "drizzle-orm";
import { z } from "zod";
import { lessons, modules, resources } from "@/db/schema";
import { AdminError, adminAction, idInput, type Tx } from "@/lib/admin/action";
import { swapIndex } from "@/lib/admin/rules";
import { deleteObject, objectSize, presignPut } from "@/lib/r2";
import {
  formatBytes,
  isAllowedResourceFile,
  isResourceKeyOf,
  MAX_RESOURCE_BYTES,
  RESOURCE_EXTENSIONS,
  resourceKey,
  resourceTitleSchema,
  resourceUrlSchema,
  safeFileName,
} from "@/lib/resource-rules";

// Recursos de una lección o de un módulo: enlaces o archivos (en R2).

const parentSchema = z.object({ type: z.enum(["lesson", "module"]), id: idInput });
type Parent = z.infer<typeof parentSchema>;

const contentTypeSchema = z
  .string()
  .trim()
  .max(120)
  .regex(/^[\w.+-]+\/[\w.+-]+$/)
  .catch("application/octet-stream");

/** Curso y título del módulo o lección (y que existe). */
async function resolveParent(tx: Tx, p: Parent) {
  if (p.type === "lesson") {
    const l = await tx.query.lessons.findFirst({ where: eq(lessons.id, p.id), columns: { courseId: true, title: true } });
    if (!l) throw new AdminError("La lección no existe.");
    return { courseId: l.courseId, title: l.title, label: `la lección "${l.title}"` };
  }
  const m = await tx.query.modules.findFirst({ where: eq(modules.id, p.id), columns: { courseId: true, title: true } });
  if (!m) throw new AdminError("El módulo no existe.");
  return { courseId: m.courseId, title: m.title, label: `el módulo "${m.title}"` };
}

const parentWhere = (p: Parent) => (p.type === "lesson" ? eq(resources.lessonId, p.id) : eq(resources.moduleId, p.id));

async function nextPosition(tx: Tx, p: Parent) {
  const [{ n }] = await tx.select({ n: count() }).from(resources).where(parentWhere(p));
  if (n >= 30) throw new AdminError("Como mucho 30 recursos por lección o módulo.");
  return n;
}

// ─── Enlace ───────────────────────────────────────────────────

const addLinkSchema = z.object({ parent: parentSchema, title: resourceTitleSchema, url: resourceUrlSchema });
const addLinkImpl = adminAction({
  schema: addLinkSchema,
  run: async ({ parent, title, url }, { tx }) => {
    const p = await resolveParent(tx, parent);
    const position = await nextPosition(tx, parent);
    const [r] = await tx
      .insert(resources)
      .values({
        courseId: p.courseId,
        lessonId: parent.type === "lesson" ? parent.id : null,
        moduleId: parent.type === "module" ? parent.id : null,
        kind: "link",
        title,
        url,
        position,
      })
      .returning({ id: resources.id });
    return {
      data: undefined,
      audit: { action: "resource.add", targetType: "resource", targetId: r.id, summary: `Añadió el enlace "${title}" a ${p.label}` },
    };
  },
});
export async function addLinkResource(input: z.input<typeof addLinkSchema>) {
  return addLinkImpl(input);
}

// ─── Archivo: 1) pedir dónde subirlo  2) guardarlo ───────────

const prepareSchema = z.object({
  parent: parentSchema,
  fileName: z.string().min(1).max(255),
  contentType: contentTypeSchema,
  size: z.number().int().positive(),
});
const prepareImpl = adminAction({
  schema: prepareSchema,
  run: async ({ parent, fileName, contentType, size }, { tx }) => {
    if (!isAllowedResourceFile(fileName)) {
      throw new AdminError(`Ese tipo de archivo no se admite. Admitidos: ${RESOURCE_EXTENSIONS.join(", ")}.`);
    }
    if (size > MAX_RESOURCE_BYTES) throw new AdminError(`El archivo pesa más de ${formatBytes(MAX_RESOURCE_BYTES)}.`);
    const p = await resolveParent(tx, parent);
    await nextPosition(tx, parent);
    const key = resourceKey(p.courseId, crypto.randomUUID(), fileName);
    const uploadUrl = await presignPut(key, contentType);
    // Aún no cambia nada: el registro de actividad se escribe al guardarlo.
    return { data: { key, uploadUrl, contentType }, audit: [] };
  },
});
export async function prepareResourceUpload(input: z.input<typeof prepareSchema>) {
  return prepareImpl(input);
}

const addFileSchema = z.object({
  parent: parentSchema,
  title: resourceTitleSchema,
  key: z.string().min(1).max(400),
  fileName: z.string().min(1).max(255),
  contentType: contentTypeSchema,
});
const addFileImpl = adminAction({
  schema: addFileSchema,
  run: async ({ parent, title, key, fileName, contentType }, { tx }) => {
    const p = await resolveParent(tx, parent);
    if (!isResourceKeyOf(p.courseId, key) || !isAllowedResourceFile(key)) throw new AdminError("El archivo no es válido.");
    const size = await objectSize(key);
    if (size === null) throw new AdminError("El archivo no ha llegado a subirse. Inténtalo de nuevo.");
    if (size > MAX_RESOURCE_BYTES) {
      await deleteObject(key).catch(() => {});
      throw new AdminError(`El archivo pesa más de ${formatBytes(MAX_RESOURCE_BYTES)}.`);
    }
    const position = await nextPosition(tx, parent);
    const [r] = await tx
      .insert(resources)
      .values({
        courseId: p.courseId,
        lessonId: parent.type === "lesson" ? parent.id : null,
        moduleId: parent.type === "module" ? parent.id : null,
        kind: "file",
        title,
        fileKey: key,
        fileName: safeFileName(fileName),
        contentType,
        sizeBytes: size,
        position,
      })
      .returning({ id: resources.id });
    return {
      data: undefined,
      audit: { action: "resource.add", targetType: "resource", targetId: r.id, summary: `Subió "${title}" a ${p.label}` },
    };
  },
});
export async function addFileResource(input: z.input<typeof addFileSchema>) {
  return addFileImpl(input);
}

// ─── Renombrar, ordenar y quitar ──────────────────────────────

const renameSchema = z.object({ id: idInput, title: resourceTitleSchema });
const renameImpl = adminAction({
  schema: renameSchema,
  run: async ({ id, title }, { tx }) => {
    const r = await tx.query.resources.findFirst({ where: eq(resources.id, id) });
    if (!r) throw new AdminError("El recurso no existe.");
    await tx.update(resources).set({ title }).where(eq(resources.id, id));
    return {
      data: undefined,
      audit: { action: "resource.rename", targetType: "resource", targetId: id, summary: `Renombró el recurso "${r.title}" a "${title}"` },
    };
  },
});
export async function renameResource(input: z.input<typeof renameSchema>) {
  return renameImpl(input);
}

const moveSchema = z.object({ id: idInput, direction: z.enum(["up", "down"]) });
const moveImpl = adminAction({
  schema: moveSchema,
  run: async ({ id, direction }, { tx }) => {
    const r = await tx.query.resources.findFirst({ where: eq(resources.id, id) });
    if (!r) throw new AdminError("El recurso no existe.");
    const parent: Parent = r.lessonId ? { type: "lesson", id: r.lessonId } : { type: "module", id: r.moduleId! };
    const list = await tx.select({ id: resources.id }).from(resources).where(parentWhere(parent)).orderBy(asc(resources.position), asc(resources.createdAt));
    const i = list.findIndex((x) => x.id === id);
    const j = swapIndex(i, list.length, direction);
    if (j !== null) {
      [list[i], list[j]] = [list[j], list[i]];
      for (const [pos, x] of list.entries()) await tx.update(resources).set({ position: pos }).where(eq(resources.id, x.id));
    }
    return {
      data: undefined,
      audit: { action: "resource.reorder", targetType: "resource", targetId: id, summary: `Cambió el orden del recurso "${r.title}"` },
    };
  },
});
export async function moveResource(input: z.input<typeof moveSchema>) {
  return moveImpl(input);
}

const deleteSchema = z.object({ id: idInput });
const deleteImpl = adminAction({
  schema: deleteSchema,
  run: async ({ id }, { tx }) => {
    const r = await tx.query.resources.findFirst({ where: eq(resources.id, id) });
    if (!r) throw new AdminError("El recurso no existe.");
    await tx.delete(resources).where(eq(resources.id, id));
    const rest = await tx
      .select({ id: resources.id })
      .from(resources)
      .where(r.lessonId ? eq(resources.lessonId, r.lessonId) : and(eq(resources.moduleId, r.moduleId!)))
      .orderBy(asc(resources.position));
    for (const [pos, x] of rest.entries()) await tx.update(resources).set({ position: pos }).where(eq(resources.id, x.id));
    return {
      data: { fileKey: r.fileKey },
      audit: { action: "resource.delete", targetType: "resource", targetId: id, summary: `Quitó el recurso "${r.title}"` },
    };
  },
});
export async function deleteResource(input: z.input<typeof deleteSchema>) {
  const res = await deleteImpl(input);
  // El archivo se borra de R2 solo cuando el cambio ya está guardado.
  if (res.ok && res.data.fileKey) {
    await deleteObject(res.data.fileKey).catch((e) => console.error("[recursos] no se pudo borrar de R2:", e));
  }
  return res.ok ? { ok: true as const, data: undefined } : res;
}
