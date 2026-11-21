import { posix } from "node:path";
import { lessonVideoPrefix, PlaylistError, rewritePlaylist, segmentUrlTtl } from "@/lib/hls";
import { lessonForRequest } from "@/lib/lesson-access";
import { getObjectText, presignGet, R2NotFoundError } from "@/lib/r2";

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

  const ttl = segmentUrlTtl(lesson.durationSeconds);
  const base = `/api/video/${lesson.id}`;
  try {
    const body = await rewritePlaylist(await getObjectText(playlistKey), playlistKey, prefix, {
      segment: (key) => presignGet(key, ttl),
      key: (key) => `${base}/key?p=${encodeURIComponent(key)}`,
      playlist: (key) => `${base}/playlist?p=${encodeURIComponent(key)}`,
    });
    return new Response(body, {
      headers: {
        "Content-Type": "application/vnd.apple.mpegurl",
        "Cache-Control": "private, no-store",
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

