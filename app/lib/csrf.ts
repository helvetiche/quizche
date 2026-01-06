"use client";

/**
 * CSRF Token Management for Frontend
 * Stores token in memory (not localStorage) for security
 */

let csrfToken: string | null = null;
let tokenExpiry: number = 0;
const TOKEN_REFRESH_THRESHOLD = 300000; // Refresh 5 minutes before expiry (1 hour = 3600000ms)

/**
 * Fetch CSRF token from server
 */
export const fetchCSRFToken = async (
  idToken: string
): Promise<string | null> => {
  // #region agent log
  fetch("http://127.0.0.1:7244/ingest/0cdefbcf-c0dd-4af8-9322-fa937123a23b", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      location: "app/lib/csrf.ts:15",
      message: "fetchCSRFToken called",
      data: { idTokenPresent: !!idToken, idTokenLength: idToken?.length || 0 },
      timestamp: Date.now(),
      sessionId: "debug-session",
      runId: "run1",
      hypothesisId: "A",
    }),
  }).catch(() => {});
  // #endregion
  try {
    const response = await fetch("/api/csrf", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${idToken}`,
      },
      cache: "no-store",
    });

    // #region agent log
    fetch("http://127.0.0.1:7244/ingest/0cdefbcf-c0dd-4af8-9322-fa937123a23b", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: "app/lib/csrf.ts:26",
        message: "CSRF fetch response received",
        data: { status: response.status, ok: response.ok },
        timestamp: Date.now(),
        sessionId: "debug-session",
        runId: "run1",
        hypothesisId: "A",
      }),
    }).catch(() => {});
    // #endregion

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      // #region agent log
      fetch(
        "http://127.0.0.1:7244/ingest/0cdefbcf-c0dd-4af8-9322-fa937123a23b",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            location: "app/lib/csrf.ts:30",
            message: "CSRF fetch failed",
            data: {
              status: response.status,
              errorText: errorText.substring(0, 200),
            },
            timestamp: Date.now(),
            sessionId: "debug-session",
            runId: "run1",
            hypothesisId: "A",
          }),
        }
      ).catch(() => {});
      // #endregion
      console.error("Failed to fetch CSRF token:", response.status);
      return null;
    }

    const data = await response.json();
    const token = data.csrfToken || null;
    // #region agent log
    fetch("http://127.0.0.1:7244/ingest/0cdefbcf-c0dd-4af8-9322-fa937123a23b", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: "app/lib/csrf.ts:36",
        message: "CSRF token extracted",
        data: {
          tokenPresent: !!token,
          tokenLength: token?.length || 0,
          hasCsrfTokenInData: !!data.csrfToken,
        },
        timestamp: Date.now(),
        sessionId: "debug-session",
        runId: "run1",
        hypothesisId: "B",
      }),
    }).catch(() => {});
    // #endregion
    return token;
  } catch (error) {
    // #region agent log
    fetch("http://127.0.0.1:7244/ingest/0cdefbcf-c0dd-4af8-9322-fa937123a23b", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: "app/lib/csrf.ts:42",
        message: "CSRF fetch exception",
        data: { error: error instanceof Error ? error.message : String(error) },
        timestamp: Date.now(),
        sessionId: "debug-session",
        runId: "run1",
        hypothesisId: "A",
      }),
    }).catch(() => {});
    // #endregion
    console.error("Error fetching CSRF token:", error);
    return null;
  }
};

/**
 * Get current CSRF token, refreshing if needed
 */
export const getCSRFToken = async (
  idToken: string | null
): Promise<string | null> => {
  // #region agent log
  fetch("http://127.0.0.1:7244/ingest/0cdefbcf-c0dd-4af8-9322-fa937123a23b", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      location: "csrf.ts:45",
      message: "getCSRFToken called",
      data: {
        idTokenPresent: !!idToken,
        hasCachedToken: !!csrfToken,
        tokenExpiry: tokenExpiry,
      },
      timestamp: Date.now(),
      sessionId: "debug-session",
      runId: "run1",
      hypothesisId: "E",
    }),
  }).catch(() => {});
  // #endregion
  if (!idToken) {
    // #region agent log
    fetch("http://127.0.0.1:7244/ingest/0cdefbcf-c0dd-4af8-9322-fa937123a23b", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: "csrf.ts:48",
        message: "getCSRFToken: no idToken",
        data: {},
        timestamp: Date.now(),
        sessionId: "debug-session",
        runId: "run1",
        hypothesisId: "E",
      }),
    }).catch(() => {});
    // #endregion
    return null;
  }

  const now = Date.now();

  // Check if token exists and is still valid (with buffer)
  if (csrfToken && tokenExpiry > now + TOKEN_REFRESH_THRESHOLD) {
    // #region agent log
    fetch("http://127.0.0.1:7244/ingest/0cdefbcf-c0dd-4af8-9322-fa937123a23b", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: "csrf.ts:54",
        message: "getCSRFToken: returning cached token",
        data: { tokenLength: csrfToken.length },
        timestamp: Date.now(),
        sessionId: "debug-session",
        runId: "run1",
        hypothesisId: "C",
      }),
    }).catch(() => {});
    // #endregion
    return csrfToken;
  }

  // Always fetch new token if expired or missing
  try {
    const newToken = await fetchCSRFToken(idToken);
    // #region agent log
    fetch("http://127.0.0.1:7244/ingest/0cdefbcf-c0dd-4af8-9322-fa937123a23b", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: "csrf.ts:62",
        message: "getCSRFToken: fetched new token",
        data: { tokenPresent: !!newToken, tokenLength: newToken?.length || 0 },
        timestamp: Date.now(),
        sessionId: "debug-session",
        runId: "run1",
        hypothesisId: "B",
      }),
    }).catch(() => {});
    // #endregion
    if (newToken) {
      csrfToken = newToken;
      tokenExpiry = now + 3600000; // 1 hour from now
      return newToken;
    } else {
      console.error("Failed to fetch CSRF token from server");
      return null;
    }
  } catch (error) {
    console.error("Error fetching CSRF token:", error);
    return null;
  }
};

/**
 * Clear CSRF token (useful for logout)
 */
export const clearCSRFToken = (): void => {
  csrfToken = null;
  tokenExpiry = 0;
};

/**
 * Check if CSRF token needs refresh
 */
export const needsCSRFTokenRefresh = (): boolean => {
  if (!csrfToken) {
    return true;
  }
  const now = Date.now();
  return tokenExpiry <= now + TOKEN_REFRESH_THRESHOLD;
};
