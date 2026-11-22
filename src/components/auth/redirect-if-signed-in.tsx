import { redirect } from "next/navigation";
import { safeNext } from "@/lib/safe-next";
import { getCurrentUser } from "@/lib/session";

/** Si ya hay sesión, no tiene sentido ver "Entrar" o "Crear cuenta": se va a su destino. */
export async function RedirectIfSignedIn({
  searchParams,
  children,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
  children: React.ReactNode;
}) {
  const [user, params] = await Promise.all([getCurrentUser(), searchParams]);
  if (user) {
    const next = Array.isArray(params.next) ? params.next[0] : params.next;
    redirect(safeNext(next));
  }
  return children;
}
