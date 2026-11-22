"use client";

import { useEffect } from "react";

// Si algo falla al cargar una página (por ejemplo, la base de datos no responde un momento),
// el alumno ve esto en vez de una pantalla en blanco y puede reintentar.
export default function SiteError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto mt-10 max-w-md">
      <div className="glass space-y-5 p-8 text-center">
        <h1 className="text-2xl">No hemos podido cargar esta página</h1>
        <p className="text-muted">Suele ser algo pasajero. Vuelve a intentarlo; tu progreso está guardado.</p>
        <div className="flex flex-wrap justify-center gap-2">
          <button className="btn btn-primary" onClick={() => retry()}>Volver a intentarlo</button>
          {/* Enlace normal: si falla la navegación de la app, una recarga completa suele arreglarlo. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a className="btn btn-ghost" href="/">Ir al inicio</a>
        </div>
      </div>
    </div>
  );
}
