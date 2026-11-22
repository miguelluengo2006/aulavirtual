"use client";

// Último recurso: si falla el propio layout raíz. No puede depender de los estilos de la web.
export default function GlobalError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <html lang="es">
      <body style={{ margin: 0, minHeight: "100vh", display: "grid", placeItems: "center", background: "#061430", color: "#fff", fontFamily: "system-ui, sans-serif", padding: 24 }}>
        <div style={{ maxWidth: 420, textAlign: "center" }}>
          <h1 style={{ fontSize: 24, fontWeight: 600 }}>Algo ha fallado</h1>
          <p style={{ color: "#b6c4e0", lineHeight: 1.6 }}>Suele ser algo pasajero. Vuelve a intentarlo en unos segundos.</p>
          <button onClick={() => retry()} style={{ marginTop: 12, padding: "12px 24px", borderRadius: 999, border: 0, background: "#fff", color: "#061430", fontWeight: 600, cursor: "pointer" }}>
            Volver a intentarlo
          </button>
        </div>
      </body>
    </html>
  );
}
