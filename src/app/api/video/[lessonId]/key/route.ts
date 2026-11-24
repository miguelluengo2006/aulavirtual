import { lessonVideoPrefix } from "@/lib/hls";
import { lessonForRequest } from "@/lib/lesson-access";
import { getObjectBytesCached, R2NotFoundError } from "@/lib/r2";

// Clave AES-128 del vídeo. Es lo que hace inútiles los segmentos fuera de la
// plataforma: solo se entrega a usuarios con acceso al curso y nunca se firma.
export async function GET(request: Request, ctx: RouteContext<"/api/video/[lessonId]/key">) {
  const { lessonId } = await ctx.params;
  const r = await lessonForRequest(lessonId);
  if ("error" in r) return r.error;

  const key = new URL(request.url).searchParams.get("p") ?? "";
  const prefix = lessonVideoPrefix(r.lesson.videoKey);
  if (!key.startsWith(prefix) || key.includes("..") || !key.endsWith(".key")) {
    return new Response("Ruta no permitida", { status: 400 });
  }

  // Solo la reproducción desde la propia web (dificulta usar la clave desde fuera).
  if (request.headers.get("sec-fetch-site") === "cross-site") {
    return new Response("Prohibido", { status: 403 });
  }

  try {
    const bytes = await getObjectBytesCached(key);
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": "application/octet-stream",
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e) {
    if (e instanceof R2NotFoundError) return new Response("No encontrado", { status: 404 });
    throw e;
  }
}
