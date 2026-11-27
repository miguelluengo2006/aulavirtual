import { canAccessCourse } from "@/lib/access";
import { presignGet } from "@/lib/r2";
import { resourceById } from "@/lib/resources";
import { getCurrentUser } from "@/lib/session";

// Descarga de un recurso: solo para quien tiene acceso al curso. Redirige a una
// URL firmada de R2 que dura 5 minutos y descarga el archivo con su nombre.
export async function GET(_request: Request, ctx: RouteContext<"/api/recursos/[id]">) {
  const { id } = await ctx.params;
  const user = await getCurrentUser();
  if (!user) return new Response("No autenticado", { status: 401 });

  const r = await resourceById(id);
  // Mismo 404 si no existe o no hay acceso: no revela qué recursos existen.
  if (!r || !(await canAccessCourse(user.id, r.courseId))) {
    return new Response("No encontrado", { status: 404 });
  }

  const target =
    r.kind === "link"
      ? r.url!
      : await presignGet(r.fileKey!, 5 * 60, {
          downloadName: r.fileName ?? "recurso",
          contentType: r.contentType ?? "application/octet-stream",
        });
  return new Response(null, {
    status: 302,
    headers: { Location: target, "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" },
  });
}
