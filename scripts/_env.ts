// Carga .env.local (y .env) antes de importar nada que use la base de datos.
import { config } from "dotenv";

config({ path: [".env.local", ".env"], quiet: true });
