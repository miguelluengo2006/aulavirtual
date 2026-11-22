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
    // En Vercel cada función tiene su propio pool: pocas conexiones, y el
    // Transaction pooler de Supabase (puerto 6543) las reparte.
    max: process.env.VERCEL ? 3 : 10,
    idleTimeoutMillis: 10_000,
  });

if (process.env.NODE_ENV !== "production") globalForDb.pool = pool;

export const db = drizzle(pool, { schema });
export type Db = typeof db;
export { pool };
