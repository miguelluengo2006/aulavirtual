import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

// Durante `next build` no hace falta la base de datos (las páginas leen los datos al pedirlas).
if (!process.env.DATABASE_URL && process.env.NEXT_PHASE !== "phase-production-build") {
  throw new Error("Falta DATABASE_URL en las variables de entorno");
}

// Reutiliza el pool entre recargas en desarrollo.
const globalForDb = globalThis as unknown as { pool?: Pool };

const pool =
  globalForDb.pool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    // En Vercel una misma instancia atiende varias peticiones a la vez y el
    // Transaction pooler de Supabase (puerto 6543) reparte las conexiones reales.
    max: process.env.VERCEL ? 8 : 10,
    idleTimeoutMillis: 10_000,
    // Si no hay conexión libre o la base de datos no responde, falla pronto
    // en vez de dejar la petición colgada hasta el límite de la función.
    connectionTimeoutMillis: 8_000,
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
