import "server-only";
import { eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { db } from "@/db";
import { adminAuditLog, user } from "@/db/schema";
import { auth } from "@/lib/auth";
import { isSessionFresh } from "./rules";

/**
 * Todas las acciones del panel pasan por aquí. Garantiza, en este orden:
 * 1. que hay sesión y que el usuario es admin AHORA (se lee el rol de la base de datos),
 * 2. que la sesión es reciente si la acción es delicada,
 * 3. que los datos son válidos (Zod),
 * 4. que el cambio y su registro de actividad se guardan juntos (una transacción),
 * 5. que los errores inesperados no filtran detalles internos.
 *
 * Proteger la página no basta: una Server Action se puede llamar sin pasar por la interfaz.
 */

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string; reauth?: boolean };

/** Error esperado, con un mensaje que se puede mostrar al admin. */
export class AdminError extends Error {}

export type Actor = { id: string; email: string; name: string };
export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type AuditEntry = {
  action: string;
  targetType: "course" | "module" | "lesson" | "quiz" | "user" | "enrollment" | "teacher";
  targetId?: string | null;
  summary: string;
  details?: Record<string, unknown>;
};

type Handler<I, T> = (
  input: I,
  ctx: { actor: Actor; tx: Tx },
) => Promise<{ data: T; audit: AuditEntry | AuditEntry[] }>;

export function adminAction<S extends z.ZodType, T = undefined>(opts: {
  schema: S;
  /** Exige haber entrado en las últimas 12 horas (roles, borrados, sesiones). */
  sensitive?: boolean;
  run: Handler<z.infer<S>, T>;
}) {
  return async (raw: unknown): Promise<ActionResult<T>> => {
    try {
      const h = await headers();
      const session = await auth.api.getSession({ headers: h });
      if (!session) {
        return { ok: false, error: "Tu sesión ha caducado. Vuelve a entrar.", reauth: true };
      }

      // El rol se lee de la base de datos en cada acción.
      const [row] = await db
        .select({ role: user.role, email: user.email, name: user.name, banned: user.banned })
        .from(user)
        .where(eq(user.id, session.user.id))
        .limit(1);
      if (!row || row.role !== "admin" || row.banned) {
        console.warn(`[admin] acción rechazada: ${session.user.id} no es admin`);
        return { ok: false, error: "No tienes permiso para hacer esto." };
      }

      if (opts.sensitive && !isSessionFresh(new Date(session.session.createdAt))) {
        return {
          ok: false,
          error: "Por seguridad, vuelve a entrar en tu cuenta para hacer esta acción.",
          reauth: true,
        };
      }

      const parsed = opts.schema.safeParse(raw);
      if (!parsed.success) {
        return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos no válidos." };
      }

      const actor: Actor = { id: session.user.id, email: row.email, name: row.name };
      const ip = h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;

      const data = await db.transaction(async (tx) => {
        const result = await opts.run(parsed.data, { actor, tx });
        const entries = Array.isArray(result.audit) ? result.audit : [result.audit];
        if (entries.length) {
          await tx.insert(adminAuditLog).values(
            entries.map((e) => ({
              actorId: actor.id,
              actorEmail: actor.email,
              action: e.action,
              targetType: e.targetType,
              targetId: e.targetId ?? null,
              summary: e.summary,
              details: e.details ?? null,
              ipAddress: ip,
            })),
          );
        }
        return result.data;
      });

      refresh();
      return { ok: true, data };
    } catch (e) {
      if (e instanceof AdminError) return { ok: false, error: e.message };
      console.error("[admin] error inesperado:", e);
      return { ok: false, error: "Algo ha fallado y no se ha guardado nada. Inténtalo de nuevo." };
    }
  };
}

/** Normaliza un email escrito por el admin. */
export const emailInput = z.string().trim().toLowerCase().email("Escribe un email válido");
export const idInput = z.string().min(1).max(64);
