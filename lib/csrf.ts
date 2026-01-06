import { getRedis } from "./redis";
import * as crypto from "crypto";

const CSRF_TOKEN_EXPIRY = 3600; // 1 hour
const CSRF_TOKEN_LENGTH = 32;

/**
 * Generate a CSRF token for a user session
 */
export const generateCSRFToken = async (userId: string): Promise<string> => {
  const token = crypto.randomBytes(CSRF_TOKEN_LENGTH).toString("hex");
  const redis = getRedis();
  const key = `csrf:${userId}:${token}`;

  // #region agent log
  const logData = {
    location: "lib/csrf.ts:generateCSRFToken",
    message: "Storing CSRF token in Redis",
    data: { userId, key, tokenLength: token.length, expiry: CSRF_TOKEN_EXPIRY },
    timestamp: Date.now(),
    sessionId: "debug-session",
    runId: "run1",
    hypothesisId: "D",
  };
  await fetch(
    "http://127.0.0.1:7244/ingest/0cdefbcf-c0dd-4af8-9322-fa937123a23b",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(logData),
    }
  ).catch(() => {});
  // #endregion

  // Store token in Redis with user ID as part of key
  await redis.setex(key, CSRF_TOKEN_EXPIRY, "1");

  // #region agent log
  const logData2 = {
    location: "lib/csrf.ts:generateCSRFToken",
    message: "CSRF token stored, verifying",
    data: { userId, key },
    timestamp: Date.now(),
    sessionId: "debug-session",
    runId: "run1",
    hypothesisId: "D",
  };
  await fetch(
    "http://127.0.0.1:7244/ingest/0cdefbcf-c0dd-4af8-9322-fa937123a23b",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(logData2),
    }
  ).catch(() => {});
  // #endregion

  // Verify it was stored correctly
  const verifyStored = await redis.get(key);
  // #region agent log
  const logData3 = {
    location: "lib/csrf.ts:generateCSRFToken",
    message: "CSRF token storage verification",
    data: {
      verifyStored,
      verifyStoredType: typeof verifyStored,
      verifyStoredValue: String(verifyStored),
    },
    timestamp: Date.now(),
    sessionId: "debug-session",
    runId: "run1",
    hypothesisId: "D",
  };
  await fetch(
    "http://127.0.0.1:7244/ingest/0cdefbcf-c0dd-4af8-9322-fa937123a23b",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(logData3),
    }
  ).catch(() => {});
  // #endregion

  return token;
};

/**
 * Verify CSRF token for a user
 */
export const verifyCSRFToken = async (
  userId: string,
  token: string | null
): Promise<boolean> => {
  if (!token || token.length !== CSRF_TOKEN_LENGTH * 2) {
    // #region agent log
    const logData = {
      location: "lib/csrf.ts:verifyCSRFToken",
      message: "Token validation: invalid length or null",
      data: {
        tokenPresent: !!token,
        tokenLength: token?.length || 0,
        expectedLength: CSRF_TOKEN_LENGTH * 2,
      },
      timestamp: Date.now(),
      sessionId: "debug-session",
      runId: "run1",
      hypothesisId: "D",
    };
    await fetch(
      "http://127.0.0.1:7244/ingest/0cdefbcf-c0dd-4af8-9322-fa937123a23b",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(logData),
      }
    ).catch(() => {});
    // #endregion
    return false;
  }

  try {
    const redis = getRedis();
    const key = `csrf:${userId}:${token}`;
    // #region agent log
    const logData2 = {
      location: "lib/csrf.ts:verifyCSRFToken",
      message: "Redis lookup starting",
      data: { userId, key, tokenLength: token.length },
      timestamp: Date.now(),
      sessionId: "debug-session",
      runId: "run1",
      hypothesisId: "D",
    };
    await fetch(
      "http://127.0.0.1:7244/ingest/0cdefbcf-c0dd-4af8-9322-fa937123a23b",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(logData2),
      }
    ).catch(() => {});
    // #endregion
    const stored = await redis.get(key);
    // #region agent log
    const logData3 = {
      location: "lib/csrf.ts:verifyCSRFToken",
      message: "Redis lookup result",
      data: {
        stored: stored,
        storedType: typeof stored,
        storedValue: String(stored),
        equalsOne: stored === "1",
        strictEqualsOne: stored === "1",
      },
      timestamp: Date.now(),
      sessionId: "debug-session",
      runId: "run1",
      hypothesisId: "D",
    };
    await fetch(
      "http://127.0.0.1:7244/ingest/0cdefbcf-c0dd-4af8-9322-fa937123a23b",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(logData3),
      }
    ).catch(() => {});
    // #endregion

    // Upstash Redis returns numbers for numeric strings, so we need to handle both
    return stored === "1" || stored === 1;
  } catch (error) {
    // #region agent log
    const logData4 = {
      location: "lib/csrf.ts:verifyCSRFToken",
      message: "Redis lookup exception",
      data: { error: error instanceof Error ? error.message : String(error) },
      timestamp: Date.now(),
      sessionId: "debug-session",
      runId: "run1",
      hypothesisId: "D",
    };
    await fetch(
      "http://127.0.0.1:7244/ingest/0cdefbcf-c0dd-4af8-9322-fa937123a23b",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(logData4),
      }
    ).catch(() => {});
    // #endregion
    console.error("CSRF verification error:", error);
    return false;
  }
};

/**
 * Revoke CSRF token (useful for logout)
 */
export const revokeCSRFToken = async (
  userId: string,
  token: string
): Promise<void> => {
  try {
    const redis = getRedis();
    await redis.del(`csrf:${userId}:${token}`);
  } catch (error) {
    console.error("CSRF revocation error:", error);
  }
};

/**
 * Revoke all CSRF tokens for a user (useful for logout)
 */
export const revokeAllCSRFTokens = async (_userId: string): Promise<void> => {
  try {
    // Note: Upstash REST API doesn't support pattern deletion
    // In production, consider tracking tokens separately or using SCAN if available
    // For now, tokens will expire naturally after CSRF_TOKEN_EXPIRY
    console.warn(
      "Bulk CSRF token revocation not fully supported with REST API"
    );
  } catch (error) {
    console.error("CSRF bulk revocation error:", error);
  }
};

/**
 * Get CSRF token from request headers
 */
export const getCSRFTokenFromRequest = (request: Request): string | null => {
  const token =
    request.headers.get("X-CSRF-Token") || request.headers.get("x-csrf-token");
  // Trim whitespace and return null if empty
  return token ? token.trim() : null;
};

/**
 * Middleware to verify CSRF token for mutating operations
 * Returns error response if token is invalid, null if valid
 */
export const verifyCSRF = async (
  request: Request,
  userId: string
): Promise<{
  error: string;
  status: number;
  headers: Record<string, string>;
} | null> => {
  const token = getCSRFTokenFromRequest(request);
  // #region agent log
  const logData = {
    location: "lib/csrf.ts:verifyCSRF",
    message: "Server: CSRF verification started",
    data: {
      userId,
      tokenPresent: !!token,
      tokenLength: token?.length || 0,
      hasHeader: !!request.headers.get("x-csrf-token"),
    },
    timestamp: Date.now(),
    sessionId: "debug-session",
    runId: "run1",
    hypothesisId: "D",
  };
  await fetch(
    "http://127.0.0.1:7244/ingest/0cdefbcf-c0dd-4af8-9322-fa937123a23b",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(logData),
    }
  ).catch(() => {});
  // #endregion
  const isValid = await verifyCSRFToken(userId, token);
  // #region agent log
  const logData2 = {
    location: "lib/csrf.ts:verifyCSRF",
    message: "Server: CSRF token validation result",
    data: { userId, tokenLength: token?.length || 0, isValid },
    timestamp: Date.now(),
    sessionId: "debug-session",
    runId: "run1",
    hypothesisId: "D",
  };
  await fetch(
    "http://127.0.0.1:7244/ingest/0cdefbcf-c0dd-4af8-9322-fa937123a23b",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(logData2),
    }
  ).catch(() => {});
  // #endregion

  if (!isValid) {
    // #region agent log
    const logData3 = {
      location: "lib/csrf.ts:verifyCSRF",
      message: "Server: CSRF token invalid",
      data: { userId, tokenPresent: !!token, tokenLength: token?.length || 0 },
      timestamp: Date.now(),
      sessionId: "debug-session",
      runId: "run1",
      hypothesisId: "D",
    };
    await fetch(
      "http://127.0.0.1:7244/ingest/0cdefbcf-c0dd-4af8-9322-fa937123a23b",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(logData3),
      }
    ).catch(() => {});
    // #endregion
    const headers = {
      "Content-Type": "application/json; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "no-store, no-cache, must-revalidate",
    };

    return {
      error:
        "Invalid or missing CSRF token. Please refresh the page and try again.",
      status: 403,
      headers,
    };
  }

  return null;
};
