import { describe, expect, it } from "vitest";
import {
  deleteCourseIssue,
  isSessionFresh,
  parsePrice,
  publishIssues,
  questionSchema,
  roleChangeIssue,
  slugify,
  swapIndex,
  videoKeySchema,
} from "./rules";

describe("slugify", () => {
  it("quita acentos y espacios", () => {
    expect(slugify("  Introducción a Next.js ¡Ya!  ")).toBe("introduccion-a-next-js-ya");
  });
});

describe("videoKeySchema", () => {
  it("acepta rutas de R2 y TODO", () => {
    expect(videoKeySchema.safeParse("cursos/a/intro/index.m3u8").success).toBe(true);
    expect(videoKeySchema.safeParse("TODO").success).toBe(true);
  });
  it("rechaza rutas peligrosas o que no son playlists", () => {
    expect(videoKeySchema.safeParse("cursos/../secreto/index.m3u8").success).toBe(false);
    expect(videoKeySchema.safeParse("/abs/index.m3u8").success).toBe(false);
    expect(videoKeySchema.safeParse("https://otro.com/v.m3u8").success).toBe(false);
    expect(videoKeySchema.safeParse("cursos/a/video.mp4").success).toBe(false);
  });
});

describe("questionSchema", () => {
  const q = {
    prompt: "¿Pregunta de prueba?",
    explanation: "Porque sí.",
    options: [
      { text: "A", isCorrect: true },
      { text: "B", isCorrect: false },
    ],
  };
  it("acepta una pregunta válida", () => {
    expect(questionSchema.safeParse(q).success).toBe(true);
  });
  it("exige exactamente una correcta", () => {
    expect(questionSchema.safeParse({ ...q, options: [{ text: "A", isCorrect: true }, { text: "B", isCorrect: true }] }).success).toBe(false);
    expect(questionSchema.safeParse({ ...q, options: [{ text: "A", isCorrect: false }, { text: "B", isCorrect: false }] }).success).toBe(false);
  });
});

describe("publishIssues", () => {
  const ok = { priceCents: 4900, lessons: [{ title: "L1", videoKey: "c/a/index.m3u8", durationSeconds: 60 }] };
  it("un curso completo se puede publicar", () => {
    expect(publishIssues(ok)).toEqual([]);
  });
  it("detecta precio, lecciones y vídeos pendientes", () => {
    expect(publishIssues({ ...ok, priceCents: null })).toContain("Falta el precio del curso.");
    expect(publishIssues({ ...ok, lessons: [] })).toContain("El curso no tiene lecciones.");
    expect(publishIssues({ ...ok, lessons: [{ title: "L1", videoKey: "TODO", durationSeconds: null }] })[0]).toContain('"L1"');
  });
  it("un curso gratis (0 €) se puede publicar", () => {
    expect(publishIssues({ ...ok, priceCents: 0 })).toEqual([]);
  });
});

describe("deleteCourseIssue", () => {
  it("no se borra un curso publicado ni uno comprado", () => {
    expect(deleteCourseIssue({ status: "published", purchases: 0 })).not.toBeNull();
    expect(deleteCourseIssue({ status: "draft", purchases: 2 })).toContain("2 alumnos");
    expect(deleteCourseIssue({ status: "archived", purchases: 0 })).toBeNull();
  });
});

describe("roleChangeIssue", () => {
  const base = { actorId: "a", targetId: "b", currentRole: "student" as const, newRole: "teacher" as const, adminCount: 1 };
  it("permite cambios normales", () => {
    expect(roleChangeIssue(base)).toBeNull();
  });
  it("no te puedes cambiar a ti mismo", () => {
    expect(roleChangeIssue({ ...base, targetId: "a" })).toContain("tu propio rol");
  });
  it("no se puede quitar el último admin", () => {
    expect(roleChangeIssue({ ...base, currentRole: "admin", newRole: "student", adminCount: 1 })).toContain("al menos un administrador");
    expect(roleChangeIssue({ ...base, currentRole: "admin", newRole: "student", adminCount: 2 })).toBeNull();
  });
});

describe("isSessionFresh", () => {
  const now = new Date("2026-01-01T12:00:00Z");
  it("12 horas como máximo", () => {
    expect(isSessionFresh(new Date("2026-01-01T01:00:00Z"), now)).toBe(true);
    expect(isSessionFresh(new Date("2025-12-31T23:00:00Z"), now)).toBe(false);
  });
});

describe("swapIndex", () => {
  it("no se sale de los límites", () => {
    expect(swapIndex(0, 3, "up")).toBeNull();
    expect(swapIndex(2, 3, "down")).toBeNull();
    expect(swapIndex(1, 3, "up")).toBe(0);
  });
});

describe("parsePrice", () => {
  it("entiende el formato español", () => {
    expect(parsePrice("49,90")).toBe(4990);
    expect(parsePrice("49.9 €")).toBe(4990);
    expect(parsePrice("49")).toBe(4900);
    expect(parsePrice("")).toBeNull();
    expect(parsePrice("49,999")).toBe("invalid");
    expect(parsePrice("-5")).toBe("invalid");
  });
});
