import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/session";

// Optimistická kontrola (jen přítomnost cookie, BEZ DB dotazu).
// Skutečné ověření session probíhá v DAL (getCurrentUser) u dat.
const PUBLIC_PATHS = ["/login", "/registrace", "/pozvanka"];

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hasSession = req.cookies.has(SESSION_COOKIE_NAME);
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  // Nepřihlášený na chráněné cestě → login
  if (!hasSession && !isPublic) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Přihlášený na login → dashboard
  if (hasSession && isPublic) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  // Vynech API, statické soubory a veřejné soubory s příponou
  // (/manifest.webmanifest, /brand-logo.png …) — musí jít i bez přihlášení.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
