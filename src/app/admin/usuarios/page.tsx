import Link from "next/link";
import { Suspense } from "react";
import { listCourseOptions, listUsers } from "@/lib/admin/queries";
import { InviteButton, RoleSelect } from "../_components/user-controls";
import { Card, EmptyState, FilterPills, formatDate, PageHeader, Pagination } from "../_components/ui";

export default function UsersPage({ searchParams }: PageProps<"/admin/usuarios">) {
  return (
    <Suspense fallback={<p className="a-subtle">Cargando…</p>}>
      <Users searchParams={searchParams} />
    </Suspense>
  );
}

async function Users({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const q = one(sp.q) ?? "";
  const filter = one(sp.filtro);
  const role = filter === "admin" || filter === "teacher" || filter === "student" ? filter : undefined;
  const banned = filter === "bloqueados";
  const page = Number(one(sp.pagina)) || 1;
  const [{ rows, total, pages, meId }, courseOptions] = await Promise.all([
    listUsers({ q, role, banned, page }),
    listCourseOptions(),
  ]);

  const href = (p: { q?: string; filtro?: string; pagina?: number }) => {
    const s = new URLSearchParams();
    if (p.q) s.set("q", p.q);
    if (p.filtro) s.set("filtro", p.filtro);
    if (p.pagina && p.pagina > 1) s.set("pagina", String(p.pagina));
    const str = s.toString();
    return `/admin/usuarios${str ? `?${str}` : ""}`;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Usuarios"
        description="Cambia el rol de cualquiera directamente en la lista, invita a personas nuevas o abre su ficha."
        actions={<InviteButton courses={courseOptions.filter((c) => c.status !== "archived").map(({ id, title }) => ({ id, title }))} />}
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <FilterPills
          active={filter}
          items={[
            { label: "Todos", href: href({ q }) },
            { label: "Alumnos", href: href({ q, filtro: "student" }), key: "student" },
            { label: "Profesores", href: href({ q, filtro: "teacher" }), key: "teacher" },
            { label: "Administradores", href: href({ q, filtro: "admin" }), key: "admin" },
            { label: "Bloqueados", href: href({ q, filtro: "bloqueados" }), key: "bloqueados" },
          ]}
        />
        <form className="flex gap-2" action="/admin/usuarios">
          {filter && <input type="hidden" name="filtro" value={filter} />}
          <label className="sr-only" htmlFor="buscar">Buscar por nombre o email</label>
          <input id="buscar" name="q" defaultValue={q} placeholder="Buscar por nombre o email" className="a-input lg:w-72" maxLength={100} />
          <button className="a-btn a-btn-secondary">Buscar</button>
        </form>
      </div>

      <Card padded={false}>
        {rows.length === 0 ? (
          <EmptyState title="No hay usuarios con estos filtros" text={q ? "Prueba con otra búsqueda." : undefined} />
        ) : (
          <div className="relative overflow-x-auto">
            <table className="a-table sm:min-w-[720px]">
              <thead>
                <tr>
                  <th>Persona</th>
                  <th>Rol</th>
                  <th className="max-sm:hidden">Estado</th>
                  <th className="max-sm:hidden">Alta</th>
                  <th className="max-sm:hidden"><span className="sr-only">Ficha</span></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div className="flex min-w-0 items-center gap-3">
                        <span aria-hidden className="grid size-9 max-sm:hidden shrink-0 place-items-center rounded-full bg-[#e7eefb] text-sm font-medium text-[#1e40af]">
                          {u.name.slice(0, 1).toUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <Link href={`/admin/usuarios/${u.id}`} className="font-medium hover:underline">{u.name}</Link>
                          <p className="truncate text-xs a-subtle max-sm:max-w-[40vw]">{u.email}</p>
                          {u.banned && <span className="a-chip a-chip-red mt-1 sm:hidden">Bloqueado</span>}
                        </div>
                      </div>
                    </td>
                    <td>
                      <RoleSelect userId={u.id} email={u.email} role={u.role} disabled={u.id === meId} compact />
                    </td>
                    <td className="max-sm:hidden">
                      {u.banned ? (
                        <span className="a-chip a-chip-red">Bloqueado</span>
                      ) : u.emailVerified ? (
                        <span className="a-chip a-chip-teal">Activo</span>
                      ) : (
                        <span className="a-chip a-chip-amber">Sin confirmar</span>
                      )}
                    </td>
                    <td className="a-muted max-sm:hidden">{formatDate(u.createdAt)}</td>
                    <td className="text-right max-sm:hidden">
                      <Link href={`/admin/usuarios/${u.id}`} className="a-btn a-btn-ghost a-btn-sm">Ver ficha</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm a-muted">{total === 1 ? "1 usuario" : `${total} usuarios`}</p>
        <Pagination page={Math.min(page, pages)} pages={pages} href={(p) => href({ q, filtro: filter, pagina: p })} />
      </div>
    </div>
  );
}
