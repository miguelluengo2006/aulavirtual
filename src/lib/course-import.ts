// Importa un manifiesto validado a la base de datos.
// Sin "server-only": lo usa el script `npm run course:import`.
import { and, eq, inArray, notInArray } from "drizzle-orm";
import type { Db } from "@/db";
import {
  courses,
  courseTeachers,
  lessons,
  modules,
  options,
  questions,
  quizzes,
  user,
} from "@/db/schema";
import type { CourseManifest } from "./course-manifest.schema";

export type ImportOptions = {
  /** Permite actualizar un curso ya publicado (por defecto se rechaza). */
  allowPublished?: boolean;
  /** Borra lecciones y módulos que ya no están en el manifiesto (y su progreso). */
  prune?: boolean;
};

export type ImportResult = {
  courseId: string;
  created: boolean;
  status: "draft" | "published" | "archived";
  modules: number;
  lessons: number;
  questions: number;
  teachersAdded: string[];
  teachersNotFound: string[];
  /** Lecciones que están en la base de datos pero no en el manifiesto. */
  orphanLessons: string[];
  pruned: boolean;
};

export class ImportError extends Error {}

export async function importCourse(
  db: Db,
  m: CourseManifest,
  opts: ImportOptions = {},
): Promise<ImportResult> {
  return db.transaction(async (tx) => {
    const existing = await tx.query.courses.findFirst({
      where: eq(courses.slug, m.slug),
    });

    if (existing && existing.status !== "draft" && !opts.allowPublished) {
      throw new ImportError(
        `El curso "${m.slug}" está ${existing.status === "published" ? "publicado" : "archivado"}. ` +
          `Vuelve a ejecutar con --allow-published si quieres actualizarlo igualmente.`,
      );
    }

    const courseValues = {
      title: m.title,
      description: m.description,
      coverImage: m.coverImage ?? null,
      priceCents: m.pricing.priceCents,
      currency: m.pricing.currency,
      includedInSubscription: m.pricing.includedInSubscription,
      importNotes: m.notes,
      highlights: m.highlights ?? [],
      audience: m.audience ?? null,
      instructors: m.instructors ?? [],
    };

    // La importación nunca cambia el estado: un curso nuevo nace como borrador.
    const [course] = existing
      ? await tx.update(courses).set(courseValues).where(eq(courses.id, existing.id)).returning()
      : await tx.insert(courses).values({ ...courseValues, slug: m.slug, status: "draft" }).returning();

    // Profesores: solo se añaden (no se quitan los asignados desde el panel).
    const teachersAdded: string[] = [];
    const teachersNotFound: string[] = [];
    if (m.teachers.length) {
      const found = await tx
        .select({ id: user.id, email: user.email })
        .from(user)
        .where(inArray(user.email, m.teachers.map((e) => e.toLowerCase())));
      const byEmail = new Map(found.map((u) => [u.email.toLowerCase(), u.id]));
      for (const email of m.teachers) {
        const id = byEmail.get(email.toLowerCase());
        if (!id) {
          teachersNotFound.push(email);
          continue;
        }
        const inserted = await tx
          .insert(courseTeachers)
          .values({ courseId: course.id, userId: id })
          .onConflictDoNothing()
          .returning();
        if (inserted.length) teachersAdded.push(email);
        // Asegura que pueda entrar al panel de profesor (sin degradar a un admin).
        await tx
          .update(user)
          .set({ role: "teacher" })
          .where(and(eq(user.id, id), eq(user.role, "student")));
      }
    }

    let lessonCount = 0;
    let questionCount = 0;
    const keptModuleIds: string[] = [];
    const keptLessonIds: string[] = [];

    for (const [mi, mod] of m.modules.entries()) {
      const [dbModule] = await tx
        .insert(modules)
        .values({ courseId: course.id, externalId: mod.id, title: mod.title, position: mi })
        .onConflictDoUpdate({
          target: [modules.courseId, modules.externalId],
          set: { title: mod.title, position: mi },
        })
        .returning();
      keptModuleIds.push(dbModule.id);

      for (const [li, les] of mod.lessons.entries()) {
        const lessonValues = {
          moduleId: dbModule.id,
          title: les.title,
          description: les.description ?? null,
          position: li,
          videoProvider: les.video.provider,
          videoKey: les.video.key,
          durationSeconds: les.video.durationSeconds ?? null,
          sourceFile: les.sourceFile ?? null,
          keyPoints: les.keyPoints ?? [],
        };
        const [dbLesson] = await tx
          .insert(lessons)
          .values({ ...lessonValues, courseId: course.id, externalId: les.id })
          .onConflictDoUpdate({
            target: [lessons.courseId, lessons.externalId],
            set: lessonValues,
          })
          .returning();
        keptLessonIds.push(dbLesson.id);
        lessonCount++;

        // Sin quiz en el manifiesto: se respeta el que exista (p. ej. creado en el panel).
        if (!les.quiz) continue;

        const [quiz] = await tx
          .insert(quizzes)
          .values({ lessonId: dbLesson.id })
          .onConflictDoUpdate({ target: quizzes.lessonId, set: { lessonId: dbLesson.id } })
          .returning();

        const keptQuestionIds: string[] = [];
        for (const [qi, q] of les.quiz.questions.entries()) {
          const [dbQuestion] = await tx
            .insert(questions)
            .values({
              quizId: quiz.id,
              externalId: q.id,
              prompt: q.prompt,
              explanation: q.explanation,
              position: qi,
            })
            .onConflictDoUpdate({
              target: [questions.quizId, questions.externalId],
              set: { prompt: q.prompt, explanation: q.explanation, position: qi },
            })
            .returning();
          keptQuestionIds.push(dbQuestion.id);
          questionCount++;

          // Opciones emparejadas por posición, para conservar sus ids
          // (los intentos guardados apuntan a ellos).
          const current = await tx
            .select()
            .from(options)
            .where(eq(options.questionId, dbQuestion.id))
            .orderBy(options.position);
          for (const [oi, o] of q.options.entries()) {
            const prev = current[oi];
            if (prev) {
              await tx
                .update(options)
                .set({ text: o.text, isCorrect: o.isCorrect, position: oi })
                .where(eq(options.id, prev.id));
            } else {
              await tx.insert(options).values({
                questionId: dbQuestion.id,
                text: o.text,
                isCorrect: o.isCorrect,
                position: oi,
              });
            }
          }
          const surplus = current.slice(q.options.length).map((o) => o.id);
          if (surplus.length) await tx.delete(options).where(inArray(options.id, surplus));
        }

        // Las preguntas del quiz las define el manifiesto.
        await tx
          .delete(questions)
          .where(and(eq(questions.quizId, quiz.id), notInArray(questions.id, keptQuestionIds)));
      }
    }

    const orphans = await tx
      .select({ id: lessons.id, externalId: lessons.externalId })
      .from(lessons)
      .where(and(eq(lessons.courseId, course.id), notInArray(lessons.id, keptLessonIds)));

    if (opts.prune) {
      if (orphans.length) {
        await tx.delete(lessons).where(inArray(lessons.id, orphans.map((o) => o.id)));
      }
      await tx
        .delete(modules)
        .where(and(eq(modules.courseId, course.id), notInArray(modules.id, keptModuleIds)));
    }

    return {
      courseId: course.id,
      created: !existing,
      status: course.status,
      modules: m.modules.length,
      lessons: lessonCount,
      questions: questionCount,
      teachersAdded,
      teachersNotFound,
      orphanLessons: orphans.map((o) => o.externalId),
      pruned: Boolean(opts.prune),
    };
  });
}
