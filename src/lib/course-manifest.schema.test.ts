import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { courseManifestSchema, manifestWarnings } from "./course-manifest.schema";

const example = JSON.parse(
  readFileSync(new URL("../../content/courses/nextjs-desde-cero/course.json", import.meta.url), "utf8"),
);
const clone = () => structuredClone(example);

describe("courseManifestSchema", () => {
  it("acepta el curso de ejemplo", () => {
    expect(courseManifestSchema.safeParse(example).success).toBe(true);
  });

  it("rechaza una pregunta con dos respuestas correctas", () => {
    const m = clone();
    m.modules[0].lessons[0].quiz.questions[0].options[1].isCorrect = true;
    expect(courseManifestSchema.safeParse(m).success).toBe(false);
  });

  it("rechaza una pregunta sin respuesta correcta", () => {
    const m = clone();
    m.modules[0].lessons[0].quiz.questions[0].options[0].isCorrect = false;
    expect(courseManifestSchema.safeParse(m).success).toBe(false);
  });

  it("rechaza ids de lección duplicados", () => {
    const m = clone();
    m.modules[0].lessons.push(structuredClone(m.modules[0].lessons[0]));
    expect(courseManifestSchema.safeParse(m).success).toBe(false);
  });

  it("rechaza ids con mayúsculas o espacios", () => {
    const m = clone();
    m.slug = "Next JS";
    expect(courseManifestSchema.safeParse(m).success).toBe(false);
  });

  it("avisa del precio y el vídeo pendientes", () => {
    const m = clone();
    m.pricing.priceCents = null;
    m.modules[0].lessons[0].video.key = "TODO";
    const parsed = courseManifestSchema.parse(m);
    const w = manifestWarnings(parsed);
    expect(w).toContain("Falta el precio del curso.");
    expect(w.some((x) => x.includes("falta el vídeo"))).toBe(true);
  });
});
