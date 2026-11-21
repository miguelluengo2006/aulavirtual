import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { lessonProgress, lessons, watchEvents } from "@/db/schema";
import { lessonForRequest } from "@/lib/lesson-access";
import { checkBeat, isCompleted, mergeRange, watchedSeconds, type Range } from "@/lib/progress";

const beatSchema = z.object({
  lessonId: z.string().min(1).max(64),
  sessionId: z.string().min(8).max(64),
  from: z.number(),
  to: z.number(),
  // Duración que ve el reproductor; solo se usa si la lección aún no la tiene.
  duration: z.number().positive().max(6 * 3600).optional(),
});

// Latido del reproductor: cada 10 s mientras reproduce, y al pausar o salir.
export async function POST(request: Request) {
  let body: z.infer<typeof beatSchema>;
  try {
    body = beatSchema.parse(await request.json());
  } catch {
    return Response.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const r = await lessonForRequest(body.lessonId);
  if ("error" in r) return r.error;
  const { user, lesson } = r;

  let duration = lesson.durationSeconds;
  if (!duration && body.duration) {
    duration = Math.round(body.duration);
    await db
      .update(lessons)
      .set({ durationSeconds: duration })
      .where(and(eq(lessons.id, lesson.id), isNull(lessons.durationSeconds)));
  }

  const result = await db.transaction(async (tx) => {
    const [recent] = await tx
      .select({ s: sql<number>`coalesce(sum(${watchEvents.toSecond} - ${watchEvents.fromSecond}), 0)::int` })
      .from(watchEvents)
      .where(
        and(
          eq(watchEvents.userId, user.id),
          eq(watchEvents.sessionId, body.sessionId),
          gt(watchEvents.createdAt, sql`now() - interval '60 seconds'`),
        ),
      );

    const check = checkBeat(body.from, body.to, duration, recent.s);
    if (!check.ok) return { error: check.reason };
    const range = check.range;

    await tx.insert(watchEvents).values({
      userId: user.id,
      lessonId: lesson.id,
      sessionId: body.sessionId,
      fromSecond: range[0],
      toSecond: range[1],
    });

    // Crea la fila si no existe y la bloquea, para que dos latidos simultáneos no se pisen.
    await tx
      .insert(lessonProgress)
      .values({ userId: user.id, lessonId: lesson.id })
      .onConflictDoNothing();
    const [current] = await tx
      .select()
      .from(lessonProgress)
      .where(and(eq(lessonProgress.userId, user.id), eq(lessonProgress.lessonId, lesson.id)))
      .for("update");

    const ranges = mergeRange((current.watchedRanges) as Range[], range);
    const watched = watchedSeconds(ranges, duration);
    const values = {
      watchedRanges: ranges,
      watchedSeconds: watched,
      timeSpentSeconds: current.timeSpentSeconds + (range[1] - range[0]),
      maxPositionSeconds: Math.max(current.maxPositionSeconds, range[1]),
      completedAt: current.completedAt ?? (isCompleted(watched, duration) ? new Date() : null),
      lastSeenAt: new Date(),
    };

    await tx
      .update(lessonProgress)
      .set(values)
      .where(and(eq(lessonProgress.userId, user.id), eq(lessonProgress.lessonId, lesson.id)));

    return {
      watchedSeconds: watched,
      percent: duration ? Math.min(100, Math.round((watched / duration) * 100)) : null,
      completed: Boolean(values.completedAt),
    };
  });

  if ("error" in result) return Response.json(result, { status: 422 });
  return Response.json(result);
}
