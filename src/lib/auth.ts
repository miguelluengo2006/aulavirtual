import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/db";
import * as schema from "@/db/schema";

// URL pública de la web. En Vercel se deduce sola si no se define BETTER_AUTH_URL.
const vercelUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : undefined;
const baseURL = process.env.BETTER_AUTH_URL ?? vercelUrl;

export const auth = betterAuth({
  baseURL,
  // Permite también las URLs de preview de Vercel de este despliegue.
  trustedOrigins: [baseURL, process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`].filter(
    (o): o is string => Boolean(o),
  ),
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
  },
  user: {
    additionalFields: {
      // El rol nunca lo puede fijar el usuario al registrarse (input: false).
      // Se cambia con `npm run user:role` o desde el panel de admin.
      role: {
        type: "string",
        input: false,
        defaultValue: "student",
        required: false,
      },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 días
    updateAge: 60 * 60 * 24, // renueva una vez al día
  },
  // nextCookies debe ir el último: permite fijar cookies desde server actions.
  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
