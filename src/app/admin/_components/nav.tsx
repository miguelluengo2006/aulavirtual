"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut, useSession } from "@/lib/auth-client";

const icons = {
  home: <path d="M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z" />,
  courses: (
    <>
      <path d="M4 5h16v12H4z" />
      <path d="m10 9 5 2.5-5 2.5z" />
      <path d="M8 21h8" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
      <path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3.5 6" />
    </>
  ),
  activity: <path d="M3 12h4l3 7 4-14 3 7h4" />,
};

const items = [
  { href: "/admin", label: "Resumen", icon: icons.home, exact: true },
  { href: "/admin/cursos", label: "Cursos", icon: icons.courses },
  { href: "/admin/usuarios", label: "Usuarios", icon: icons.users },
  { href: "/admin/actividad", label: "Actividad", icon: icons.activity },
];

function Icon({ children }: { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" className="size-[18px] shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {children}
    </svg>
  );
}

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data } = useSession();

  return (
    <aside className="sticky top-0 z-30 flex flex-col bg-[#061430] text-white lg:h-screen">
      <div className="flex items-center justify-between gap-3 px-4 py-3 lg:block lg:px-6 lg:pb-6 lg:pt-7">
        <Link href="/admin" className="flex items-center gap-2.5">
          <span aria-hidden className="grid size-8 place-items-center rounded-lg bg-white text-sm font-semibold text-[#061430]">
            I
          </span>
          <span className="leading-tight">
            <span className="block text-sm font-semibold tracking-wide">IDESIE AV</span>
            <span className="block text-xs text-white/55">Administración</span>
          </span>
        </Link>
        <Link href="/" className="rounded-lg px-3 py-1.5 text-xs text-white/70 hover:bg-white/10 hover:text-white lg:hidden">
          Ver la web
        </Link>
      </div>

      <nav aria-label="Panel de administración" className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-1 lg:flex-col lg:px-3 lg:pb-0">
        {items.map((i) => {
          const active = i.exact ? pathname === i.href : pathname.startsWith(i.href);
          return (
            <Link
              key={i.href}
              href={i.href}
              aria-current={active ? "page" : undefined}
              className={`flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                active ? "bg-white/12 font-medium text-white shadow-[inset_3px_0_0_#2dd4bf]" : "text-white/65 hover:bg-white/6 hover:text-white"
              }`}
            >
              <Icon>{i.icon}</Icon>
              {i.label}
            </Link>
          );
        })}
      </nav>

      <div className="hidden space-y-1 border-t border-white/10 p-3 lg:block">
        {data?.user && (
          <p className="truncate px-3 pb-2 pt-1 text-xs text-white/55" title={data.user.email}>
            {data.user.email}
          </p>
        )}
        <Link href="/" className="block rounded-xl px-3 py-2 text-sm text-white/65 hover:bg-white/6 hover:text-white">
          Ver la web
        </Link>
        <button
          type="button"
          onClick={async () => {
            await signOut();
            router.push("/");
          }}
          className="block w-full rounded-xl px-3 py-2 text-left text-sm text-white/65 hover:bg-white/6 hover:text-white"
        >
          Salir
        </button>
      </div>
    </aside>
  );
}
