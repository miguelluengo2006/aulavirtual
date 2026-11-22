import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { UserMenu } from "@/components/user-menu";
import "@fontsource/poppins/400.css";
import "@fontsource/poppins/500.css";
import "@fontsource/poppins/600.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Aula Virtual",
  description: "Cursos en vídeo con preguntas clave después de cada lección",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <a
          href="#contenido"
          className="btn btn-primary btn-sm absolute left-4 top-4 z-50 -translate-y-20 focus:translate-y-0"
        >
          Saltar al contenido
        </a>
        <header className="sticky top-0 z-40 px-4 pt-4">
          <div className="glass mx-auto flex h-14 max-w-6xl items-center justify-between rounded-full px-3 pl-5">
            <Link href="/" className="flex items-center gap-2.5 font-semibold tracking-tight">
              <span
                aria-hidden
                className="grid size-7 place-items-center rounded-full bg-white text-sm font-semibold text-navy"
              >
                A
              </span>
              Aula Virtual
            </Link>
            {/* La sesión se lee en la petición: va detrás de Suspense. */}
            <Suspense fallback={<span className="pr-3 text-sm text-subtle">…</span>}>
              <UserMenu />
            </Suspense>
          </div>
        </header>
        <main id="contenido" className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
          {children}
        </main>
      </body>
    </html>
  );
}
