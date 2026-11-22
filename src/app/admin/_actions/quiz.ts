"use server";

import { and, eq, inArray, notInArray } from "drizzle-orm";
import { z } from "zod";
import { lessons, options, questions, quizzes } from "@/db/schema";
import { AdminError, adminAction } from "@/lib/admin/action";
import { quizSchema } from "@/lib/admin/rules";

/**
 * Guarda el quiz completo de una lección. Conserva los ids de preguntas y
 * opciones que ya existían (los intentos guardados apuntan a ellos).
 * Sin preguntas, el quiz se elimina.
 */
const saveQuizImpl = adminAction({
  schema: quizSchema,
  run: async ({ lessonId, questions: qs }, { tx }) => {
    const lesson = await tx.query.lessons.findFirst({ where: eq(lessons.id, lessonId), columns: { id: true, title: true } });
    if (!lesson) throw new AdminError("La lección no existe.");

    const existing = await tx.query.quizzes.findFirst({ where: eq(quizzes.lessonId, lessonId) });

    if (qs.length === 0) {
      if (existing) await tx.delete(quizzes).where(eq(quizzes.id, existing.id));
      return {
        data: undefined,
        audit: { action: "quiz.delete", targetType: "quiz", targetId: lessonId, summary: `Quitó el quiz de "${lesson.title}"` },
      };
    }

    const quizId =
      existing?.id ?? (await tx.insert(quizzes).values({ lessonId }).returning({ id: quizzes.id }))[0].id;

    // Solo se aceptan ids que de verdad pertenecen a este quiz.
    const ownQuestions = await tx.select({ id: questions.id, externalId: questions.externalId }).from(questions).where(eq(questions.quizId, quizId));
    const ownQ = new Map(ownQuestions.map((q) => [q.id, q.externalId]));
    const keptQ: string[] = [];

    for (const [qi, q] of qs.entries()) {
      let questionId: string;
      if (q.id && ownQ.has(q.id)) {
        questionId = q.id;
        await tx.update(questions).set({ prompt: q.prompt, explanation: q.explanation, position: qi }).where(eq(questions.id, q.id));
      } else {
        const [row] = await tx
          .insert(questions)
          .values({ quizId, externalId: `admin-${crypto.randomUUID().slice(0, 8)}`, prompt: q.prompt, explanation: q.explanation, position: qi })
          .returning({ id: questions.id });
        questionId = row.id;
      }
      keptQ.push(questionId);

      const ownOptions = await tx.select({ id: options.id }).from(options).where(eq(options.questionId, questionId));
      const ownO = new Set(ownOptions.map((o) => o.id));
      const keptO: string[] = [];
      for (const [oi, o] of q.options.entries()) {
        if (o.id && ownO.has(o.id)) {
          await tx.update(options).set({ text: o.text, isCorrect: o.isCorrect, position: oi }).where(eq(options.id, o.id));
          keptO.push(o.id);
        } else {
          const [row] = await tx.insert(options).values({ questionId, text: o.text, isCorrect: o.isCorrect, position: oi }).returning({ id: options.id });
          keptO.push(row.id);
        }
      }
      await tx.delete(options).where(and(eq(options.questionId, questionId), notInArray(options.id, keptO)));
    }

    const removed = ownQuestions.filter((q) => !keptQ.includes(q.id)).map((q) => q.id);
    if (removed.length) await tx.delete(questions).where(inArray(questions.id, removed));

    return {
      data: undefined,
      audit: {
        action: "quiz.save",
        targetType: "quiz",
        targetId: lessonId,
        summary: `Guardó el quiz de "${lesson.title}" (${qs.length} pregunta${qs.length === 1 ? "" : "s"})`,
      },
    };
  },
});
export async function saveQuiz(input: z.input<typeof quizSchema>) {
  return saveQuizImpl(input);
}
