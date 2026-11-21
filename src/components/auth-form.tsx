"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { signIn, signUp } from "@/lib/auth-client";

// Solo se permite volver a rutas internas (evita redirecciones abiertas).
function safeNext(next: string | null) {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/mis-cursos";
}

export function AuthForm({ mode }: { mode: "signin" | "signup" }) {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email"));
    const password = String(form.get("password"));

    const { error } =
      mode === "signup"
        ? await signUp.email({ email, password, name: String(form.get("name")) })
        : await signIn.email({ email, password });

    setPending(false);
    if (error) {
      setError(
        mode === "signup"
          ? "No se ha podido crear la cuenta. Si ya tienes una con ese email, entra con ella."
          : "El email o la contraseña no son correctos.",
      );
      return;
    }
    router.push(safeNext(params.get("next")));
    router.refresh();
  }

  const next = params.get("next");
  const other = mode === "signup" ? "/entrar" : "/registro";

  return (
    <form onSubmit={onSubmit} className="glass mx-auto mt-6 max-w-md space-y-5 p-8 sm:p-10">
      <div className="space-y-1">
        <h1 className="text-3xl">{mode === "signup" ? "Crea tu cuenta" : "Entra en tu cuenta"}</h1>
        <p className="text-muted">
          {mode === "signup"
            ? "Con una cuenta guardas tu progreso en cada curso."
            : "Sigue donde lo dejaste."}
        </p>
      </div>
      {mode === "signup" && (
        <label className="block space-y-1.5">
          <span className="pl-1 text-sm text-muted">Nombre</span>
          <input name="name" required autoComplete="name" className="field" />
        </label>
      )}
      <label className="block space-y-1.5">
        <span className="pl-1 text-sm text-muted">Email</span>
        <input name="email" type="email" required autoComplete="email" className="field" />
      </label>
      <label className="block space-y-1.5">
        <span className="pl-1 text-sm text-muted">Contraseña</span>
        <input
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          className="field"
        />
        {mode === "signup" && <span className="block pl-1 text-xs text-subtle">Mínimo 8 caracteres.</span>}
      </label>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      <button disabled={pending} className="btn btn-primary w-full">
        {pending ? "Un momento…" : mode === "signup" ? "Crear cuenta" : "Entrar"}
      </button>
      <p className="text-center text-sm text-muted">
        {mode === "signup" ? "¿Ya tienes cuenta? " : "¿Aún no tienes cuenta? "}
        <Link href={next ? `${other}?next=${encodeURIComponent(next)}` : other} className="link">
          {mode === "signup" ? "Entra" : "Crea una"}
        </Link>
      </p>
    </form>
  );
}
