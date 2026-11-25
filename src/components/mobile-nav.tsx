"use client";

import Link from "next/link";
import { useRef } from "react";

const links = [
  { href: "/cursos", label: "Cursos" },
  { href: "/como-funciona", label: "Cómo funciona" },
  { href: "/sobre-nosotros", label: "Sobre nosotros" },
];

/** Menú de la web pública en móvil. Se cierra al elegir una página. */
export function MobileNav() {
  const ref = useRef<HTMLDetailsElement>(null);
  const close = () => ref.current?.removeAttribute("open");
  return (
    <details ref={ref} className="group relative md:hidden">
      <summary
        aria-label="Menú"
        className="grid size-9 cursor-pointer list-none place-items-center rounded-full text-muted hover:bg-white/10 hover:text-white [&::-webkit-details-marker]:hidden"
      >
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
          <path d="M4 7h16M4 12h16M4 17h16" className="group-open:hidden" />
          <path d="M6 6l12 12M18 6 6 18" className="hidden group-open:block" />
        </svg>
      </summary>
      <nav
        aria-label="Secciones"
        className="absolute left-1/2 top-12 z-50 flex w-56 -translate-x-1/2 flex-col gap-1 rounded-3xl border border-white/12 p-2 text-sm shadow-2xl shadow-black/60"
        // Fondo opaco: el texto de la página no debe verse a través del menú.
        style={{ backgroundColor: "rgb(6 20 48)" }}
      >
        {links.map((l) => (
          <Link key={l.href} href={l.href} onClick={close} className="rounded-2xl px-4 py-2.5 hover:bg-white/10">
            {l.label}
          </Link>
        ))}
      </nav>
    </details>
  );
}
