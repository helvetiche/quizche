"use client";

import { getCSRFToken, clearCSRFToken, needsCSRFTokenRefresh } from "./csrf";

export type ApiRequestOptions = {
  requireCSRF?: boolean; // Default: true for POST, PUT, DELETE, PATCH
  idToken?: string | null;
} & RequestInit;

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

  // Check if body is FormData - if so, remove Content-Type to let browser set it with boundary
  const isFormData = restOptions.body instanceof FormData;
  console.log(
    "apiFetch - isFormData:",
    isFormData,
    "body type:",
    typeof restOptions.body,
    "body constructor:",
    restOptions.body?.constructor?.name
  );

  if (isFormData) {
    delete requestHeaders["Content-Type"];
    delete requestHeaders["content-type"];
  }

  // Add Authorization header if idToken provided
  if (idToken) {
    requestHeaders.Authorization = `Bearer ${idToken}`;
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
    if (trimmedToken?.length !== 64) {
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
  // For FormData, we need to ensure NO Content-Type header is set so browser adds it with boundary
  const fetchOptions: RequestInit = {
    method,
    body: restOptions.body,
    credentials: restOptions.credentials,
    cache: restOptions.cache,
    redirect: restOptions.redirect,
    referrer: restOptions.referrer,
    referrerPolicy: restOptions.referrerPolicy,
    integrity: restOptions.integrity,
    keepalive: restOptions.keepalive,
    signal: restOptions.signal,
    mode: restOptions.mode,
  };

  // Set headers - for FormData, only include auth headers (no Content-Type)
  if (isFormData) {
    const formDataHeaders: HeadersInit = {};
    if (requestHeaders.Authorization) {
      formDataHeaders.Authorization = requestHeaders.Authorization;
    }
    if (requestHeaders["X-CSRF-Token"]) {
      formDataHeaders["X-CSRF-Token"] = requestHeaders["X-CSRF-Token"];
    }
    console.log("apiFetch - FormData headers being sent:", formDataHeaders);
    fetchOptions.headers = formDataHeaders;
  } else {
    fetchOptions.headers = requestHeaders;
  }

  let response = await fetch(url, fetchOptions);

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
        const retryFetchOptions: RequestInit = {
          method,
          body: restOptions.body,
          credentials: restOptions.credentials,
          cache: restOptions.cache,
          redirect: restOptions.redirect,
          referrer: restOptions.referrer,
          referrerPolicy: restOptions.referrerPolicy,
          integrity: restOptions.integrity,
          keepalive: restOptions.keepalive,
          signal: restOptions.signal,
          mode: restOptions.mode,
        };

        if (isFormData) {
          const retryHeaders: HeadersInit = {};
          if (requestHeaders.Authorization) {
            retryHeaders.Authorization = requestHeaders.Authorization;
          }
          retryHeaders["X-CSRF-Token"] = newToken;
          retryFetchOptions.headers = retryHeaders;
        } else {
          retryFetchOptions.headers = {
            ...requestHeaders,
            "X-CSRF-Token": newToken,
          };
        }

        response = await fetch(url, retryFetchOptions);
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
