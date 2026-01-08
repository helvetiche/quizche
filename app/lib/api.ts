"use client";

import { getCSRFToken, clearCSRFToken, needsCSRFTokenRefresh } from "./csrf";

export interface ApiRequestOptions extends RequestInit {
  requireCSRF?: boolean; // Default: true for POST, PUT, DELETE, PATCH
  idToken?: string | null;
}

/**
 * Enhanced fetch wrapper that automatically includes CSRF tokens
 * Handles CSRF token refresh on 403 errors
 */
export const apiFetch = async (
  url: string,
  options: ApiRequestOptions = {}
): Promise<Response> => {
  const {
    requireCSRF = true,
    idToken,
    method = "GET",
    headers = {},
    ...restOptions
  } = options;

  // Determine if CSRF is needed
  const needsCSRF =
    requireCSRF &&
    (method === "POST" ||
      method === "PUT" ||
      method === "DELETE" ||
      method === "PATCH");

  // Prepare headers
  const requestHeaders: Record<string, string> = {
    ...(headers as Record<string, string>),
  };

  // Add Authorization header if idToken provided
  if (idToken) {
    requestHeaders["Authorization"] = `Bearer ${idToken}`;
  }

  // Add CSRF token if needed
  if (needsCSRF) {
    if (!idToken) {
      // CSRF is needed but no idToken provided
      console.error("CSRF token required but no idToken provided");
      return new Response(
        JSON.stringify({
          error: "Authentication required. Please log in and try again.",
        }),
        {
          status: 401,
          headers: {
            "Content-Type": "application/json; charset=utf-8",
          },
        }
      );
    }

    // Always fetch/refresh token before making request
    let csrfToken = await getCSRFToken(idToken);

    // If token is missing, clear cache and retry once
    if (!csrfToken) {
      clearCSRFToken();
      csrfToken = await getCSRFToken(idToken);
    }

    // For mutating operations, CSRF token is required
    if (!csrfToken) {
      console.error("Failed to fetch CSRF token for mutating operation");
      return new Response(
        JSON.stringify({
          error:
            "Failed to obtain CSRF token. Please refresh the page and try again.",
        }),
        {
          status: 403,
          headers: {
            "Content-Type": "application/json; charset=utf-8",
          },
        }
      );
    }

    // Add CSRF token to headers (ensure it's trimmed and valid length)
    const trimmedToken = csrfToken.trim();
    if (!trimmedToken || trimmedToken.length !== 64) {
      console.error(
        `Invalid CSRF token length: ${trimmedToken?.length || 0}, expected 64`
      );
      return new Response(
        JSON.stringify({
          error:
            "Invalid CSRF token format. Please refresh the page and try again.",
        }),
        {
          status: 403,
          headers: {
            "Content-Type": "application/json; charset=utf-8",
          },
        }
      );
    }
    requestHeaders["X-CSRF-Token"] = trimmedToken;
  }

  // Make the request
  // #region agent log
  fetch("http://127.0.0.1:7244/ingest/0cdefbcf-c0dd-4af8-9322-fa937123a23b", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      location: "api.ts:68",
      message: "apiFetch: making request",
      data: {
        url,
        method,
        hasCsrfHeader: !!requestHeaders["X-CSRF-Token"],
        hasAuthHeader: !!requestHeaders["Authorization"],
        csrfTokenLength: requestHeaders["X-CSRF-Token"]?.length || 0,
      },
      timestamp: Date.now(),
      sessionId: "debug-session",
      runId: "run1",
      hypothesisId: "C",
    }),
  }).catch(() => {});
  // #endregion
  let response = await fetch(url, {
    ...restOptions,
    method,
    headers: requestHeaders,
  });
  // #region agent log
  fetch("http://127.0.0.1:7244/ingest/0cdefbcf-c0dd-4af8-9322-fa937123a23b", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      location: "api.ts:75",
      message: "apiFetch: response received",
      data: { status: response.status, ok: response.ok },
      timestamp: Date.now(),
      sessionId: "debug-session",
      runId: "run1",
      hypothesisId: "D",
    }),
  }).catch(() => {});
  // #endregion

  // Handle CSRF token expiration (403 error)
  if (response.status === 403 && needsCSRF && idToken) {
    const errorData = await response.json().catch(() => ({}));

    // Check if it's a CSRF error
    if (
      errorData.error?.includes("CSRF") ||
      errorData.error?.includes("csrf") ||
      errorData.error?.includes("Invalid or missing CSRF token")
    ) {
      // Clear old token and fetch new one
      clearCSRFToken();
      const newToken = await getCSRFToken(idToken);

      if (newToken) {
        // Retry request with new token
        const retryHeaders: Record<string, string> = {
          ...requestHeaders,
          "X-CSRF-Token": newToken,
        };
        response = await fetch(url, {
          ...restOptions,
          method,
          headers: retryHeaders,
        });
      }
    }
  }

  return response;
};

/**
 * Convenience methods for common HTTP methods
 */
export const apiGet = (url: string, options?: ApiRequestOptions) =>
  apiFetch(url, { ...options, method: "GET", requireCSRF: false });

export const apiPost = (url: string, options?: ApiRequestOptions) =>
  apiFetch(url, { ...options, method: "POST" });

export const apiPut = (url: string, options?: ApiRequestOptions) =>
  apiFetch(url, { ...options, method: "PUT" });

export const apiDelete = (url: string, options?: ApiRequestOptions) =>
  apiFetch(url, { ...options, method: "DELETE" });

export const apiPatch = (url: string, options?: ApiRequestOptions) =>
  apiFetch(url, { ...options, method: "PATCH" });
