import Link from "next/link";

export const roleLabel = { admin: "Administrador", teacher: "Profesor", student: "Alumno" } as const;
export const statusLabel = { draft: "Borrador", published: "Publicado", archived: "Archivado" } as const;

export function StatusChip({ status }: { status: keyof typeof statusLabel }) {
  const cls = status === "published" ? "chip-accent" : status === "draft" ? "chip-warning" : "";
  return <span className={`chip ${cls}`}>{statusLabel[status]}</span>;
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
    <header className="space-y-3">
      {back && (
        <Link href={back.href} className="text-sm text-muted hover:text-white">
          {back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <h1 className="text-3xl sm:text-4xl">{title}</h1>
          {description && <div className="text-muted">{description}</div>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </header>
  );
}

export function Section({
  title,
  description,
  children,
  id,
}: {
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
  id?: string;
}) {
  return (
    <section id={id} className="glass scroll-mt-24 space-y-5 p-5 sm:p-7">
      <div className="space-y-1">
        <h2 className="text-xl">{title}</h2>
        {description && <p className="text-sm text-muted">{description}</p>}
      </div>
      {children}
    </section>
  );
}

const dateFmt = new Intl.DateTimeFormat("es-ES", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Madrid" });
export const formatDateTime = (d: Date) => dateFmt.format(d);

const dayFmt = new Intl.DateTimeFormat("es-ES", { dateStyle: "medium", timeZone: "Europe/Madrid" });
export const formatDate = (d: Date) => dayFmt.format(d);

export function Pagination({ page, pages, href }: { page: number; pages: number; href: (p: number) => string }) {
  if (pages <= 1) return null;
  return (
    <nav aria-label="Páginas" className="flex items-center justify-between gap-3 text-sm">
      {page > 1 ? (
        <Link href={href(page - 1)} className="btn btn-ghost btn-sm">
          Anterior
        </Link>
      ) : (
        <span />
      )}
      <span className="text-muted">
        Página {page} de {pages}
      </span>
      {page < pages ? (
        <Link href={href(page + 1)} className="btn btn-ghost btn-sm">
          Siguiente
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
