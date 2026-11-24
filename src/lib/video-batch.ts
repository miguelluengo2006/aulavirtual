// Empareja los vídeos de una carpeta con las lecciones de un manifiesto.
// Sin "server-only": lo usa el script `npm run videos:course`.
import type { CourseManifest } from "./course-manifest.schema";
import { TODO } from "./course-manifest.schema";

/** Nombres de vídeo de clase: M<módulo>-<n>-<tema>.mp4 (se ignoran las versiones "-ligero"). */
const VIDEO_NAME = /^M(\d+)-(\d+)-.+\.mp4$/i;

export type VideoMatch = {
  file: string;
  moduleIndex: number;
  lessonIndex: number;
  lessonId: string;
  /** Ya tiene vídeo en el manifiesto (se salta salvo que se fuerce). */
  done: boolean;
};

export type MatchResult = {
  matches: VideoMatch[];
  /** Archivos que parecen vídeos de clase pero no tienen lección. */
  unmatched: string[];
  /** Lecciones sin vídeo en la carpeta. */
  missing: string[];
};

export function matchVideos(m: CourseManifest, files: string[]): MatchResult {
  const byPos = new Map<string, string>();
  const unmatched: string[] = [];
  for (const f of files) {
    if (/-ligero\.mp4$/i.test(f)) continue;
    const hit = VIDEO_NAME.exec(f);
    if (!hit) continue;
    const pos = `${Number(hit[1]) - 1}:${Number(hit[2]) - 1}`;
    if (byPos.has(pos)) {
      unmatched.push(f); // duplicado: no adivinamos cuál es el bueno
      continue;
    }
    byPos.set(pos, f);
  }

  const matches: VideoMatch[] = [];
  const missing: string[] = [];
  m.modules.forEach((mod, mi) =>
    mod.lessons.forEach((les, li) => {
      const pos = `${mi}:${li}`;
      const file = byPos.get(pos);
      if (!file) {
        missing.push(les.id);
        return;
      }
      byPos.delete(pos);
      matches.push({
        file,
        moduleIndex: mi,
        lessonIndex: li,
        lessonId: les.id,
        done: les.video.key !== TODO,
      });
    }),
  );
  unmatched.push(...byPos.values());
  return { matches, unmatched: unmatched.sort(), missing };
}

/** Extrae el bloque JSON del vídeo que imprime `video:prepare` al final. */
export function parsePrepareOutput(
  out: string,
): { provider: "r2"; key: string; durationSeconds: number } | null {
  const i = out.lastIndexOf("Para el course.json:");
  if (i === -1) return null;
  const start = out.indexOf("{", i);
  const end = out.lastIndexOf("}");
  if (start === -1 || end < start) return null;
  try {
    const v = JSON.parse(out.slice(start, end + 1));
    if (v?.provider === "r2" && typeof v.key === "string" && Number.isInteger(v.durationSeconds)) {
      return v;
    }
  } catch {
    // sigue abajo
  }
  return null;
}
