import { describe, expect, it } from "vitest";
import { gradeQuiz, type QuizKey } from "./quiz";

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
