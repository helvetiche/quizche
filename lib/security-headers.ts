/**
 * Security headers utility for consistent security headers across all API routes
 */

export interface SecurityHeadersOptions {
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
}

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

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "*";

  const headers: Record<string, string> = {
    // Content Type
    "Content-Type": "application/json; charset=utf-8",

    // Security Headers
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "1; mode=block",
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
    "Content-Security-Policy":
      "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://*.firebaseio.com https://*.googleapis.com https://*.ibb.co;",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy":
      "geolocation=(), microphone=(), camera=(), payment=(), usb=()",

    // Caching Headers
    "Cache-Control": cacheControl,
    Vary: "Accept, Authorization",
  };

  // Add CORS headers if needed
  if (includeCORS) {
    headers["Access-Control-Allow-Origin"] = appUrl;
    headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS";
    headers["Access-Control-Allow-Headers"] =
      "Content-Type, Authorization, X-CSRF-Token";
    headers["Access-Control-Max-Age"] = "86400";
  }

  // Add rate limit headers
  Object.assign(headers, rateLimitHeaders);

  // Add additional custom headers
  Object.assign(headers, additionalHeaders);

  return headers;
};

/**
 * Get security headers for public/cacheable responses
 */
export const getPublicSecurityHeaders = (
  options: SecurityHeadersOptions = {}
): Record<string, string> => {
  return getSecurityHeaders({
    ...options,
    cacheControl: "public, max-age=3600, stale-while-revalidate=86400",
  });
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
