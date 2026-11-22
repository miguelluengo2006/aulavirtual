"use server";

import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { lessons, options, questions, quizAttempts, quizzes } from "@/db/schema";
import { canAccessCourse } from "@/lib/access";
import { gradeQuiz, type QuizResult } from "@/lib/quiz";
import { getCurrentUser } from "@/lib/session";

const input = z.object({
  quizId: z.string().min(1).max(64),
  answers: z.record(z.string().max(64), z.string().max(64)),
});

export async function submitQuiz(
  raw: z.infer<typeof input>,
): Promise<{ ok: true; result: QuizResult } | { ok: false; error: string }> {
  const parsed = input.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Respuestas inválidas" };
  const { quizId, answers } = parsed.data;

  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Tu sesión ha caducado. Vuelve a entrar." };

  const quiz = await db
    .select({ id: quizzes.id, courseId: lessons.courseId })
    .from(quizzes)
    .innerJoin(lessons, eq(lessons.id, quizzes.lessonId))
    .where(eq(quizzes.id, quizId))
    .limit(1);
  if (!quiz[0] || !(await canAccessCourse(user.id, quiz[0].courseId))) {
    return { ok: false, error: "No tienes acceso a este quiz" };
  }

  // Las respuestas correctas solo se leen aquí, en el servidor.
  const key = await db.query.questions.findMany({
    where: eq(questions.quizId, quizId),
    orderBy: asc(questions.position),
    columns: { id: true, explanation: true },
    with: { options: { columns: { id: true, isCorrect: true }, orderBy: asc(options.position) } },
  });
  if (key.length === 0) return { ok: false, error: "Este quiz no tiene preguntas" };

  const result = gradeQuiz(key, answers);
  await db.insert(quizAttempts).values({
    userId: user.id,
    quizId,
    score: result.score,
    total: result.total,
    answers: Object.fromEntries(
      result.questions.filter((q) => q.chosenOptionId).map((q) => [q.questionId, q.chosenOptionId!]),
    ),
  });
  return { ok: true, result };
}
