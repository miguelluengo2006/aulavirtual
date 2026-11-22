// Ruta a la que volver tras entrar. Solo se aceptan rutas internas,
// para que nadie pueda usar un enlace de la web para mandar a otro sitio.

export const DEFAULT_AFTER_SIGN_IN = "/mis-cursos";

export function safeNext(next: string | null | undefined, fallback = DEFAULT_AFTER_SIGN_IN): string {
  if (!next) return fallback;
  if (!next.startsWith("/")) return fallback;
  // "//otro.com" y "/\otro.com" los navegadores los tratan como otro dominio.
  if (next.startsWith("//") || next.startsWith("/\\")) return fallback;
  if (/[\u0000-\u001f\u007f]/.test(next)) return fallback;
  // No volver a las propias páginas de acceso.
  if (/^\/(entrar|registro)(\/|\?|$)/.test(next)) return fallback;
  return next;
}
