"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/admin", label: "Resumen", exact: true },
  { href: "/admin/cursos", label: "Cursos" },
  { href: "/admin/usuarios", label: "Usuarios" },
  { href: "/admin/actividad", label: "Actividad" },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Panel de administración" className="glass flex gap-1 overflow-x-auto p-1.5 lg:flex-col lg:p-2">
      {items.map((i) => {
        const active = i.exact ? pathname === i.href : pathname.startsWith(i.href);
        return (
          <Link
            key={i.href}
            href={i.href}
            aria-current={active ? "page" : undefined}
            className={`whitespace-nowrap rounded-2xl px-4 py-2 text-sm transition-colors ${active ? "bg-white font-medium text-navy" : "text-muted hover:bg-white/8 hover:text-white"}`}
          >
            {i.label}
          </Link>
        );
      })}
    </nav>
  );
}
