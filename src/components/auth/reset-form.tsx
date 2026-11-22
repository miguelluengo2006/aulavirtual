"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useId, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { authErrorMessage, linkErrorMessage, MIN_PASSWORD_LENGTH } from "@/lib/auth-errors";
import { AuthCard, FormMessage, PasswordField, PasswordRequirements } from "./ui";

export function ResetForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token");
  const linkError = linkErrorMessage(params.get("error")) ?? (token ? null : linkErrorMessage("INVALID_TOKEN"));
  const reqId = useId();

  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);
  const [pending, setPending] = useState(false);

  if (linkError || expired) {
    return (
      <AuthCard title="El enlace ya no sirve">
        <FormMessage tone="error">{linkError ?? error}</FormMessage>
        <p className="text-sm text-muted">
          Los enlaces para cambiar la contraseña caducan en 1 hora y solo se pueden usar una vez.
        </p>
        <Link href="/recuperar" className="btn btn-primary w-full">
          Pedir un enlace nuevo
        </Link>
      </AuthCard>
    );
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending || !token) return;
    setError(null);
    if (password.length < MIN_PASSWORD_LENGTH) {
      return setError("La contraseña debe tener al menos 8 caracteres.");
    }
    setPending(true);
    try {
      const { error } = await authClient.resetPassword({ newPassword: password, token });
      if (error) {
        setError(authErrorMessage(error));
        if (error.code === "INVALID_TOKEN" || error.code === "TOKEN_EXPIRED") setExpired(true);
        setPending(false);
        return;
      }
      router.replace("/entrar?restablecida=1");
    } catch {
      setError(authErrorMessage({}));
      setPending(false);
    }
  }

  return (
    <AuthCard
      title="Elige una contraseña nueva"
      subtitle="Al guardarla, cerraremos la sesión en todos tus dispositivos por seguridad."
    >
      {error && <FormMessage tone="error">{error}</FormMessage>}
      <form onSubmit={onSubmit} className="space-y-5">
        <div className="space-y-2">
          <PasswordField
            label="Contraseña nueva"
            autoComplete="new-password"
            value={password}
            onChange={setPassword}
            describedBy={reqId}
          />
          <PasswordRequirements id={reqId} password={password} />
        </div>
        <button disabled={pending} className="btn btn-primary w-full">
          {pending ? "Guardando…" : "Guardar contraseña"}
        </button>
      </form>
    </AuthCard>
  );
}
