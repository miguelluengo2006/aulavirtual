import { readFile } from "node:fs/promises";
import {
  courseManifestSchema,
  formatManifestErrors,
  manifestWarnings,
  type CourseManifest,
} from "@/lib/course-manifest.schema";

/** Lee y valida un manifiesto. Imprime errores y avisos. Devuelve null si no es válido. */
export async function loadManifest(path: string): Promise<CourseManifest | null> {
  let raw: unknown;
  try {
    raw = JSON.parse(await readFile(path, "utf8"));
  } catch (e) {
    console.error(`✗ No se puede leer ${path}: ${(e as Error).message}`);
    return null;
  }

  const parsed = courseManifestSchema.safeParse(raw);
  if (!parsed.success) {
    console.error(`✗ ${path} no es válido:`);
    for (const line of formatManifestErrors(parsed.error)) console.error(`  - ${line}`);
    return null;
  }

  const m = parsed.data;
  const lessons = m.modules.flatMap((x) => x.lessons);
  const qs = lessons.reduce((n, l) => n + (l.quiz?.questions.length ?? 0), 0);
  console.log(`✓ ${m.title} (${m.slug})`);
  console.log(`  ${m.modules.length} módulos · ${lessons.length} lecciones · ${qs} preguntas`);

  const warnings = manifestWarnings(m);
  if (warnings.length) {
    console.log("  Avisos:");
    for (const w of warnings) console.log(`  ! ${w}`);
  }
  if (m.notes.length) {
    console.log("  Notas de Claude Code:");
    for (const n of m.notes) console.log(`  · ${n}`);
  }
  return m;
}

export function argPath(): string {
  const path = process.argv.slice(2).find((a) => !a.startsWith("--"));
  if (!path) {
    console.error("Uso: indica la ruta a course.json");
    process.exit(2);
  }
  return path;
}
