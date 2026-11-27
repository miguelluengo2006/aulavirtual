import "server-only";
import { asc, eq, or } from "drizzle-orm";
import { db } from "@/db";
import { resources } from "@/db/schema";

const columns = {
  id: resources.id,
  lessonId: resources.lessonId,
  moduleId: resources.moduleId,
  kind: resources.kind,
  title: resources.title,
  url: resources.url,
  fileName: resources.fileName,
  sizeBytes: resources.sizeBytes,
};

export type ResourceItem = {
  id: string;
  lessonId: string | null;
  moduleId: string | null;
  kind: "link" | "file";
  title: string;
  url: string | null;
  fileName: string | null;
  sizeBytes: number | null;
};

/**
 * Recursos de una lección y de su módulo. Quien llama debe haber comprobado
 * antes el acceso al curso (sin caché: depende de eso).
 */
export async function resourcesForLesson(lessonId: string, moduleId: string | null) {
  const rows: ResourceItem[] = await db
    .select(columns)
    .from(resources)
    .where(or(eq(resources.lessonId, lessonId), moduleId ? eq(resources.moduleId, moduleId) : undefined))
    .orderBy(asc(resources.position), asc(resources.createdAt));
  return {
    lesson: rows.filter((r) => r.lessonId === lessonId),
    module: rows.filter((r) => r.moduleId && r.moduleId === moduleId),
  };
}

/** Cuántos recursos tiene cada lección y cada módulo de un curso (índice lateral). */
export async function resourceCounts(courseId: string) {
  const rows = await db
    .select({ lessonId: resources.lessonId, moduleId: resources.moduleId })
    .from(resources)
    .where(eq(resources.courseId, courseId));
  const lesson = new Map<string, number>();
  const mod = new Map<string, number>();
  for (const r of rows) {
    if (r.lessonId) lesson.set(r.lessonId, (lesson.get(r.lessonId) ?? 0) + 1);
    if (r.moduleId) mod.set(r.moduleId, (mod.get(r.moduleId) ?? 0) + 1);
  }
  return { lesson, module: mod };
}

/** Todos los recursos de un curso (panel de admin; la página ya comprueba el rol). */
export async function resourcesForCourseEdit(courseId: string) {
  return db
    .select({ ...columns, position: resources.position })
    .from(resources)
    .where(eq(resources.courseId, courseId))
    .orderBy(asc(resources.position), asc(resources.createdAt));
}

export async function resourceById(id: string) {
  const [r] = await db
    .select({
      id: resources.id,
      courseId: resources.courseId,
      kind: resources.kind,
      url: resources.url,
      fileKey: resources.fileKey,
      fileName: resources.fileName,
      contentType: resources.contentType,
    })
    .from(resources)
    .where(eq(resources.id, id))
    .limit(1);
  return r ?? null;
}

