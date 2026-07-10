import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";

const PROTECTED_PREFIXES = ["/dashboard"];
const AUTH_ONLY_PREFIXES = ["/login", "/register"];

/**
 * Root Next.js middleware.
 * Refreshes the Supabase session on every request and enforces route access:
 * - Unauthenticated users are redirected away from protected routes to /login.
 * - Authenticated users are redirected away from /login and /register to /dashboard.
 * - '/' redirects to /dashboard or /login depending on auth state.
 * API routes are never redirected — they return their own JSON error responses.
 */
export async function middleware(request: NextRequest) {
  const { response, user } = await updateSession(request);
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api/")) {
    return response;
  }

  const redirectTo = (path: string) => {
    const redirectResponse = NextResponse.redirect(new URL(path, request.url));
    // Carry over any refreshed session cookies so the browser doesn't get
    // stranded on a stale session right when it's being navigated away.
    response.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie);
    });
    return redirectResponse;
  };

  if (pathname === "/") {
    return redirectTo(user ? "/dashboard" : "/login");
  }

  if (PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix)) && !user) {
    return redirectTo("/login");
  }

  if (AUTH_ONLY_PREFIXES.some((prefix) => pathname.startsWith(prefix)) && user) {
    return redirectTo("/dashboard");
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - _next/static  (static files)
     * - _next/image   (image optimisation)
     * - favicon.ico   (favicon)
     * - Public asset paths (svg, png, jpg, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
