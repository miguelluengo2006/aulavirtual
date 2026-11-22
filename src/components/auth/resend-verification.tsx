"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { authErrorMessage } from "@/lib/auth-errors";
import { FormMessage, TextField } from "./ui";

/** Pide un email de confirmación nuevo (cuando el enlace ha caducado). */
export function ResendVerification({ callbackURL }: { callbackURL: string }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  if (state === "sent") {
    return (
      <FormMessage tone="success">
        Si hay una cuenta sin confirmar con ese email, te hemos enviado un enlace nuevo.
      </FormMessage>
    );
  }

  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setError(null);
        setState("sending");
        try {
          const { error } = await authClient.sendVerificationEmail({
            email: email.trim().toLowerCase(),
            callbackURL,
          });
          if (error && (error.status === 429 || !error.status)) {
            setError(authErrorMessage(error));
            setState("idle");
          } else setState("sent");
        } catch {
          setError(authErrorMessage({}));
          setState("idle");
        }
      }}
    >
      {error && <FormMessage tone="error">{error}</FormMessage>}
      <TextField
        label="Tu email"
        type="email"
        name="email"
        autoComplete="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <button disabled={state === "sending"} className="btn btn-primary w-full">
        {state === "sending" ? "Enviando…" : "Enviar un enlace nuevo"}
      </button>
    </form>
  );
}
