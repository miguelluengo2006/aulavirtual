import type { NextConfig } from "next";

// Política de contenido: el navegador solo carga código, estilos y conexiones de
// la propia web. Si alguien lograse colar HTML en una página (un mensaje del foro,
// un nombre), no podría cargar scripts de fuera ni enviar datos a otro servidor.
// Los vídeos salen de R2 (URLs firmadas) y hls.js los procesa como blob:.
const r2Origins = ["https://*.r2.cloudflarestorage.com"];
if (process.env.R2_ENDPOINT) {
  try {
    r2Origins.push(new URL(process.env.R2_ENDPOINT).origin);
  } catch {
    // R2_ENDPOINT mal escrito: se ignora aquí; fallará al usar R2 con un error claro.
  }
}
const isDev = process.env.NODE_ENV !== "production";
const csp = [
  "default-src 'self'",
  // Next necesita scripts en línea para hidratar la página (y eval solo en desarrollo).
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  `media-src 'self' blob: ${r2Origins.join(" ")}`,
  `connect-src 'self' ${r2Origins.join(" ")}${isDev ? " ws:" : ""}`,
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

// Cabeceras de seguridad para toda la web.
const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  // Nadie puede meter la web en un iframe (evita clickjacking).
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  // Solo HTTPS durante 2 años (los navegadores lo ignoran en http://localhost).
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      {
        // El panel nunca se guarda en cachés intermedias ni lo indexan los buscadores.
        source: "/admin/:path*",
        headers: [
          { key: "Cache-Control", value: "private, no-store, max-age=0" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
      {
        source: "/admin",
        headers: [
          { key: "Cache-Control", value: "private, no-store, max-age=0" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
    ];
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
