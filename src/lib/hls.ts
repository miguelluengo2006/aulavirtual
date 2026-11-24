// Reescritura de playlists HLS (.m3u8). Funciones puras, con tests.
import { posix } from "node:path";

/** Carpeta del vídeo de una lección: todo lo que se sirva debe estar dentro. */
export function lessonVideoPrefix(videoKey: string): string {
  const dir = posix.dirname(videoKey);
  return dir === "." ? "" : `${dir}/`;
}

/**
 * Resuelve una URI relativa de una playlist contra la carpeta de esa playlist.
 * Devuelve null si es absoluta (http…, /…) o se sale de la carpeta permitida.
 */
export function resolveInside(
  playlistKey: string,
  uri: string,
  allowedPrefix: string,
): string | null {
  if (/^[a-z][a-z0-9+.-]*:/i.test(uri) || uri.startsWith("/")) return null;
  const resolved = posix.normalize(posix.join(posix.dirname(playlistKey), uri));
  if (resolved.startsWith("../") || resolved === "..") return null;
  if (!resolved.startsWith(allowedPrefix)) return null;
  return resolved;
}

export type Rewriters = {
  /** Segmento de vídeo o init (#EXT-X-MAP) → URL firmada de R2. */
  segment: (key: string) => Promise<string>;
  /** Clave de cifrado → endpoint propio que comprueba el acceso. */
  key: (key: string) => string;
  /** Sub-playlist (master con varias calidades) → endpoint propio. */
  playlist: (key: string) => string;
};

export class PlaylistError extends Error {}

const URI_ATTR = /URI="([^"]+)"/;

/**
 * Reescribe una playlist para que:
 * - los segmentos apunten a URLs firmadas de corta duración,
 * - la clave AES-128 se pida al endpoint propio (nunca firmada),
 * - las sub-playlists vuelvan a pasar por el endpoint propio.
 */
export async function rewritePlaylist(
  text: string,
  playlistKey: string,
  allowedPrefix: string,
  rw: Rewriters,
): Promise<string> {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  if (lines[0]?.trim() !== "#EXTM3U") throw new PlaylistError("No es una playlist HLS");

  const resolve = (uri: string) => {
    const key = resolveInside(playlistKey, uri, allowedPrefix);
    if (!key) throw new PlaylistError(`URI no permitida en la playlist: ${uri}`);
    return key;
  };

  let nextIsVariant = false;
  const out: string[] = [];
  for (const raw of lines) {
    const line = raw.trim();

    if (line.startsWith("#EXT-X-KEY") || line.startsWith("#EXT-X-SESSION-KEY")) {
      const m = line.match(URI_ATTR);
      out.push(m ? line.replace(URI_ATTR, `URI="${rw.key(resolve(m[1]))}"`) : line);
      continue;
    }
    if (line.startsWith("#EXT-X-MAP")) {
      const m = line.match(URI_ATTR);
      out.push(m ? line.replace(URI_ATTR, `URI="${await rw.segment(resolve(m[1]))}"`) : line);
      continue;
    }
    if (line.startsWith("#EXT-X-MEDIA") || line.startsWith("#EXT-X-I-FRAME-STREAM-INF")) {
      const m = line.match(URI_ATTR);
      out.push(m ? line.replace(URI_ATTR, `URI="${rw.playlist(resolve(m[1]))}"`) : line);
      continue;
    }
    if (line.startsWith("#EXT-X-STREAM-INF")) nextIsVariant = true;

    if (line === "" || line.startsWith("#")) {
      out.push(line);
      continue;
    }

    const key = resolve(line);
    out.push(nextIsVariant || key.endsWith(".m3u8") ? rw.playlist(key) : await rw.segment(key));
    nextIsVariant = false;
  }
  return out.join("\n");
}

/** Ventana en la que las firmas de los segmentos no cambian (para que el navegador reutilice lo descargado). */
export const SIGNING_WINDOW_SECONDS = 10 * 60;

/**
 * Firma "estable": todas las peticiones de la misma ventana de 10 min firman con la
 * misma fecha, así la URL de cada segmento es idéntica y el navegador la saca de su
 * caché al volver atrás, repetir o recargar. La validez se alarga lo que haya pasado
 * desde el inicio de la ventana, para que cada URL siga durando al menos `ttlSeconds`.
 */
export function stableSigning(
  nowMs: number,
  ttlSeconds: number,
  windowSeconds = SIGNING_WINDOW_SECONDS,
): { signingDate: Date; expiresIn: number; cacheSeconds: number } {
  const windowMs = windowSeconds * 1000;
  const start = Math.floor(nowMs / windowMs) * windowMs;
  const expiresIn = Math.min(ttlSeconds + windowSeconds, 7 * 24 * 3600); // máximo de S3/R2
  // Va dentro de la URL firmada, así que tiene que ser fijo en toda la ventana. Como
  // siempre quedan al menos `ttlSeconds` de firma, el navegador nunca guarda una URL caducada.
  const cacheSeconds = Math.min(ttlSeconds, expiresIn);
  return { signingDate: new Date(start), expiresIn, cacheSeconds };
}

/** Validez de las URLs firmadas de los segmentos: lo que dura el vídeo + margen. */
export function segmentUrlTtl(durationSeconds: number | null | undefined): number {
  const base = (durationSeconds ?? 3600) + 30 * 60; // 30 min de margen para pausas
  return Math.min(Math.max(base, 15 * 60), 4 * 60 * 60);
}
