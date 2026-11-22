import Link from "next/link";

export const roleLabel = { admin: "Administrador", teacher: "Profesor", student: "Alumno" } as const;
export const statusLabel = { draft: "Borrador", published: "Publicado", archived: "Archivado" } as const;

export function StatusChip({ status }: { status: keyof typeof statusLabel }) {
  const cls = status === "published" ? "a-chip-teal" : status === "draft" ? "a-chip-amber" : "";
  return <span className={`a-chip ${cls}`}>{statusLabel[status]}</span>;
}

export function RoleChip({ role }: { role: keyof typeof roleLabel }) {
  const cls = role === "admin" ? "a-chip-blue" : role === "teacher" ? "a-chip-teal" : "";
  return <span className={`a-chip ${cls}`}>{roleLabel[role]}</span>;
}

export function PageHeader({
  title,
  description,
  back,
  actions,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  back?: { href: string; label: string };
  actions?: React.ReactNode;
}) {
  return (
    <header className="space-y-2">
      {back && (
        <Link href={back.href} className="inline-flex items-center gap-1 text-sm text-[#52617a] hover:text-[#0f1b33]">
          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="m15 6-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
          {description && <div className="a-muted">{description}</div>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </header>
  );
}

export function Card({
  title,
  description,
  actions,
  children,
  id,
  padded = true,
}: {
  title?: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  id?: string;
  padded?: boolean;
}) {
  return (
    <section id={id} className="a-card scroll-mt-24">
      {(title || actions) && (
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#e1e7f0] px-5 py-4 sm:px-6">
          <div className="space-y-0.5">
            {title && <h2 className="text-base font-semibold tracking-tight">{title}</h2>}
            {description && <p className="text-sm a-muted">{description}</p>}
          </div>
          {actions}
        </div>
      )}
      <div className={padded ? "p-5 sm:p-6" : ""}>{children}</div>
    </section>
  );
}

export function EmptyState({ title, text, action }: { title: string; text?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
      <p className="font-medium">{title}</p>
      {text && <p className="max-w-md text-sm a-muted">{text}</p>}
      {action && <div className="pt-2">{action}</div>}
    </div>
  );
}

const dateFmt = new Intl.DateTimeFormat("es-ES", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Madrid" });
export const formatDateTime = (d: Date) => dateFmt.format(d);

const dayFmt = new Intl.DateTimeFormat("es-ES", { dateStyle: "medium", timeZone: "Europe/Madrid" });
export const formatDate = (d: Date) => dayFmt.format(d);

export function Tabs({ items, active }: { items: { href: string; label: string; key: string; count?: number }[]; active: string }) {
  return (
    <nav aria-label="Secciones" className="flex gap-1 overflow-x-auto border-b border-[#e1e7f0]">
      {items.map((t) => {
        const on = t.key === active;
        return (
          <Link
            key={t.key}
            href={t.href}
            aria-current={on ? "page" : undefined}
            className={`-mb-px flex shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-sm transition-colors ${
              on ? "border-[#1d4ed8] font-medium text-[#0f1b33]" : "border-transparent text-[#52617a] hover:text-[#0f1b33]"
            }`}
          >
            {t.label}
            {t.count !== undefined && (
              <span className={`rounded-full px-1.5 text-xs ${on ? "bg-[#dbeafe] text-[#1e40af]" : "bg-[#eef2f7] text-[#52617a]"}`}>{t.count}</span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

export function FilterPills({ items, active }: { items: { href: string; label: string; key?: string }[]; active?: string }) {
  return (
    <nav aria-label="Filtros" className="flex flex-wrap gap-1 rounded-xl bg-[#e8edf5] p-1">
      {items.map((f) => {
        const on = f.key === active;
        return (
          <Link
            key={f.label}
            href={f.href}
            aria-current={on ? "page" : undefined}
            className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${on ? "bg-white font-medium text-[#0f1b33] shadow-sm" : "text-[#52617a] hover:text-[#0f1b33]"}`}
          >
            {f.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function Pagination({ page, pages, href }: { page: number; pages: number; href: (p: number) => string }) {
  if (pages <= 1) return null;
  return (
    <nav aria-label="Páginas" className="flex items-center justify-between gap-3 text-sm">
      {page > 1 ? <Link href={href(page - 1)} className="a-btn a-btn-secondary a-btn-sm">Anterior</Link> : <span />}
      <span className="a-muted">Página {page} de {pages}</span>
      {page < pages ? <Link href={href(page + 1)} className="a-btn a-btn-secondary a-btn-sm">Siguiente</Link> : <span />}
    </nav>
  );
}
