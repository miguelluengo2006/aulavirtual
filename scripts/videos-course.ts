// Prepara y sube a R2 todos los vídeos de un curso y actualiza su course.json.
//
//   npm run videos:course -- <course.json> <carpeta-con-los-mp4> [--upload] [--height=720] [--limit=N] [--force]
//
// - Empareja M<módulo>-<n>-<tema>.mp4 con la lección n del módulo (ignora los "-ligero").
// - Salta las lecciones que ya tienen vídeo (usa --force para rehacerlas).
// - --limit=N procesa solo N vídeos (para ir por tandas).
// - Guarda la clave y la duración en el course.json tras cada vídeo: si se corta, se retoma.
// Después: npm run course:import -- <course.json>
import "./_env";
import { spawn } from "node:child_process";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { loadManifest } from "./_manifest";
import { matchVideos, parsePrepareOutput } from "@/lib/video-batch";

const args = process.argv.slice(2);
const [manifestPath, videoDir] = args.filter((a) => !a.startsWith("--"));
const flag = (name: string) => args.find((a) => a.startsWith(`--${name}=`))?.split("=")[1];
const upload = args.includes("--upload");
const force = args.includes("--force");
const limit = flag("limit") ? Number(flag("limit")) : Infinity;
const height = flag("height");

if (!manifestPath || !videoDir) {
  console.error(
    "Uso: npm run videos:course -- <course.json> <carpeta-con-los-mp4> [--upload] [--height=720] [--limit=N] [--force]",
  );
  process.exit(2);
}
if (!upload) {
  console.log("! Sin --upload solo se convierten (en .video-out/) y no se toca el course.json.\n");
}

const manifest = await loadManifest(manifestPath);
if (!manifest) process.exit(1);

const { matches, unmatched, missing } = matchVideos(manifest, await readdir(videoDir));
if (unmatched.length) console.log(`! Vídeos sin lección (no se suben): ${unmatched.join(", ")}`);
if (missing.length) console.log(`! Lecciones sin vídeo en la carpeta: ${missing.join(", ")}`);

const todo = matches.filter((x) => force || !x.done).slice(0, limit);
console.log(`\n${todo.length} vídeo(s) por procesar (${matches.filter((x) => x.done).length} ya tenían vídeo).\n`);

function prepare(file: string, dest: string): Promise<string> {
  const argv = ["tsx", "scripts/video-prepare.ts", join(videoDir, file), dest];
  if (upload) argv.push("--upload");
  if (height) argv.push(`--height=${height}`);
  return new Promise((resolve, reject) => {
    const p = spawn("npx", argv, { stdio: ["ignore", "pipe", "inherit"] });
    let out = "";
    p.stdout.on("data", (d) => {
      out += d;
      process.stdout.write(d);
    });
    p.on("error", reject);
    p.on("close", (code) => (code === 0 ? resolve(out) : reject(new Error(`video:prepare terminó con código ${code}`))));
  });
}

let ok = 0;
const failed: string[] = [];
for (const [i, x] of todo.entries()) {
  console.log(`\n[${i + 1}/${todo.length}] ${x.file} → ${x.lessonId}`);
  try {
    const out = await prepare(x.file, `cursos/${manifest.slug}/${x.lessonId}`);
    const video = parsePrepareOutput(out);
    if (!video) throw new Error("no se ha podido leer la clave del vídeo");
    if (upload) {
      // Se relee el archivo para no pisar cambios hechos mientras tanto.
      const raw = JSON.parse(await readFile(manifestPath, "utf8"));
      raw.modules[x.moduleIndex].lessons[x.lessonIndex].video = video;
      await writeFile(manifestPath, `${JSON.stringify(raw, null, 2)}\n`);
      console.log(`  ✓ course.json actualizado (${video.durationSeconds} s)`);
    }
    ok++;
  } catch (e) {
    console.error(`  ✗ ${x.file}: ${(e as Error).message}`);
    failed.push(x.file);
  }
}

console.log(`\n${ok} correcto(s), ${failed.length} con error.`);
if (failed.length) console.log(`  Con error (vuelve a lanzar el comando para reintentarlos): ${failed.join(", ")}`);
if (upload && ok) console.log(`\nSiguiente paso: npm run course:import -- ${manifestPath}`);
process.exitCode = failed.length ? 1 : 0;
