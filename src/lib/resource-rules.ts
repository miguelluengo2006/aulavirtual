// Recursos de lecciones y módulos: enlaces o archivos. Funciones puras, con tests.
import { z } from "zod";

/** Tamaño máximo de un archivo subido como recurso. */
export const MAX_RESOURCE_BYTES = 200 * 1024 * 1024;

/** Extensiones admitidas (documentos, hojas, presentaciones, imágenes, comprimidos y modelos BIM/CAD). */
export const RESOURCE_EXTENSIONS = [
  "pdf", "doc", "docx", "xls", "xlsx", "csv", "ppt", "pptx", "txt",
  "png", "jpg", "jpeg", "webp",
  "zip", "rar", "7z",
  "dwg", "dxf", "ifc", "rvt", "rfa", "rte", "nwd", "nwc", "skp", "3dm",
] as const;

export const resourceTitleSchema = z
  .string()
  .trim()
  .min(2, "El título es demasiado corto")
  .max(150, "El título es demasiado largo (máximo 150 caracteres)");

/** Solo enlaces https (o http) completos. */
export const resourceUrlSchema = z
  .string()
  .trim()
  .max(2000, "El enlace es demasiado largo")
  .refine((s) => {
    try {
      const u = new URL(s);
      return u.protocol === "https:" || u.protocol === "http:";
    } catch {
      return false;
    }
  }, "Escribe un enlace completo, que empiece por https://");

export function fileExtension(name: string): string {
  const m = /\.([a-z0-9]{1,8})$/i.exec(name.trim());
  return m ? m[1].toLowerCase() : "";
}

export function isAllowedResourceFile(name: string): boolean {
  return (RESOURCE_EXTENSIONS as readonly string[]).includes(fileExtension(name));
}

/**
 * Nombre de archivo seguro para guardarlo y descargarlo: sin rutas, sin caracteres
 * raros, sin tildes, como mucho 100 caracteres y con su extensión.
 */
export function safeFileName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "";
  const ext = fileExtension(base);
  const stem = (ext ? base.slice(0, -(ext.length + 1)) : base)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "")
    .slice(0, 90);
  return `${stem || "archivo"}${ext ? `.${ext}` : ""}`;
}

/** Carpeta del curso en R2 donde van sus recursos. */
export function resourcePrefix(courseId: string) {
  return `recursos/${courseId}/`;
}

/** Clave en R2 de un archivo nuevo: recursos/<curso>/<uuid>/<nombre>. */
export function resourceKey(courseId: string, uuid: string, fileName: string) {
  return `${resourcePrefix(courseId)}${uuid}/${safeFileName(fileName)}`;
}

/** ¿La clave pertenece a ese curso y tiene la forma esperada? (no se aceptan claves arbitrarias) */
export function isResourceKeyOf(courseId: string, key: string): boolean {
  const prefix = resourcePrefix(courseId);
  if (!key.startsWith(prefix)) return false;
  const rest = key.slice(prefix.length);
  return /^[0-9a-f-]{36}\/[a-zA-Z0-9._-]{1,110}$/.test(rest) && !rest.includes("..");
}

/** "2,4 MB", "830 KB" */
export function formatBytes(n: number | null | undefined): string {
  if (!n || n <= 0) return "";
  if (n < 1024 * 1024) return `${Math.max(1, Math.round(n / 1024))} KB`;
  const mb = n / (1024 * 1024);
  return `${mb.toLocaleString("es-ES", { maximumFractionDigits: mb < 10 ? 1 : 0 })} MB`;
}

/** Etiqueta corta del tipo de recurso para mostrar al alumno. */
export function resourceLabel(r: { kind: "link" | "file"; fileName?: string | null; url?: string | null }): string {
  if (r.kind === "file") return (fileExtension(r.fileName ?? "") || "archivo").toUpperCase();
  try {
    return new URL(r.url ?? "").hostname.replace(/^www\./, "");
  } catch {
    return "Enlace";
  }
}
