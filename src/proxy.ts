import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Comprobación optimista: si no hay cookie de sesión, redirige a /entrar.
 * NO es la autorización real: cada página y server action vuelve a
 * comprobar la sesión y el rol en el servidor (src/lib/session.ts).
 */
export function proxy(request: NextRequest) {
  if (!getSessionCookie(request)) {
    const url = new URL("/entrar", request.url);
    url.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/profesor/:path*", "/mis-cursos/:path*"],
};
