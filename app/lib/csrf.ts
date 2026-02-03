/* eslint-disable @typescript-eslint/strict-boolean-expressions, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unnecessary-condition, @typescript-eslint/prefer-nullish-coalescing, @typescript-eslint/no-unsafe-return */
"use client";

/**
 * CSRF Token Management for Frontend
 * Stores token in memory (not localStorage) for security
 */

let csrfToken: string | null = null;
let tokenExpiry = 0;
const TOKEN_REFRESH_THRESHOLD = 300000; // Refresh 5 minutes before expiry (1 hour = 3600000ms)

/**
 * Fetch CSRF token from server
 */
export const fetchCSRFToken = async (
  idToken: string
): Promise<string | null> => {
  try {
    const response = await fetch("/api/csrf", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${idToken}`,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      console.error("Failed to fetch CSRF token:", response.status);
      return null;
    }

    const data = await response.json();
    const token = data.csrfToken || null;
    return token;
  } catch (error) {
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
  if (!idToken) {
    return null;
  }

  const now = Date.now();

  // Check if token exists and is still valid (with buffer)
  if (csrfToken && tokenExpiry > now + TOKEN_REFRESH_THRESHOLD) {
    return csrfToken;
  }

  // Always fetch new token if expired or missing
  try {
    const newToken = await fetchCSRFToken(idToken);
    if (newToken !== undefined && newToken !== null) {
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
