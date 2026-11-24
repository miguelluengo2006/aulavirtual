import { drizzle } from "drizzle-orm/node-postgres";
import { Pool, type PoolClient } from "pg";
import { connectWithRetry } from "./retry";
import * as schema from "./schema";

// Durante `next build` no hace falta la base de datos (las páginas leen los datos al pedirlas).
if (!process.env.DATABASE_URL && process.env.NEXT_PHASE !== "phase-production-build") {
  throw new Error("Falta DATABASE_URL en las variables de entorno");
}

/**
 * Pool que reintenta una vez *abrir* la conexión si falla por algo transitorio
 * (arranque en frío de la función, corte del pooler). Solo afecta a la conexión:
 * una consulta ya enviada nunca se repite. `pool.query` también pasa por aquí.
 */
class RetryingPool extends Pool {
  // Mismas dos formas que pg: con callback (la usa pool.query) o con promesa.
  connect(): Promise<PoolClient>;
  connect(cb: (err: Error | undefined, client: PoolClient | undefined, done: (release?: unknown) => void) => void): void;
  connect(
    cb?: (err: Error | undefined, client: PoolClient | undefined, done: (release?: unknown) => void) => void,
  ): Promise<PoolClient> | void {
    const p = connectWithRetry(() => super.connect(), {
      onRetry: (err) => console.warn(`[db] reintentando la conexión: ${(err as Error).message}`),
    });
    if (!cb) return p;
    p.then(
      (client) => cb(undefined, client, (release) => client.release(release as Error | boolean | undefined)),
      (err: Error) => cb(err, undefined, () => {}),
    );
  }
}

// Reutiliza el pool entre recargas en desarrollo.
const globalForDb = globalThis as unknown as { pool?: Pool };

const pool =
  globalForDb.pool ??
  new RetryingPool({
    connectionString: process.env.DATABASE_URL,
    // En Vercel una misma instancia atiende varias peticiones a la vez y el
    // Transaction pooler de Supabase (puerto 6543) reparte las conexiones reales.
    max: process.env.VERCEL ? 8 : 10,
    idleTimeoutMillis: 10_000,
    // Si no hay conexión libre o la base de datos no responde, falla pronto
    // en vez de dejar la petición colgada hasta el límite de la función.
    // Una conexión normal tarda < 0,5 s; con un reintento, el peor caso son ~10 s.
    connectionTimeoutMillis: 5_000,
    query_timeout: 15_000,
    keepAlive: true,
  });

// Una conexión en reposo puede cortarse (reinicio del pooler, red). Sin este
// manejador, ese error tumbaría el proceso entero; el pool la sustituye solo.
if (!globalForDb.pool) {
  pool.on("error", (err) => {
    console.error(`[db] conexión en reposo cerrada: ${err.message}`);
  });
}

if (process.env.NODE_ENV !== "production") globalForDb.pool = pool;

export const db = drizzle(pool, { schema });
export type Db = typeof db;
export { pool };
