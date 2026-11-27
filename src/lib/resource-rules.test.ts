import { describe, expect, it } from "vitest";
import {
  formatBytes,
  isAllowedResourceFile,
  isResourceKeyOf,
  resourceKey,
  resourceLabel,
  resourceUrlSchema,
  safeFileName,
} from "./resource-rules";

describe("safeFileName", () => {
  it("quita rutas, tildes y caracteres raros", () => {
    expect(safeFileName("../../etc/Guía de práctica (v2).PDF")).toBe("Guia-de-practica-v2.pdf");
    expect(safeFileName("C:\\Users\\x\\modelo final.rvt")).toBe("modelo-final.rvt");
  });
  it("da un nombre aunque no quede nada", () => {
    expect(safeFileName("???.pdf")).toBe("archivo.pdf");
    expect(safeFileName("")).toBe("archivo");
  });
});

describe("tipos de archivo", () => {
  it("acepta documentos y modelos y rechaza ejecutables", () => {
    expect(isAllowedResourceFile("apuntes.pdf")).toBe(true);
    expect(isAllowedResourceFile("modelo.IFC")).toBe(true);
    expect(isAllowedResourceFile("virus.exe")).toBe(false);
    expect(isAllowedResourceFile("pagina.html")).toBe(false);
    expect(isAllowedResourceFile("sin-extension")).toBe(false);
  });
});

describe("claves en R2", () => {
  const uuid = "123e4567-e89b-42d3-a456-426614174000";
  it("genera claves dentro de la carpeta del curso", () => {
    const k = resourceKey("curso1", uuid, "Plano 1.dwg");
    expect(k).toBe(`recursos/curso1/${uuid}/Plano-1.dwg`);
    expect(isResourceKeyOf("curso1", k)).toBe(true);
  });
  it("rechaza claves de otro curso o con rutas raras", () => {
    expect(isResourceKeyOf("curso2", resourceKey("curso1", uuid, "a.pdf"))).toBe(false);
    expect(isResourceKeyOf("curso1", `recursos/curso1/${uuid}/../x.pdf`)).toBe(false);
    expect(isResourceKeyOf("curso1", `cursos/curso1/video/index.m3u8`)).toBe(false);
    expect(isResourceKeyOf("curso1", `recursos/curso1/otro/a.pdf`)).toBe(false);
  });
});

describe("enlaces", () => {
  it("solo http(s)", () => {
    expect(resourceUrlSchema.safeParse("https://idesie.com/guia").success).toBe(true);
    expect(resourceUrlSchema.safeParse("javascript:alert(1)").success).toBe(false);
    expect(resourceUrlSchema.safeParse("idesie.com").success).toBe(false);
  });
});

describe("presentación", () => {
  it("formatBytes", () => {
    expect(formatBytes(500)).toBe("1 KB");
    expect(formatBytes(2.5 * 1024 * 1024)).toBe("2,5 MB");
    expect(formatBytes(null)).toBe("");
  });
  it("resourceLabel", () => {
    expect(resourceLabel({ kind: "file", fileName: "a.pdf" })).toBe("PDF");
    expect(resourceLabel({ kind: "link", url: "https://www.autodesk.com/x" })).toBe("autodesk.com");
  });
});
