/**
 * Next.js Proxy for applying security headers to all routes
 * Automatically applies security headers to API routes and pages
 *
 * Migrated from middleware.ts to proxy.ts per Next.js 16+ conventions
 */

import { type NextRequest, NextResponse } from "next/server";
import {
  getSecurityHeaders,
  getPublicSecurityHeaders,
} from "./lib/security-headers";

export function proxy(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/favicon.ico") ||
    /\.(svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2|ttf|eot)$/.exec(
      pathname
    )
  ) {
    return NextResponse.next();
  }

  if (
    pathname === "/api/quizzes/generate" ||
    pathname === "/api/flashcards/generate" ||
    pathname === "/api/upload/image"
  ) {
    return NextResponse.next();
  }

  const response = NextResponse.next();

  if (pathname.startsWith("/api/")) {
    const headers = getSecurityHeaders();
    Object.entries(headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
  } else {
    const headers = getPublicSecurityHeaders();
    Object.entries(headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
  }

  return response;
}

// Configure which routes the proxy should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)",
  ],
};
