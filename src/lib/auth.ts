import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { emailEnabled, sendEmail } from "./email";
import {
  existingAccountTemplate,
  passwordChangedTemplate,
  resetPasswordTemplate,
  verifyEmailTemplate,
} from "./email-templates";

// URL pública de la web. En Vercel se deduce sola si no se define BETTER_AUTH_URL.
const vercelUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : undefined;
const baseURL = process.env.BETTER_AUTH_URL ?? vercelUrl;

/** URL absoluta de una página de la web, para los enlaces de los emails. */
function siteUrl(path: string, request?: Request) {
  const origin = baseURL ?? (request ? new URL(request.url).origin : "http://localhost:3000");
  return new URL(path, origin).toString();
}

// Si no hay forma de enviar emails, no se puede exigir verificarlo
// (nadie podría entrar). En producción hay que configurar Resend.
const verifyEmails = emailEnabled();

export const MAX_NAME_LENGTH = 80;

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
      rateLimit: schema.rateLimit,
    },
  }),

  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    requireEmailVerification: verifyEmails,
    // Al cambiar la contraseña se cierran todas las sesiones abiertas.
    revokeSessionsOnPasswordReset: true,
    resetPasswordTokenExpiresIn: 60 * 60, // 1 hora
    sendResetPassword: async ({ user, url }) => {
      const t = resetPasswordTemplate(user.name, url);
      await sendEmail({ to: user.email, ...t });
    },
    onPasswordReset: async ({ user }, request) => {
      const t = passwordChangedTemplate(user.name, siteUrl("/recuperar", request));
      await sendEmail({ to: user.email, ...t });
    },
    // Registro con un email que ya existe: no se le dice a quien lo intenta
    // (evita descubrir qué emails tienen cuenta); se avisa al dueño por email.
    onExistingUserSignUp: async ({ user }, request) => {
      const t = existingAccountTemplate(
        user.name,
        siteUrl("/entrar", request),
        siteUrl("/recuperar", request),
      );
      await sendEmail({ to: user.email, ...t });
    },
  },

  emailVerification: {
    sendOnSignUp: verifyEmails,
    // Si intenta entrar sin confirmar, el formulario de entrar pide el email
    // (con la página de destino correcta), no el servidor.
    sendOnSignIn: false,
    autoSignInAfterVerification: true,
    expiresIn: 60 * 60 * 24, // 24 horas
    sendVerificationEmail: async ({ user, url }) => {
      const t = verifyEmailTemplate(user.name, url);
      await sendEmail({ to: user.email, ...t });
    },
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

  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          const name = user.name.trim().replace(/\s+/g, " ");
          if (!name) throw new APIError("BAD_REQUEST", { message: "Escribe tu nombre", code: "NAME_REQUIRED" });
          if (name.length > MAX_NAME_LENGTH) {
            throw new APIError("BAD_REQUEST", { message: "El nombre es demasiado largo", code: "NAME_TOO_LONG" });
          }
          return { data: { ...user, name, email: user.email.trim().toLowerCase() } };
        },
      },
    },
  },

  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 días
    updateAge: 60 * 60 * 24, // renueva una vez al día
  },

  // Límite de intentos por IP. En Vercel cada petición puede ir a un servidor
  // distinto, así que se guarda en la base de datos (tabla rateLimit).
  rateLimit: {
    enabled: process.env.NODE_ENV === "production",
    storage: "database",
    window: 60,
    max: 100,
    customRules: {
      // Generosos por si muchos alumnos entran desde la misma red (un aula, una oficina).
      "/sign-in/email": { window: 60, max: 10 },
      "/sign-up/email": { window: 60, max: 10 },
      "/request-password-reset": { window: 60, max: 3 },
      "/send-verification-email": { window: 60, max: 3 },
      "/reset-password": { window: 60, max: 5 },
    },
  },

  advanced: {
    // Vercel fija x-real-ip con la IP real del visitante.
    ipAddress: { ipAddressHeaders: ["x-real-ip", "x-forwarded-for"] },
  },

  // nextCookies debe ir el último: permite fijar cookies desde server actions.
  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
