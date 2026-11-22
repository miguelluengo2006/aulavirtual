import type { Metadata } from "next";
import { Suspense } from "react";
import { requireRole } from "@/lib/session";
import { ToastProvider } from "./_components/feedback";
import { AdminSidebar } from "./_components/nav";

export const metadata: Metadata = {
  title: "Administración",
  robots: { index: false, follow: false },
};

// Comprobar la página es solo comodidad: la seguridad real está en cada acción
// (src/lib/admin/action.ts) y en cada consulta de las páginas (src/lib/admin/queries.ts).
async function AdminGate({ children }: { children: React.ReactNode }) {
  await requireRole(["admin"], "/admin");
  return children;
}

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <ToastProvider>
      <div className="admin-shell min-h-screen w-full lg:grid lg:grid-cols-[256px_minmax(0,1fr)]">
        <Suspense fallback={<div className="h-16 bg-[#061430] lg:h-screen" />}>
          <AdminSidebar />
        </Suspense>
        <main id="contenido" className="min-w-0 px-4 py-6 sm:px-8 lg:py-10">
          <div className="mx-auto max-w-6xl">
            <Suspense fallback={<p className="a-subtle">Cargando…</p>}>
              <AdminGate>{children}</AdminGate>
            </Suspense>
          </div>
        </main>
      </div>
    </ToastProvider>
  );
}
