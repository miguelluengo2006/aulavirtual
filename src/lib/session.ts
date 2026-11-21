import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "./auth";

export type Role = "admin" | "teacher" | "student";

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
};

/**
 * Capa de acceso a datos para la sesión. Devuelve un usuario reducido
 * (nunca el objeto de sesión completo) o null si no hay sesión.
 *
 * Con cacheComponents, quien llame a esto debe estar dentro de <Suspense>.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  const { id, name, email } = session.user;
  const role = (session.user as { role?: string }).role;
  return {
    id,
    name,
    email,
    role: role === "admin" || role === "teacher" ? role : "student",
  };
}

/** Exige sesión; si no hay, redirige a /entrar. */
export async function requireUser(next?: string): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect(next ? `/entrar?next=${encodeURIComponent(next)}` : "/entrar");
  }
  return user;
}

/** Exige uno de los roles indicados; si no, redirige al inicio. */
export async function requireRole(
  roles: Role[],
  next?: string,
): Promise<CurrentUser> {
  const user = await requireUser(next);
  if (!roles.includes(user.role)) redirect("/");
  return user;
}
