import Link from "next/link";

export const metadata = { title: "Página no encontrada" };

export default function NotFound() {
  return (
    <main id="contenido" className="mx-auto flex w-full max-w-md flex-1 items-center px-4 py-16">
      <div className="glass w-full space-y-5 p-8 text-center">
        <h1 className="text-2xl">Esta página no existe</h1>
        <p className="text-muted">Puede que el enlace esté mal escrito o que el contenido ya no esté disponible.</p>
        <div className="flex flex-wrap justify-center gap-2">
          <Link className="btn btn-primary" href="/">Ir al inicio</Link>
          <Link className="btn btn-ghost" href="/mis-cursos">Mis cursos</Link>
        </div>
      </div>
    </main>
  );
}
