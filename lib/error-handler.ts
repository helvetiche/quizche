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

/**
 * Categorize error and determine appropriate response
 */
const categorizeError = (error: unknown): {
  category: ErrorCategory;
  statusCode: number;
  clientMessage: string;
} => {
  // Handle ApiError instances
  if (error instanceof ApiError) {
    return {
      category: error.category,
      statusCode: error.statusCode,
      clientMessage: error.clientMessage,
    };
  }

  // Handle Error instances
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    // Validation errors
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

    // Authentication errors
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

    // Authorization errors
    if (
      message.includes("forbidden") ||
      message.includes("permission") ||
      message.includes("access denied")
    ) {
      return {
        category: ErrorCategory.AUTHORIZATION,
        statusCode: 403,
        clientMessage: "Forbidden: You do not have permission to perform this action",
      };
    }

    // Not found errors
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

    // Rate limit errors
    if (message.includes("rate limit") || message.includes("too many requests")) {
      return {
        category: ErrorCategory.RATE_LIMIT,
        statusCode: 429,
        clientMessage: "Rate limit exceeded. Please try again later.",
      };
    }
  }

  // Default to server error
  return {
    category: ErrorCategory.SERVER,
    statusCode: 500,
    clientMessage: "Internal server error",
  };
};

/**
 * Handle API errors and return safe error responses
 * Logs detailed error information server-side but returns generic messages to clients
 */
export const handleApiError = (
  error: unknown,
  context?: {
    route?: string;
    userId?: string;
    additionalInfo?: Record<string, unknown>;
  }
): NextResponse => {
  // Categorize the error
  const { category, statusCode, clientMessage } = categorizeError(error);

  // Log detailed error information server-side
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

  // Check if error message contains sensitive information
  const errorMessage =
    error instanceof Error ? error.message : String(error);
  if (containsSensitiveInfo(errorMessage)) {
    console.warn(
      "Error message contains potentially sensitive information - sanitized in response"
    );
  }

  // Return safe error response to client
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

/**
 * Create a validation error response
 */
export const createValidationError = (
  message: string,
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

/**
 * Create an authentication error response
 */
export const createAuthError = (message?: string): NextResponse => {
  return NextResponse.json(
    {
      error: message || "Unauthorized: Invalid or missing authentication token",
    },
    {
      status: 401,
      headers: getErrorSecurityHeaders(),
    }
  );
};

/**
 * Create an authorization error response
 */
export const createForbiddenError = (message?: string): NextResponse => {
  return NextResponse.json(
    {
      error: message || "Forbidden: You do not have permission to perform this action",
    },
    {
      status: 403,
      headers: getErrorSecurityHeaders(),
    }
  );
};

/**
 * Create a not found error response
 */
export const createNotFoundError = (resource?: string): NextResponse => {
  return NextResponse.json(
    {
      error: resource ? `${resource} not found` : "Resource not found",
    },
    {
      status: 404,
      headers: getErrorSecurityHeaders(),
    }
  );
};
