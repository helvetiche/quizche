/* eslint-disable @typescript-eslint/no-unnecessary-condition */
/**
 * Centralized error handling to prevent information leakage
 * Categorizes errors and returns safe error messages to clients
 */

import { NextResponse } from "next/server";
import { getErrorSecurityHeaders } from "./security-headers";

/**
 * Error categories for proper HTTP status code mapping
 */
export enum ErrorCategory {
  VALIDATION = "VALIDATION",
  AUTHENTICATION = "AUTHENTICATION",
  AUTHORIZATION = "AUTHORIZATION",
  NOT_FOUND = "NOT_FOUND",
  RATE_LIMIT = "RATE_LIMIT",
  SERVER = "SERVER",
}

/**
 * Custom error class for API errors
 */
export class ApiError extends Error {
  constructor(
    public category: ErrorCategory,
    public statusCode: number,
    public clientMessage: string,
    public originalError?: unknown
  ) {
    super(clientMessage);
    this.name = "ApiError";
  }
}

/**
 * Check if error message contains sensitive information
 */
const containsSensitiveInfo = (message: string): boolean => {
  const sensitivePatterns = [
    /stack\s*trace/i,
    /at\s+\w+\.\w+/i, // Stack trace patterns
    /\/[a-z0-9/._-]+/i, // File paths
    /process\.env\.\w+/i, // Environment variable names
    /database/i,
    /firestore/i,
    /redis/i,
    /connection\s*(?:error|failed)/i,
    /timeout/i,
    /ECONNREFUSED/i,
    /ENOTFOUND/i,
  ];

  return sensitivePatterns.some((pattern) => pattern.test(message));
};

const categorizeError = (
  error: unknown
): {
  category: ErrorCategory;
  statusCode: number;
  clientMessage: string;
} => {
  if (error instanceof ApiError) {
    return {
      category: error.category,
      statusCode: error.statusCode,
      clientMessage: error.clientMessage,
    };
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    if (
      message.includes("validation") ||
      message.includes("invalid") ||
      message.includes("required") ||
      message.includes("missing")
    ) {
      return {
        category: ErrorCategory.VALIDATION,
        statusCode: 400,
        clientMessage: "Invalid request data",
      };
    }

    if (
      message.includes("unauthorized") ||
      message.includes("token") ||
      message.includes("authentication") ||
      message.includes("auth")
    ) {
      return {
        category: ErrorCategory.AUTHENTICATION,
        statusCode: 401,
        clientMessage: "Unauthorized: Invalid or missing authentication token",
      };
    }

    if (
      message.includes("forbidden") ||
      message.includes("permission") ||
      message.includes("access denied")
    ) {
      return {
        category: ErrorCategory.AUTHORIZATION,
        statusCode: 403,
        clientMessage:
          "Forbidden: You do not have permission to perform this action",
      };
    }

    if (
      message.includes("not found") ||
      message.includes("does not exist") ||
      message.includes("404")
    ) {
      return {
        category: ErrorCategory.NOT_FOUND,
        statusCode: 404,
        clientMessage: "Resource not found",
      };
    }

    if (
      message.includes("rate limit") ||
      message.includes("too many requests")
    ) {
      return {
        category: ErrorCategory.RATE_LIMIT,
        statusCode: 429,
        clientMessage: "Rate limit exceeded. Please try again later.",
      };
    }
  }

  return {
    category: ErrorCategory.SERVER,
    statusCode: 500,
    clientMessage: "Internal server error",
  };
};

export const handleApiError = (
  error: unknown,
  context?: {
    route?: string;
    userId?: string;
    additionalInfo?: Record<string, unknown>;
  }
): NextResponse => {
  const { category, statusCode, clientMessage } = categorizeError(error);

  const errorDetails = {
    category,
    statusCode,
    route: context?.route,
    userId: context?.userId,
    timestamp: new Date().toISOString(),
    error:
      error instanceof Error
        ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
          }
        : String(error),
    additionalInfo: context?.additionalInfo,
  };

  console.error("API Error:", JSON.stringify(errorDetails, null, 2));

  const errorMessage = error instanceof Error ? error.message : String(error);
  if (containsSensitiveInfo(errorMessage)) {
    console.warn(
      "Error message contains potentially sensitive information - sanitized in response"
    );
  }

  return NextResponse.json(
    {
      error: clientMessage,
    },
    {
      status: statusCode,
      headers: getErrorSecurityHeaders(),
    }
  );
};

export const createValidationError = (
  _message: string,
  details?: unknown
): NextResponse => {
  return NextResponse.json(
    {
      error: "Invalid request data",
      details: details,
    },
    {
      status: 400,
      headers: getErrorSecurityHeaders(),
    }
  );
};

export const createAuthError = (message?: string): NextResponse => {
  const errorMsg =
    message !== undefined && message !== null && message.length > 0
      ? message
      : "Unauthorized: Invalid or missing authentication token";
  return NextResponse.json(
    {
      error: errorMsg,
    },
    {
      status: 401,
      headers: getErrorSecurityHeaders(),
    }
  );
};

export const createForbiddenError = (message?: string): NextResponse => {
  const errorMsg =
    message !== undefined && message !== null && message.length > 0
      ? message
      : "Forbidden: You do not have permission to perform this action";
  return NextResponse.json(
    {
      error: errorMsg,
    },
    {
      status: 403,
      headers: getErrorSecurityHeaders(),
    }
  );
};

export const createNotFoundError = (resource?: string): NextResponse => {
  const errorMsg =
    resource !== null && resource !== undefined
      ? `${resource} not found`
      : "Resource not found";
  return NextResponse.json(
    {
      error: errorMsg,
    },
    {
      status: 404,
      headers: getErrorSecurityHeaders(),
    }
  );
};
