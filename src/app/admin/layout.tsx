import type { Metadata } from "next";
import { Suspense } from "react";
import { requireRole } from "@/lib/session";
import { ToastProvider } from "./_components/feedback";
import { AdminNav } from "./_components/nav";

export const metadata: Metadata = {
  title: "Administración | Aula Virtual",
  robots: { index: false, follow: false },
};

// Comprobar la página es solo comodidad: la seguridad real está en cada acción
// (src/lib/admin/action.ts) y en cada consulta de las páginas.
async function AdminGate({ children }: { children: React.ReactNode }) {
  await requireRole(["admin"], "/admin");
  return children;
}

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <ToastProvider>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[200px_minmax(0,1fr)] lg:gap-8">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <Suspense fallback={<div className="glass h-12 lg:h-48" />}>
            <AdminNav />
          </Suspense>
        </aside>
        <div className="min-w-0">
          <Suspense fallback={<p className="text-subtle">Cargando…</p>}>
            <AdminGate>{children}</AdminGate>
          </Suspense>
        </div>
      </div>
    </ToastProvider>
  );
}
