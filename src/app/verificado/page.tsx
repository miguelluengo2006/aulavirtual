import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ResendVerification } from "@/components/auth/resend-verification";
import { linkErrorMessage } from "@/lib/auth-errors";
import { safeNext } from "@/lib/safe-next";
import { getCurrentUser } from "@/lib/session";

export const metadata: Metadata = { title: "Confirmar email | Aula Virtual" };

// Aquí llega quien abre el enlace del email de confirmación.
export default function VerificadoPage({ searchParams }: PageProps<"/verificado">) {
  return (
    <Suspense>
      <Verified searchParams={searchParams} />
    </Suspense>
  );
}

async function Verified({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const next = safeNext(first(params.next));
  const error = linkErrorMessage(first(params.error));
  const user = await getCurrentUser();

  return (
    <div className="mx-auto mt-4 w-full max-w-md">
      <div className="glass space-y-6 p-7 sm:p-10">
        {error ? (
          <>
            <div className="space-y-2">
              <h1 className="text-3xl">No hemos podido confirmar tu email</h1>
              <p className="text-muted">{error} Escribe tu email y te mandamos otro.</p>
            </div>
            <ResendVerification callbackURL={`/verificado?next=${encodeURIComponent(next)}`} />
          </>
        ) : (
          <>
            <span className="grid size-12 place-items-center rounded-full bg-accent text-xl text-navy" aria-hidden>
              ✓
            </span>
            <div className="space-y-2">
              <h1 className="text-3xl">Email confirmado</h1>
              <p className="text-muted">
                {user ? `Bienvenido, ${user.name}. Tu cuenta ya está activa.` : "Tu cuenta ya está activa. Entra para empezar."}
              </p>
            </div>
            <Link href={user ? next : `/entrar?next=${encodeURIComponent(next)}`} className="btn btn-primary w-full">
              {user ? "Empezar" : "Entrar"}
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
