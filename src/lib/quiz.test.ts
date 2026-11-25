import { describe, expect, it } from "vitest";
import { drawQuestions, gradeQuiz, QUIZ_DRAW, type QuizKey, validDrawnIds } from "./quiz";

const key: QuizKey = [
  { id: "q1", explanation: "e1", options: [{ id: "a", isCorrect: true }, { id: "b", isCorrect: false }] },
  { id: "q2", explanation: "e2", options: [{ id: "c", isCorrect: false }, { id: "d", isCorrect: true }] },
];

describe("gradeQuiz", () => {
  it("cuenta aciertos", () => {
    const r = gradeQuiz(key, { q1: "a", q2: "c" });
    expect(r.score).toBe(1);
    expect(r.total).toBe(2);
    expect(r.questions[1]).toMatchObject({ isCorrect: false, correctOptionId: "d", explanation: "e2" });
  });
  it("las preguntas sin responder cuentan como fallo", () => {
    expect(gradeQuiz(key, { q1: "a" }).score).toBe(1);
  });
  it("ignora opciones de otra pregunta", () => {
    const r = gradeQuiz(key, { q1: "d", q2: "a" });
    expect(r.score).toBe(0);
    expect(r.questions[0].chosenOptionId).toBeNull();
  });
});

describe("banco de preguntas", () => {
  const pool = Array.from({ length: 12 }, (_, i) => ({ id: `q${i + 1}` }));
  // Generador determinista para los tests.
  const seeded = (seed: number) => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

  it("saca 5 preguntas distintas del banco", () => {
    const d = drawQuestions(pool, new Set(), seeded(1));
    expect(d).toHaveLength(QUIZ_DRAW);
    expect(new Set(d.map((q) => q.id)).size).toBe(QUIZ_DRAW);
  });

  it("no repite las del intento anterior mientras haya preguntas nuevas", () => {
    const first = drawQuestions(pool, new Set(), seeded(2));
    const second = drawQuestions(pool, new Set(first.map((q) => q.id)), seeded(3));
    expect(second.some((q) => first.includes(q))).toBe(false);
  });

  it("si el banco es pequeño, completa con las ya vistas", () => {
    const small = pool.slice(0, 7);
    const d = drawQuestions(small, new Set(["q1", "q2", "q3", "q4"]), seeded(4));
    expect(d).toHaveLength(5);
    expect(d.slice(0, 3).map((q) => q.id).sort()).toEqual(["q5", "q6", "q7"]);
  });

  it("con menos de 5 preguntas, salen todas", () => {
    expect(drawQuestions(pool.slice(0, 3), new Set())).toHaveLength(3);
  });

  it("el orden cambia entre intentos", () => {
    const orders = new Set(Array.from({ length: 10 }, (_, i) => drawQuestions(pool, new Set(), seeded(i + 10)).map((q) => q.id).join()));
    expect(orders.size).toBeGreaterThan(1);
  });

  it("solo acepta exactamente las preguntas que tocan, del propio quiz y sin repetir", () => {
    const ids = pool.map((q) => q.id);
    expect(validDrawnIds(["q1", "q2", "q3", "q4", "q5"], ids)).toBe(true);
    expect(validDrawnIds(["q1", "q2"], ids)).toBe(false); // no se pueden elegir menos
    expect(validDrawnIds(["q1", "q1", "q2", "q3", "q4"], ids)).toBe(false);
    expect(validDrawnIds(["q1", "q2", "q3", "q4", "otra"], ids)).toBe(false);
    expect(validDrawnIds(["q1", "q2", "q3"], ["q1", "q2", "q3"])).toBe(true);
  });
});
