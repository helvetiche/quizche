/* eslint-disable @typescript-eslint/no-unnecessary-condition */
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

  // Store token in Redis with user ID as part of key
  await redis.setex(key, CSRF_TOKEN_EXPIRY, "1");

  return token;
};

export const verifyCSRFToken = async (
  userId: string,
  token: string | null
): Promise<boolean> => {
  if (token?.length !== CSRF_TOKEN_LENGTH * 2) {
    return false;
  }

  try {
    const redis = getRedis();
    const key = `csrf:${userId}:${token}`;
    const stored = await redis.get(key);

    return stored === "1" || stored === 1;
  } catch (error) {
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
export const revokeAllCSRFTokens = (_userId: string): void => {
  try {
    console.warn(
      "Bulk CSRF token revocation not fully supported with REST API"
    );
  } catch (error) {
    console.error("CSRF bulk revocation error:", error);
  }
};

export const getCSRFTokenFromRequest = (request: Request): string | null => {
  const token =
    request.headers.get("X-CSRF-Token") !== null
      ? request.headers.get("X-CSRF-Token")
      : request.headers.get("x-csrf-token");
  return token !== null && token !== undefined && token.length > 0
    ? token.trim()
    : null;
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
  const isValid = await verifyCSRFToken(userId, token);

  if (!isValid) {
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
