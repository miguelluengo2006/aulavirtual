"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useId, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { authErrorMessage, MIN_PASSWORD_LENGTH } from "@/lib/auth-errors";
import { safeNext } from "@/lib/safe-next";
import { AuthCard, FormMessage, PasswordField, PasswordRequirements, ResendButton, TextField } from "./ui";

export function SignUpForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const reqId = useId();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const callbackURL = `/verificado?next=${encodeURIComponent(next)}`;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    setError(null);
    const cleanName = name.trim().replace(/\s+/g, " ");
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanName) return setError("Escribe tu nombre.");
    if (password.length < MIN_PASSWORD_LENGTH) {
      return setError("La contraseña debe tener al menos 8 caracteres.");
    }
    setPending(true);
    try {
      const { data, error } = await authClient.signUp.email({
        name: cleanName,
        email: cleanEmail,
        password,
        callbackURL,
      });
      if (error) {
        setError(authErrorMessage(error));
        setPending(false);
        return;
      }
      // Con verificación de email no se inicia sesión: hay que confirmar primero.
      if (!data?.token) {
        setSentTo(cleanEmail);
        setPending(false);
        return;
      }
      router.replace(next);
      router.refresh();
    } catch {
      setError(authErrorMessage({}));
      setPending(false);
    }
  }

  if (sentTo) {
    const resend = async () => {
      const { error } = await authClient.sendVerificationEmail({ email: sentTo, callbackURL });
      if (error) setError(authErrorMessage(error));
      return !error;
    };
    return (
      <AuthCard
        title="Revisa tu correo"
        subtitle={
          <>
            Te hemos enviado un enlace a <strong className="text-white">{sentTo}</strong> para
            confirmar tu email. Al abrirlo entrarás directamente.
          </>
        }
        footer={
          <>
            ¿Ya lo has confirmado?{" "}
            <Link href={`/entrar?next=${encodeURIComponent(next)}`} className="link">
              Entra
            </Link>
          </>
        }
      >
        <ul className="space-y-2 text-sm text-muted">
          <li>El enlace caduca en 24 horas.</li>
          <li>Si no lo ves en unos minutos, mira en la carpeta de spam o de promociones.</li>
        </ul>
        {error && <FormMessage tone="error">{error}</FormMessage>}
        <div className="space-y-3">
          <ResendButton onResend={resend} />
          <button
            type="button"
            onClick={() => {
              setSentTo(null);
              setError(null);
            }}
            className="btn w-full text-muted hover:text-white"
          >
            He escrito mal el email
          </button>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Crea tu cuenta"
      subtitle="Gratis. Con una cuenta guardas tu progreso en cada curso."
      footer={
        <>
          ¿Ya tienes cuenta?{" "}
          <Link href={`/entrar?next=${encodeURIComponent(next)}`} className="link">
            Entra
          </Link>
        </>
      }
    >
      {error && <FormMessage tone="error">{error}</FormMessage>}
      <form onSubmit={onSubmit} className="space-y-5">
        <TextField
          label="Nombre"
          name="name"
          autoComplete="name"
          required
          maxLength={80}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
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
            autoComplete="new-password"
            value={password}
            onChange={setPassword}
            describedBy={reqId}
          />
          <PasswordRequirements id={reqId} password={password} />
        </div>
        <button disabled={pending} className="btn btn-primary w-full">
          {pending ? "Creando tu cuenta…" : "Crear cuenta"}
        </button>
      </form>
    </AuthCard>
  );
}
