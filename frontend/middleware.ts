import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Route-level auth gate. The FastAPI backend is the real security boundary
// (it validates the signed httponly session and enforces admin), but this
// middleware redirects unauthenticated visitors away from sensitive pages
// before they render — no flash of protected content.
const SESSION_COOKIE = "semvex_session";
const PROTECTED_PREFIXES = ["/admin", "/account", "/search"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isProtected = PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
  if (!isProtected) return NextResponse.next();

  // Only checks presence — validity/admin is enforced by the backend.
  if (req.cookies.has(SESSION_COOKIE)) return NextResponse.next();

  const signin = new URL("/signin", req.url);
  signin.searchParams.set("next", pathname);
  return NextResponse.redirect(signin);
}

export const config = {
  matcher: [
    "/admin",
    "/admin/:path*",
    "/account",
    "/account/:path*",
    "/search",
    "/search/:path*",
  ],
};
