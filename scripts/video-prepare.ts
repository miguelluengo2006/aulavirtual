// Convierte un vídeo a HLS cifrado (AES-128) y, opcionalmente, lo sube a R2.
//
//   npm run video:prepare -- <video.mp4> <carpeta-en-r2> [--upload] [--height=720]
//
// Ejemplo:
//   npm run video:prepare -- ~/videos/intro.mp4 cursos/nextjs-desde-cero/que-es-nextjs --upload
//
// Requiere ffmpeg y ffprobe instalados. Deja el resultado en .video-out/<carpeta-en-r2>/
// e imprime la clave de vídeo y la duración para el course.json.
import "./_env";
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, posix } from "node:path";

const args = process.argv.slice(2);
const positional = args.filter((a) => !a.startsWith("--"));
const upload = args.includes("--upload");
const height = Number(args.find((a) => a.startsWith("--height="))?.split("=")[1] ?? 720);

const [input, rawDest] = positional;
if (!input || !rawDest) {
  console.error(
    "Uso: npm run video:prepare -- <video.mp4> <carpeta-en-r2> [--upload] [--height=720]",
  );
  process.exit(2);
}
const dest = posix.normalize(rawDest).replace(/^\/+|\/+$/g, "");
if (!/^[a-z0-9][a-z0-9/_-]*$/.test(dest) || dest.includes("..")) {
  console.error("La carpeta en R2 solo puede tener minúsculas, números, guiones y barras.");
  process.exit(2);
}
if (!Number.isInteger(height) || height < 144 || height > 2160) {
  console.error("--height debe ser un número entre 144 y 2160");
  process.exit(2);
}

function run(cmd: string, argv: string[], quiet = false): Promise<string> {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, argv, { stdio: ["ignore", "pipe", quiet ? "pipe" : "inherit"] });
    let out = "";
    p.stdout!.on("data", (d) => (out += d));
    p.on("error", (e) =>
      reject(
        (e as NodeJS.ErrnoException).code === "ENOENT"
          ? new Error(`No se encuentra ${cmd}. Instálalo (p. ej. "brew install ffmpeg").`)
          : e,
      ),
    );
    p.on("close", (code) => (code === 0 ? resolve(out) : reject(new Error(`${cmd} terminó con código ${code}`))));
  });
}

const outDir = join(".video-out", dest);
await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });

// La clave y el keyinfo se preparan fuera de la carpeta de salida;
// la clave se copia después como enc.key (se sube a R2, pero nunca se firma).
const work = await mkdtemp(join(tmpdir(), "hls-"));
const key = randomBytes(16);
const iv = randomBytes(16).toString("hex");
const keyPath = join(work, "enc.key");
await writeFile(keyPath, key);
await writeFile(join(work, "keyinfo"), `enc.key\n${keyPath}\n${iv}\n`);

const duration = Math.round(
  Number(
    (
      await run(
        "ffprobe",
        ["-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", input],
        true,
      )
    ).trim(),
  ),
);

console.log(`Convirtiendo ${input} (${duration} s) a HLS ${height}p cifrado…`);
await run("ffmpeg", [
  "-hide_banner", "-loglevel", "error", "-stats",
  "-i", input,
  "-map", "0:v:0", "-map", "0:a:0?",
  "-c:v", "libx264", "-preset", "veryfast", "-crf", "23", "-profile:v", "high", "-pix_fmt", "yuv420p",
  "-vf", `scale=-2:'min(${height},ih)'`,
  "-force_key_frames", "expr:gte(t,n_forced*6)",
  "-c:a", "aac", "-b:a", "128k", "-ac", "2",
  "-f", "hls",
  "-hls_time", "6",
  "-hls_playlist_type", "vod",
  "-hls_key_info_file", join(work, "keyinfo"),
  "-hls_segment_filename", join(outDir, "seg_%04d.ts"),
  join(outDir, "index.m3u8"),
]);
await writeFile(join(outDir, "enc.key"), key);
await rm(work, { recursive: true, force: true });

const files = (await readdir(outDir)).sort();
console.log(`✓ ${files.length - 2} segmentos en ${outDir}`);

if (upload) {
  const { putObject } = await import("@/lib/r2");
  const types: Record<string, string> = {
    m3u8: "application/vnd.apple.mpegurl",
    ts: "video/mp2t",
    key: "application/octet-stream",
  };
  let n = 0;
  for (const f of files) {
    const ext = f.split(".").pop()!;
    await putObject(`${dest}/${f}`, await readFile(join(outDir, f)), types[ext] ?? "application/octet-stream");
    process.stdout.write(`\r  Subiendo a R2… ${++n}/${files.length}`);
  }
  console.log(`\n✓ Subido a R2 en ${dest}/`);
} else {
  console.log(`  (Sin --upload: sube la carpeta ${outDir} entera a R2 en ${dest}/)`);
}

console.log("\nPara el course.json:");
console.log(
  JSON.stringify({ provider: "r2", key: `${dest}/index.m3u8`, durationSeconds: duration }, null, 2),
);
