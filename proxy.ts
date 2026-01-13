/**
 * Next.js Proxy for applying security headers to all routes
 * Automatically applies security headers to API routes and pages
 * 
 * Migrated from middleware.ts to proxy.ts per Next.js 16+ conventions
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getSecurityHeaders,
  getPublicSecurityHeaders,
  getErrorSecurityHeaders,
} from "./lib/security-headers";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip proxy for static assets and Next.js internal routes
  if (
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.match(/\.(svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2|ttf|eot)$/)
  ) {
    return NextResponse.next();
  }

  // Skip proxy for file upload routes to preserve multipart/form-data Content-Type
  if (
    pathname === "/api/quizzes/generate" || 
    pathname === "/api/flashcards/generate" ||
    pathname === "/api/upload/image"
  ) {
    return NextResponse.next();
  }

  // Create response
  const response = NextResponse.next();

  // Apply security headers based on route type
  if (pathname.startsWith("/api/")) {
    // API routes: Use standard security headers
    const headers = getSecurityHeaders();
    Object.entries(headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
  } else {
    // Public pages: Use public security headers (less restrictive CSP for Firebase OAuth)
    // getPublicSecurityHeaders already excludes Content-Type and X-Frame-Options
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
