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
          ? "No se ha podido crear la cuenta. ¿Ya existe una con ese email?"
          : "Email o contraseña incorrectos.",
      );
      return;
    }
    router.push(safeNext(params.get("next")));
    router.refresh();
  }

  const input =
    "w-full rounded-md border border-stone-300 bg-white px-3 py-2 outline-none focus:border-stone-900";

  return (
    <form onSubmit={onSubmit} className="mx-auto mt-8 max-w-sm space-y-4">
      <h1 className="text-2xl font-semibold">
        {mode === "signup" ? "Crear cuenta" : "Entrar"}
      </h1>
      {mode === "signup" && (
        <label className="block space-y-1">
          <span className="text-sm">Nombre</span>
          <input name="name" required autoComplete="name" className={input} />
        </label>
      )}
      <label className="block space-y-1">
        <span className="text-sm">Email</span>
        <input name="email" type="email" required autoComplete="email" className={input} />
      </label>
      <label className="block space-y-1">
        <span className="text-sm">Contraseña</span>
        <input
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          className={input}
        />
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        disabled={pending}
        className="w-full rounded-md bg-stone-900 py-2 text-white hover:bg-stone-700 disabled:opacity-50"
      >
        {pending ? "Un momento…" : mode === "signup" ? "Crear cuenta" : "Entrar"}
      </button>
      <p className="text-center text-sm text-stone-500">
        {mode === "signup" ? (
          <>¿Ya tienes cuenta? <Link href="/entrar" className="underline">Entrar</Link></>
        ) : (
          <>¿No tienes cuenta? <Link href="/registro" className="underline">Crear una</Link></>
        )}
      </p>
    </form>
  );
}
