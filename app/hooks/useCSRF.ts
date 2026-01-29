/* eslint-disable @typescript-eslint/strict-boolean-expressions, @typescript-eslint/no-unnecessary-condition, @typescript-eslint/no-floating-promises */
"use client";

import { useEffect, useState, useCallback } from "react";
import {
  getCSRFToken,
  clearCSRFToken,
  needsCSRFTokenRefresh,
} from "../lib/csrf";

/**
 * React hook for managing CSRF tokens
 * Automatically fetches and refreshes CSRF tokens
 */
export const useCSRF = (
  idToken: string | null
): {
  csrfToken: string | null;
  loading: boolean;
  error: string | null;
  refreshToken: () => Promise<void>;
} => {
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchToken = useCallback(async () => {
    if (!idToken) {
      setCsrfToken(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = await getCSRFToken(idToken);
      setCsrfToken(token);
      if (!token) {
        setError("Failed to fetch CSRF token");
      }
    } catch (err) {
      console.error("Error fetching CSRF token:", err);
      setError("Failed to fetch CSRF token");
      setCsrfToken(null);
    } finally {
      setLoading(false);
    }
  }, [idToken]);

  const refreshToken = useCallback(async () => {
    if (!idToken) {
      return;
    }
    clearCSRFToken();
    await fetchToken();
  }, [idToken, fetchToken]);

  useEffect(() => {
    if (idToken !== undefined && idToken !== null) {
      fetchToken();

      // Set up periodic refresh (check every 5 minutes)
      const interval = setInterval(
        () => {
          if (needsCSRFTokenRefresh() && idToken) {
            fetchToken();
          }
        },
        5 * 60 * 1000
      ); // 5 minutes

      return () => clearInterval(interval);
    } else {
      clearCSRFToken();
      setCsrfToken(null);
    }
  }, [idToken, fetchToken]);

  return {
    csrfToken,
    loading,
    error,
    refreshToken,
  };
};
