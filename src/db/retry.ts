// Reintento al abrir una conexión con la base de datos.
// Sin "server-only": lo usa src/db/index.ts, que también usan los scripts.

/**
 * Fallos al *abrir* la conexión que suelen arreglarse solos al reintentar:
 * arranques en frío (el proceso tarda en terminar la autenticación con el pooler),
 * cortes del pooler o de la red. Ninguno ha llegado a enviar una consulta.
 */
export function isTransientConnectError(err: unknown): boolean {
  const e = err as { message?: string; code?: string } | null;
  const msg = (e?.message ?? "").toLowerCase();
  return (
    ["ECONNRESET", "ETIMEDOUT", "EPIPE", "ECONNREFUSED", "EAI_AGAIN"].includes(e?.code ?? "") ||
    msg.includes("timeout exceeded when trying to connect") ||
    msg.includes("connection terminated due to connection timeout") ||
    msg.includes("connection terminated unexpectedly")
  );
}

/** Ejecuta `connect` y, si falla por algo transitorio, lo reintenta (con espera creciente). */
export async function connectWithRetry<T>(
  connect: () => Promise<T>,
  { retries = 1, delayMs = 300, onRetry }: { retries?: number; delayMs?: number; onRetry?: (err: unknown) => void } = {},
): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await connect();
    } catch (err) {
      if (attempt >= retries || !isTransientConnectError(err)) throw err;
      onRetry?.(err);
      await new Promise((r) => setTimeout(r, delayMs * (attempt + 1)));
    }
  }
}
