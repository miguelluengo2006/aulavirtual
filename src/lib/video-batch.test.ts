import { describe, expect, it } from "vitest";
import { courseManifestSchema } from "./course-manifest.schema";
import { matchVideos, parsePrepareOutput } from "./video-batch";

const video = (key = "TODO") => ({ provider: "r2" as const, key });
const manifest = courseManifestSchema.parse({
  version: 1,
  slug: "curso",
  title: "Curso",
  description: "Descripción",
  pricing: { priceCents: null },
  modules: [
    { id: "m1", title: "M1", lessons: [{ id: "a", title: "A", video: video() }, { id: "b", title: "B", video: video("cursos/curso/b/index.m3u8") }] },
    { id: "m2", title: "M2", lessons: [{ id: "c", title: "C", video: video() }, { id: "d", title: "D", video: video() }] },
  ],
});

describe("matchVideos", () => {
  it("empareja por módulo y posición, ignora los -ligero y marca los ya subidos", () => {
    const r = matchVideos(manifest, [
      "M1-1-Intro.mp4",
      "M1-1-Intro-ligero.mp4",
      "M1-2-Otro.mp4",
      "M2-1-Tema.mp4",
      "notas.txt",
    ]);
    expect(r.matches.map((x) => [x.lessonId, x.file, x.done])).toEqual([
      ["a", "M1-1-Intro.mp4", false],
      ["b", "M1-2-Otro.mp4", true],
      ["c", "M2-1-Tema.mp4", false],
    ]);
    expect(r.missing).toEqual(["d"]);
    expect(r.unmatched).toEqual([]);
  });

  it("no ordena por texto: M1-10 es la lección 10, no la 2", () => {
    const r = matchVideos(manifest, ["M1-10-X.mp4", "M1-2-Y.mp4"]);
    expect(r.matches.map((x) => x.file)).toEqual(["M1-2-Y.mp4"]);
    expect(r.unmatched).toEqual(["M1-10-X.mp4"]);
  });

  it("no adivina si hay dos vídeos para la misma lección", () => {
    const r = matchVideos(manifest, ["M2-2-A.mp4", "M2-2-B.mp4"]);
    expect(r.matches.map((x) => x.file)).toEqual(["M2-2-A.mp4"]);
    expect(r.unmatched).toEqual(["M2-2-B.mp4"]);
  });
});

describe("parsePrepareOutput", () => {
  it("lee la clave y la duración", () => {
    const out = `✓ 40 segmentos\n\nPara el course.json:\n{\n  "provider": "r2",\n  "key": "cursos/x/a/index.m3u8",\n  "durationSeconds": 812\n}\n`;
    expect(parsePrepareOutput(out)).toEqual({ provider: "r2", key: "cursos/x/a/index.m3u8", durationSeconds: 812 });
  });

  it("devuelve null si la salida no trae el bloque", () => {
    expect(parsePrepareOutput("ffmpeg terminó con código 1")).toBeNull();
  });
});
