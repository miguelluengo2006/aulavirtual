"use client";

import Link from "next/link";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { authErrorMessage } from "@/lib/auth-errors";
import { AuthCard, FormMessage, TextField } from "./ui";

export function ForgotForm({ available }: { available: boolean }) {
  const [email, setEmail] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const footer = (
    <>
      ¿Te has acordado?{" "}
      <Link href="/entrar" className="link">
        Entra
      </Link>
    </>
  );

  if (!available) {
    return (
      <AuthCard title="Recuperar contraseña" footer={footer}>
        <FormMessage tone="info">
          La recuperación de contraseña por email todavía no está disponible. Escribe al equipo de
          IDESIE AV y te ayudaremos a recuperar el acceso.
        </FormMessage>
      </AuthCard>
    );
  }

  if (sentTo) {
    return (
      <AuthCard
        title="Revisa tu correo"
        subtitle={
          <>
            Si existe una cuenta con <strong className="text-white">{sentTo}</strong>, te hemos
            enviado un enlace para elegir una contraseña nueva.
          </>
        }
        footer={footer}
      >
        <ul className="space-y-2 text-sm text-muted">
          <li>El enlace caduca en 1 hora y solo funciona una vez.</li>
          <li>Si no lo ves en unos minutos, mira en la carpeta de spam.</li>
        </ul>
        <button
          type="button"
          onClick={() => setSentTo(null)}
          className="btn btn-ghost w-full"
        >
          Probar con otro email
        </button>
      </AuthCard>
    );
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    setError(null);
    setPending(true);
    const clean = email.trim().toLowerCase();
    try {
      const { error } = await authClient.requestPasswordReset({ email: clean, redirectTo: "/restablecer" });
      // Por seguridad, la respuesta es la misma exista o no la cuenta.
      if (error && (error.status === 429 || !error.status)) setError(authErrorMessage(error));
      else setSentTo(clean);
    } catch {
      setError(authErrorMessage({}));
    }
    setPending(false);
  }

  return (
    <AuthCard
      title="Recuperar contraseña"
      subtitle="Escribe el email de tu cuenta y te enviaremos un enlace para elegir una contraseña nueva."
      footer={footer}
    >
      {error && <FormMessage tone="error">{error}</FormMessage>}
      <form onSubmit={onSubmit} className="space-y-5">
        <TextField
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          autoCapitalize="none"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <button disabled={pending} className="btn btn-primary w-full">
          {pending ? "Enviando…" : "Enviar enlace"}
        </button>
      </form>
    </AuthCard>
  );
}
