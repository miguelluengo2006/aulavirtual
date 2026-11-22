"use server";

import { and, asc, count, eq, ne } from "drizzle-orm";
import { z } from "zod";
import { courses, enrollments, lessons, modules } from "@/db/schema";
import { AdminError, adminAction, idInput } from "@/lib/admin/action";
import { courseFieldsSchema, deleteCourseIssue, publishIssues } from "@/lib/admin/rules";
import { formatPrice } from "@/lib/format";

const createImpl = adminAction({
  schema: courseFieldsSchema,
  run: async (input, { tx }) => {
    const taken = await tx.query.courses.findFirst({ where: eq(courses.slug, input.slug), columns: { id: true } });
    if (taken) throw new AdminError("Ya hay un curso con esa dirección. Elige otra.");
    const [c] = await tx.insert(courses).values({ ...input, status: "draft" }).returning({ id: courses.id });
    // Todo curso nuevo empieza con un módulo para poder añadir lecciones.
    await tx.insert(modules).values({ courseId: c.id, externalId: "modulo-1", title: "Módulo 1", position: 0 });
    return {
      data: { id: c.id },
      audit: { action: "course.create", targetType: "course", targetId: c.id, summary: `Creó el curso "${input.title}"` },
    };
  },
});
export async function createCourse(input: z.input<typeof courseFieldsSchema>) {
  return createImpl(input);
}

const updateSchema = courseFieldsSchema.extend({ id: idInput });
const updateImpl = adminAction({
  schema: updateSchema,
  run: async ({ id, ...input }, { tx }) => {
    const current = await tx.query.courses.findFirst({ where: eq(courses.id, id) });
    if (!current) throw new AdminError("El curso no existe.");
    const taken = await tx.query.courses.findFirst({
      where: and(eq(courses.slug, input.slug), ne(courses.id, id)),
      columns: { id: true },
    });
    if (taken) throw new AdminError("Ya hay otro curso con esa dirección. Elige otra.");
    if (current.status === "published" && input.priceCents === null) {
      throw new AdminError("Un curso publicado necesita precio.");
    }
    await tx.update(courses).set(input).where(eq(courses.id, id));

    const changes: string[] = [];
    if (current.title !== input.title) changes.push("título");
    if (current.slug !== input.slug) changes.push("dirección");
    if (current.description !== input.description) changes.push("descripción");
    if (current.priceCents !== input.priceCents)
      changes.push(`precio (${formatPrice(current.priceCents, current.currency)} → ${formatPrice(input.priceCents, input.currency)})`);
    if (current.includedInSubscription !== input.includedInSubscription) changes.push("suscripción");
    return {
      data: undefined,
      audit: {
        action: "course.update",
        targetType: "course",
        targetId: id,
        summary: `Editó "${input.title}"${changes.length ? `: ${changes.join(", ")}` : ""}`,
        details: { before: { title: current.title, slug: current.slug, priceCents: current.priceCents } },
      },
    };
  },
});
export async function updateCourse(input: z.input<typeof updateSchema>) {
  return updateImpl(input);
}

const statusSchema = z.object({ id: idInput, status: z.enum(["draft", "published", "archived"]) });
const statusImpl = adminAction({
  schema: statusSchema,
  run: async ({ id, status }, { tx }) => {
    const course = await tx.query.courses.findFirst({ where: eq(courses.id, id) });
    if (!course) throw new AdminError("El curso no existe.");
    if (course.status === status) throw new AdminError("El curso ya está en ese estado.");
    if (status === "published") {
      const ls = await tx
        .select({ title: lessons.title, videoKey: lessons.videoKey, durationSeconds: lessons.durationSeconds })
        .from(lessons)
        .where(eq(lessons.courseId, id))
        .orderBy(asc(lessons.position));
      const issues = publishIssues({ priceCents: course.priceCents, lessons: ls });
      if (issues.length) throw new AdminError(`No se puede publicar todavía. ${issues.join(" ")}`);
    }
    await tx.update(courses).set({ status }).where(eq(courses.id, id));
    const verb = { draft: "Pasó a borrador", published: "Publicó", archived: "Archivó" }[status];
    return {
      data: undefined,
      audit: { action: `course.${status}`, targetType: "course", targetId: id, summary: `${verb} "${course.title}"` },
    };
  },
});
export async function setCourseStatus(input: z.input<typeof statusSchema>) {
  return statusImpl(input);
}

const deleteSchema = z.object({ id: idInput, confirmSlug: z.string() });
const deleteImpl = adminAction({
  schema: deleteSchema,
  sensitive: true,
  run: async ({ id, confirmSlug }, { tx }) => {
    const course = await tx.query.courses.findFirst({ where: eq(courses.id, id) });
    if (!course) throw new AdminError("El curso no existe.");
    if (confirmSlug.trim() !== course.slug) {
      throw new AdminError(`Para confirmar, escribe exactamente "${course.slug}".`);
    }
    const [{ n }] = await tx
      .select({ n: count() })
      .from(enrollments)
      .where(and(eq(enrollments.courseId, id), eq(enrollments.source, "purchase")));
    const issue = deleteCourseIssue({ status: course.status, purchases: n });
    if (issue) throw new AdminError(issue);
    await tx.delete(courses).where(eq(courses.id, id));
    return {
      data: undefined,
      audit: {
        action: "course.delete",
        targetType: "course",
        targetId: id,
        summary: `Eliminó el curso "${course.title}"`,
        details: { slug: course.slug },
      },
    };
  },
});
export async function deleteCourse(input: z.input<typeof deleteSchema>) {
  return deleteImpl(input);
}
