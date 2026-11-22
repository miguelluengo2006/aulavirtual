import { describe, expect, it } from "vitest";
import { authErrorMessage, linkErrorMessage } from "./auth-errors";
import { safeNext } from "./safe-next";

describe("safeNext", () => {
  it("acepta rutas internas", () => {
    expect(safeNext("/cursos/nextjs")).toBe("/cursos/nextjs");
    expect(safeNext("/cursos/a?x=1#y")).toBe("/cursos/a?x=1#y");
  });
  it("usa /mis-cursos por defecto", () => {
    expect(safeNext(null)).toBe("/mis-cursos");
    expect(safeNext("")).toBe("/mis-cursos");
  });
  it("rechaza otros dominios", () => {
    expect(safeNext("https://malo.com")).toBe("/mis-cursos");
    expect(safeNext("//malo.com")).toBe("/mis-cursos");
    expect(safeNext("/\\malo.com")).toBe("/mis-cursos");
    expect(safeNext("javascript:alert(1)")).toBe("/mis-cursos");
  });
  it("rechaza caracteres de control", () => {
    expect(safeNext("/\tmalo")).toBe("/mis-cursos");
  });
  it("no vuelve a las páginas de acceso", () => {
    expect(safeNext("/entrar")).toBe("/mis-cursos");
    expect(safeNext("/registro?next=/x")).toBe("/mis-cursos");
    expect(safeNext("/entrada-libre")).toBe("/entrada-libre");
  });
});

describe("authErrorMessage", () => {
  it("traduce los errores conocidos", () => {
    expect(authErrorMessage({ code: "INVALID_EMAIL_OR_PASSWORD", status: 401 })).toBe(
      "El email o la contraseña no son correctos.",
    );
    expect(authErrorMessage({ code: "PASSWORD_TOO_SHORT", status: 400 })).toContain("8 caracteres");
  });
  it("demasiados intentos", () => {
    expect(authErrorMessage({ status: 429 })).toContain("Espera un minuto");
  });
  it("sin conexión", () => {
    expect(authErrorMessage({ message: "Failed to fetch" })).toContain("conexión");
  });
  it("error desconocido", () => {
    expect(authErrorMessage({ code: "RARO", status: 500 })).toContain("Inténtalo de nuevo");
  });
});

describe("linkErrorMessage", () => {
  it("distingue enlace caducado de enlace inválido", () => {
    expect(linkErrorMessage("token_expired")).toContain("caducado");
    expect(linkErrorMessage("invalid_token")).toContain("no es válido");
    expect(linkErrorMessage(null)).toBeNull();
  });
});
