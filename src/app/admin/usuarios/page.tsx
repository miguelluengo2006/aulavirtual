import Link from "next/link";
import { Suspense } from "react";
import { listUsers } from "@/lib/admin/queries";
import { formatDate, PageHeader, Pagination, roleLabel } from "../_components/ui";

export default function UsersPage({ searchParams }: PageProps<"/admin/usuarios">) {
  return (
    <div className="space-y-6">
      <PageHeader title="Usuarios" description="Busca a cualquier persona, mira sus cursos y cambia su rol." />
      <Suspense fallback={<p className="text-subtle">Cargando…</p>}>
        <Users searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

const roles = [
  { value: undefined, label: "Todos" },
  { value: "student", label: "Alumnos" },
  { value: "teacher", label: "Profesores" },
  { value: "admin", label: "Administradores" },
] as const;

async function Users({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const q = one(sp.q) ?? "";
  const rawRole = one(sp.rol);
  const role = rawRole === "admin" || rawRole === "teacher" || rawRole === "student" ? rawRole : undefined;
  const page = Number(one(sp.pagina)) || 1;
  const { rows, total, pages } = await listUsers({ q, role, page });

  const href = (p: { q?: string; rol?: string; pagina?: number }) => {
    const s = new URLSearchParams();
    if (p.q) s.set("q", p.q);
    if (p.rol) s.set("rol", p.rol);
    if (p.pagina && p.pagina > 1) s.set("pagina", String(p.pagina));
    const str = s.toString();
    return `/admin/usuarios${str ? `?${str}` : ""}`;
  };

  return (
    <div className="space-y-4">
      <form className="flex flex-col gap-2 sm:flex-row" action="/admin/usuarios">
        {role && <input type="hidden" name="rol" value={role} />}
        <label className="sr-only" htmlFor="buscar">Buscar por nombre o email</label>
        <input id="buscar" name="q" defaultValue={q} placeholder="Buscar por nombre o email" className="field" maxLength={100} />
        <button className="btn btn-ghost shrink-0">Buscar</button>
      </form>
      <nav aria-label="Filtrar por rol" className="flex flex-wrap gap-2">
        {roles.map((r) => (
          <Link
            key={r.label}
            href={href({ q, rol: r.value })}
            aria-current={role === r.value ? "page" : undefined}
            className={`btn btn-sm ${role === r.value ? "btn-primary" : "btn-ghost"}`}
          >
            {r.label}
          </Link>
        ))}
      </nav>
      <p className="text-sm text-muted">{total === 1 ? "1 usuario" : `${total} usuarios`}</p>

      {rows.length === 0 ? (
        <div className="glass p-8 text-muted">No hay usuarios que coincidan con la búsqueda.</div>
      ) : (
        <div className="glass overflow-x-auto p-2">
          <table className="w-full min-w-[600px] text-sm">
            <thead className="text-left text-subtle">
              <tr>
                <th className="px-4 py-3 font-normal">Nombre</th>
                <th className="px-4 py-3 font-normal">Rol</th>
                <th className="px-4 py-3 font-normal">Email</th>
                <th className="px-4 py-3 font-normal">Alta</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((u) => (
                <tr key={u.id} className="border-t border-white/8">
                  <td className="px-4 py-3">
                    <Link href={`/admin/usuarios/${u.id}`} className="font-medium hover:underline">{u.name}</Link>
                    <div className="text-xs text-subtle">{u.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`chip ${u.role === "admin" ? "chip-warning" : u.role === "teacher" ? "chip-accent" : ""}`}>{roleLabel[u.role]}</span>
                  </td>
                  <td className="px-4 py-3 text-muted">{u.emailVerified ? "Confirmado" : "Sin confirmar"}</td>
                  <td className="px-4 py-3 text-muted">{formatDate(u.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination page={Math.min(page, pages)} pages={pages} href={(p) => href({ q, rol: role, pagina: p })} />
    </div>
  );
}
