import { NextResponse, type NextRequest } from "next/server";

/**
 * Optimistic auth gate. Renamed from `middleware.ts` in Next 16.
 *
 * This only checks whether a session cookie is present — it never decodes or
 * trusts it. Real verification happens in `lib/session.ts`, which every
 * protected page and action calls. Keeping it cookie-shallow means no database
 * or crypto work runs on the edge for each request.
 */
const PUBLIC_PATHS = ["/signin", "/forbidden"];

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))) {
    return NextResponse.next();
  }

  // Auth.js names the cookie `__Secure-authjs.session-token` over HTTPS.
  const hasSession =
    request.cookies.has("authjs.session-token") ||
    request.cookies.has("__Secure-authjs.session-token");

  if (!hasSession) {
    const signIn = new URL("/signin", request.url);
    if (pathname !== "/") signIn.searchParams.set("from", `${pathname}${search}`);
    return NextResponse.redirect(signIn);
  }

  return NextResponse.next();
}

export const config = {
  // Everything except Next internals, the auth endpoints, and static files.
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|svg|ico)$).*)"],
};
