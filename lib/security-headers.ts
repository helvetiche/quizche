/**
 * Security headers utility for consistent security headers across all API routes
 */

import { env } from "./env";

export type SecurityHeadersOptions = {
  /**
   * Whether to include CORS headers
   */
  includeCORS?: boolean;
  /**
   * Custom cache control header
   */
  cacheControl?: string;
  /**
   * Rate limit headers to include
   */
  rateLimitHeaders?: Record<string, string>;
  /**
   * Additional custom headers
   */
  additionalHeaders?: Record<string, string>;
};

/**
 * Get comprehensive security headers for API responses
 */
export const getSecurityHeaders = (
  options: SecurityHeadersOptions = {}
): Record<string, string> => {
  const {
    includeCORS = false,
    cacheControl = "no-store, no-cache, must-revalidate, proxy-revalidate",
    rateLimitHeaders = {},
    additionalHeaders = {},
  } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json; charset=utf-8",

    "X-Content-Type-Options": "nosniff",
    "X-XSS-Protection": "1; mode=block",
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
    "Content-Security-Policy":
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.googleapis.com https://apis.google.com https://*.gstatic.com https://*.firebaseapp.com; " +
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
      "img-src 'self' data: https:; " +
      "font-src 'self' data: https://fonts.gstatic.com https://r2cdn.perplexity.ai; " +
      "connect-src 'self' https://*.firebaseio.com https://*.googleapis.com https://*.google.com https://*.ibb.co https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://accounts.google.com wss://*.firebaseio.com; " +
      "frame-src 'self' https://*.google.com https://*.googleapis.com https://accounts.google.com https://*.firebaseapp.com; " +
      "frame-ancestors 'none';",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy":
      "geolocation=(), microphone=(), camera=(), payment=(), usb=()",

    "Cache-Control": cacheControl,
    Vary: "Accept, Authorization",
  };

  if (includeCORS) {
    const appUrl = env.NEXT_PUBLIC_APP_URL;
    headers["Access-Control-Allow-Origin"] = appUrl;
    headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS";
    headers["Access-Control-Allow-Headers"] =
      "Content-Type, Authorization, X-CSRF-Token";
    headers["Access-Control-Max-Age"] = "86400";
  }

  Object.assign(headers, rateLimitHeaders);
  Object.assign(headers, additionalHeaders);

  return headers;
};

/**
 * Get security headers for public/cacheable responses
 * Excludes Content-Type to allow Next.js to set it appropriately (HTML, JSON, etc.)
 * Uses more permissive CSP for Firebase OAuth and client-side functionality
 */
export const getPublicSecurityHeaders = (
  options: SecurityHeadersOptions = {}
): Record<string, string> => {
  const {
    cacheControl = "public, max-age=3600, stale-while-revalidate=86400",
    rateLimitHeaders = {},
    additionalHeaders = {},
  } = options;

  const _appUrl = env.NEXT_PUBLIC_APP_URL;

  const headers: Record<string, string> = {
    // Security Headers (Content-Type excluded for HTML pages)
    "X-Content-Type-Options": "nosniff",
    // X-Frame-Options removed to allow Firebase OAuth popups
    // CSP frame-ancestors handles frame protection
    "X-XSS-Protection": "1; mode=block",
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
    // More permissive CSP for client-side Firebase OAuth and Google services
    "Content-Security-Policy":
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.googleapis.com https://apis.google.com https://*.gstatic.com https://*.firebaseapp.com https://www.gstatic.com; " +
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
      "img-src 'self' data: https: blob:; " +
      "font-src 'self' data: https://fonts.gstatic.com https://r2cdn.perplexity.ai; " +
      "connect-src 'self' https://*.firebaseio.com https://*.googleapis.com https://*.google.com https://*.ibb.co https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://accounts.google.com wss://*.firebaseio.com; " +
      "frame-src 'self' https://*.google.com https://*.googleapis.com https://accounts.google.com https://*.firebaseapp.com; " +
      "frame-ancestors 'none'; " +
      "object-src 'none'; " +
      "base-uri 'self';",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy":
      "geolocation=(), microphone=(), camera=(), payment=(), usb=()",

    // Caching Headers
    "Cache-Control": cacheControl,
    Vary: "Accept, Authorization",
  };

  // Add rate limit headers
  Object.assign(headers, rateLimitHeaders);

  // Add additional custom headers
  Object.assign(headers, additionalHeaders);

  return headers;
};

/**
 * Get security headers for error responses
 */
export const getErrorSecurityHeaders = (
  options: SecurityHeadersOptions = {}
): Record<string, string> => {
  return getSecurityHeaders({
    ...options,
    cacheControl: "no-store, no-cache, must-revalidate",
  });
};
