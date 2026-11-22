import Link from "next/link";
import { Suspense } from "react";
import { UserMenu } from "@/components/user-menu";

// Estructura de la web pública: cabecera, contenido y pie.
// El panel de administración (/admin) tiene la suya propia.
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
        <header className="sticky top-0 z-40 px-4 pt-4">
          <div className="glass mx-auto flex h-14 max-w-6xl items-center justify-between rounded-full bg-navy/80 px-3 pl-5">
            <Link href="/" className="flex items-center gap-2.5 font-semibold tracking-tight">
              <span
                aria-hidden
                className="grid size-7 place-items-center rounded-full bg-white text-sm font-semibold text-navy"
              >
                I
              </span>
              IDESIE AV
            </Link>
            <nav aria-label="Secciones" className="hidden items-center gap-1 text-sm md:flex">
              <Link href="/#cursos" className="btn btn-sm text-muted hover:text-white">Cursos</Link>
              <Link href="/#como-funciona" className="btn btn-sm text-muted hover:text-white">Cómo funciona</Link>
              <Link href="/#precios" className="btn btn-sm text-muted hover:text-white">Precios</Link>
            </nav>
            {/* La sesión se lee en la petición: va detrás de Suspense. */}
            <Suspense fallback={<span className="pr-3 text-sm text-subtle">…</span>}>
              <UserMenu />
            </Suspense>
          </div>
        </header>
        <main id="contenido" className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
          {children}
        </main>
        <footer className="mt-16 border-t border-white/10">
          <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 text-sm sm:grid-cols-[1.5fr_1fr_1fr] sm:px-6">
            <div className="space-y-2">
              <p className="font-semibold">IDESIE AV</p>
              <p className="max-w-xs text-muted">
                Cursos en vídeo con preguntas clave después de cada lección y profesores que
                responden tus dudas.
              </p>
            </div>
            <nav aria-label="Aprender" className="space-y-2">
              <p className="font-medium">Aprender</p>
              <ul className="space-y-1.5 text-muted">
                <li><Link href="/#cursos" className="hover:text-white">Cursos</Link></li>
                <li><Link href="/#como-funciona" className="hover:text-white">Cómo funciona</Link></li>
                <li><Link href="/#precios" className="hover:text-white">Precios</Link></li>
                <li><Link href="/#preguntas" className="hover:text-white">Preguntas frecuentes</Link></li>
              </ul>
            </nav>
            <nav aria-label="Tu cuenta" className="space-y-2">
              <p className="font-medium">Tu cuenta</p>
              <ul className="space-y-1.5 text-muted">
                <li><Link href="/mis-cursos" className="hover:text-white">Mis cursos</Link></li>
                <li><Link href="/entrar" className="hover:text-white">Entrar</Link></li>
                <li><Link href="/registro" className="hover:text-white">Crear cuenta</Link></li>
              </ul>
            </nav>
          </div>
          <p className="mx-auto max-w-6xl px-4 pb-8 text-xs text-subtle sm:px-6">
            © IDESIE AV
          </p>
        </footer>
    </>
  );
}
