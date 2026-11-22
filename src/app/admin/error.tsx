"use client";

import { useEffect } from "react";

export default function AdminError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="a-card mx-auto mt-10 max-w-md space-y-4 p-8 text-center">
      <h1 className="text-xl font-semibold">No se ha podido cargar esta sección</h1>
      <p className="text-sm a-muted">Suele ser algo pasajero. No se ha perdido ningún cambio guardado.</p>
      <button className="a-btn a-btn-primary" onClick={() => retry()}>Volver a intentarlo</button>
    </div>
  );
}
