import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/db";
import * as schema from "@/db/schema";

export const auth = betterAuth({
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
