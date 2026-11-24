import { posix } from "node:path";
import {
  lessonVideoPrefix,
  PlaylistError,
  rewritePlaylist,
  segmentUrlTtl,
  stableSigning,
} from "@/lib/hls";
import { lessonForRequest } from "@/lib/lesson-access";
import { getObjectTextCached, presignGet, R2NotFoundError } from "@/lib/r2";

// Devuelve la playlist HLS de una lección, reescrita:
// segmentos → URLs firmadas de R2; clave y sub-playlists → este mismo servidor.
export async function GET(
  request: Request,
  ctx: RouteContext<"/api/video/[lessonId]/playlist">,
) {
  const { lessonId } = await ctx.params;
  const r = await lessonForRequest(lessonId);
  if ("error" in r) return r.error;
  const { lesson } = r;

  if (lesson.videoProvider !== "r2") {
    return new Response("Proveedor de vídeo no soportado todavía", { status: 501 });
  }
  if (lesson.videoKey === "TODO") return new Response("Vídeo pendiente", { status: 404 });

  const prefix = lessonVideoPrefix(lesson.videoKey);
  const sub = new URL(request.url).searchParams.get("p");
  // `p` es una sub-playlist (vídeos con varias calidades); siempre dentro de la carpeta.
  const playlistKey = sub ? posix.normalize(sub) : lesson.videoKey;
  if (!playlistKey.startsWith(prefix) || playlistKey.includes("..") || !playlistKey.endsWith(".m3u8")) {
    return new Response("Ruta no permitida", { status: 400 });
  }

  // Firmas estables durante 10 min: mismas URLs → el navegador reutiliza los segmentos.
  const signing = stableSigning(Date.now(), segmentUrlTtl(lesson.durationSeconds));
  // Interruptor por si R2 dejara de aceptar `response-cache-control`: R2_SEGMENT_BROWSER_CACHE=off.
  const cacheSeconds = process.env.R2_SEGMENT_BROWSER_CACHE === "off" ? undefined : signing.cacheSeconds;
  const base = `/api/video/${lesson.id}`;
  try {
    const body = await rewritePlaylist(await getObjectTextCached(playlistKey), playlistKey, prefix, {
      segment: (key) =>
        presignGet(key, signing.expiresIn, { signingDate: signing.signingDate, cacheSeconds }),
      key: (key) => `${base}/key?p=${encodeURIComponent(key)}`,
      playlist: (key) => `${base}/playlist?p=${encodeURIComponent(key)}`,
    });
    return new Response(body, {
      headers: {
        "Content-Type": "application/vnd.apple.mpegurl",
        // Breve y solo en el navegador del alumno: si vuelve a la lección enseguida
        // no hace falta pedirla otra vez. Las URLs que lleva duran mucho más.
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch (e) {
    if (e instanceof R2NotFoundError) return new Response("Vídeo no encontrado en R2", { status: 404 });
    if (e instanceof PlaylistError) {
      console.error(`[video] playlist inválida en ${playlistKey}: ${e.message}`);
      return new Response("Playlist inválida", { status: 500 });
    }
    throw e;
  }
}

