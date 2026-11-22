import "server-only";

/**
 * Envío de emails.
 * - Con RESEND_API_KEY: se envían con Resend (https://resend.com).
 * - Con EMAIL_DEV_CONSOLE=1 (nunca en Vercel): se escriben en la consola,
 *   para probar el registro y la recuperación de contraseña en local.
 * - Sin ninguno: no se envían emails y no se exige verificar el email.
 */
export type EmailMode = "resend" | "console" | "off";

export function emailMode(): EmailMode {
  if (process.env.RESEND_API_KEY) return "resend";
  // Nunca en Vercel: los enlaces de los emails acabarían en los registros.
  if (process.env.EMAIL_DEV_CONSOLE === "1" && !process.env.VERCEL) return "console";
  return "off";
}

export const emailEnabled = () => emailMode() !== "off";

type Email = { to: string; subject: string; html: string; text: string };

export async function sendEmail(email: Email): Promise<void> {
  const mode = emailMode();
  if (mode === "off") return;

  if (mode === "console") {
    console.log(`[email] Para: ${email.to}\n[email] Asunto: ${email.subject}\n${email.text}\n[email] ---`);
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM ?? "IDESIE AV <onboarding@resend.dev>",
      to: [email.to],
      subject: email.subject,
      html: email.html,
      text: email.text,
    }),
  });
  if (!res.ok) {
    // No se lanza el error: el usuario puede pedir el email de nuevo,
    // y así un fallo puntual de Resend no rompe el registro.
    console.error(`[email] Resend respondió ${res.status}: ${await res.text()}`);
  }
}
