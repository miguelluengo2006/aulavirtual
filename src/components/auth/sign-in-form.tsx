"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { authErrorMessage } from "@/lib/auth-errors";
import { safeNext } from "@/lib/safe-next";
import { AuthCard, FormMessage, PasswordField, ResendButton, TextField } from "./ui";

export function SignInForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const passwordChanged = params.get("restablecida") === "1";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unverified, setUnverified] = useState(false);
  const [pending, setPending] = useState(false);

  const resend = async () => {
    const { error } = await authClient.sendVerificationEmail({
      email: email.trim(),
      callbackURL: `/verificado?next=${encodeURIComponent(next)}`,
    });
    if (error) setError(authErrorMessage(error));
    return !error;
  };

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    setError(null);
    setUnverified(false);
    setPending(true);
    try {
      const { error } = await authClient.signIn.email({
        email: email.trim(),
        password,
        rememberMe: remember,
        // Sin callbackURL: con él, Better Auth redirige solo tras entrar.
      });
      if (error) {
        setPending(false);
        if (error.code === "EMAIL_NOT_VERIFIED") {
          setUnverified(true);
          await resend(); // le mandamos el enlace de confirmación de nuevo
        } else setError(authErrorMessage(error));
        return;
      }
      router.replace(next);
      router.refresh();
    } catch {
      setError(authErrorMessage({}));
      setPending(false);
    }
  }

  return (
    <AuthCard
      title="Entra en tu cuenta"
      subtitle="Sigue donde lo dejaste."
      footer={
        <>
          ¿Aún no tienes cuenta?{" "}
          <Link href={`/registro?next=${encodeURIComponent(next)}`} className="link">
            Crea una gratis
          </Link>
        </>
      }
    >
      {passwordChanged && (
        <FormMessage tone="success">Contraseña cambiada. Ya puedes entrar con la nueva.</FormMessage>
      )}
      {unverified && (
        <FormMessage tone="info">
          <p className="font-medium">Confirma tu email para entrar</p>
          <p className="mt-1 text-muted">
            Te hemos enviado un enlace a <strong className="text-white">{email.trim()}</strong>. Ábrelo
            y entrarás directamente. Mira también en la carpeta de spam.
          </p>
        </FormMessage>
      )}
      {error && <FormMessage tone="error">{error}</FormMessage>}

      <form onSubmit={onSubmit} className="space-y-5" noValidate={false}>
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
        <div className="space-y-2">
          <PasswordField
            label="Contraseña"
            autoComplete="current-password"
            value={password}
            onChange={setPassword}
          />
          <div className="flex items-center justify-between gap-3 px-1 text-sm">
            <label className="flex cursor-pointer items-center gap-2 text-muted">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="size-4 accent-[var(--accent)]"
              />
              Mantener la sesión iniciada
            </label>
            <Link href="/recuperar" className="link whitespace-nowrap">
              ¿La has olvidado?
            </Link>
          </div>
        </div>
        <button disabled={pending} className="btn btn-primary w-full">
          {pending ? "Entrando…" : "Entrar"}
        </button>
      </form>

      {unverified && <ResendButton onResend={resend} label="Reenviar el email de confirmación" />}
    </AuthCard>
  );
}
