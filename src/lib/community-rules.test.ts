import { describe, expect, it } from "vitest";
import { bodySchema, canDelete, canPostNow, canReply, cleanText, communityRole, titleSchema } from "./community-rules";

describe("cleanText", () => {
  it("normaliza saltos de línea y espacios, y quita caracteres de control", () => {
    expect(cleanText("  hola\r\n\r\n\r\n\r\nadiós \u0007 ")).toBe("hola\n\nadiós");
  });
});

describe("validación", () => {
  it("rechaza títulos y mensajes vacíos o enormes", () => {
    expect(titleSchema.safeParse("   ").success).toBe(false);
    expect(titleSchema.safeParse("x".repeat(151)).success).toBe(false);
    expect(bodySchema.safeParse("ok").success).toBe(false);
    expect(bodySchema.safeParse("x".repeat(5001)).success).toBe(false);
  });
  it("acepta textos normales y los devuelve limpios", () => {
    expect(bodySchema.parse("  ¿Cómo se usa el parámetro --no?  ")).toBe("¿Cómo se usa el parámetro --no?");
  });
});

describe("límite de publicación", () => {
  it("frena a partir de 5 por minuto o 40 por hora", () => {
    expect(canPostNow(4, 10)).toBe(true);
    expect(canPostNow(5, 10)).toBe(false);
    expect(canPostNow(0, 40)).toBe(false);
  });
});

describe("permisos", () => {
  const alumno = communityRole({ hasAccess: true, role: "student", isTeacherOfCourse: false });
  const profe = communityRole({ hasAccess: true, role: "teacher", isTeacherOfCourse: true });
  const profeDeOtro = communityRole({ hasAccess: true, role: "teacher", isTeacherOfCourse: false });
  const admin = communityRole({ hasAccess: true, role: "admin", isTeacherOfCourse: false });
  const fuera = communityRole({ hasAccess: false, role: "admin", isTeacherOfCourse: true });

  it("solo modera el admin y los profesores de ese curso", () => {
    expect([alumno.moderate, profe.moderate, profeDeOtro.moderate, admin.moderate]).toEqual([false, true, false, true]);
  });
  it("sin acceso al curso no se puede hacer nada", () => {
    expect(fuera).toEqual({ access: false, moderate: false });
    expect(canReply(fuera, false)).toBe(false);
    expect(canDelete(fuera, "u1", "u1")).toBe(false);
  });
  it("cada uno borra lo suyo; los moderadores, cualquier cosa", () => {
    expect(canDelete(alumno, "u1", "u1")).toBe(true);
    expect(canDelete(alumno, "u2", "u1")).toBe(false);
    expect(canDelete(profe, "u2", "u1")).toBe(true);
  });
  it("en un hilo cerrado solo responden los moderadores", () => {
    expect(canReply(alumno, true)).toBe(false);
    expect(canReply(profe, true)).toBe(true);
    expect(canReply(alumno, false)).toBe(true);
  });
});
