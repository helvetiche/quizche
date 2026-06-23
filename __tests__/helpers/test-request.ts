/**
 * Helpers for building NextRequest objects and parsing NextResponse objects
 * in route handler tests.
 */

import { NextRequest } from "next/server";

export const MOCK_CSRF_TOKEN = "mock-csrf-token";
export const MOCK_AUTH_TOKEN = "mock-firebase-id-token";

export type AuthRole = "teacher" | "student" | null;

type CreateRequestOptions = {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  /** Include a valid-looking Authorization bearer token. Default true. */
  auth?: boolean;
  /** Include the X-CSRF-Token header. Default true for mutating methods. */
  csrf?: boolean;
  query?: Record<string, string>;
};

const mutatingMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export const createRequest = (
  path: string,
  options: CreateRequestOptions = {}
): NextRequest => {
  const {
    method = "GET",
    body,
    headers = {},
    auth = true,
    csrf,
    query = {},
  } = options;

  const isMutation = mutatingMethods.has(method.toUpperCase());

  // Build URL with query params
  const url = new URL(path, "http://localhost:3000");
  for (const [key, value] of Object.entries(query)) {
    url.searchParams.set(key, value);
  }

  const allHeaders: Record<string, string> = { ...headers };
  if (auth) {
    allHeaders.Authorization = `Bearer ${MOCK_AUTH_TOKEN}`;
  }
  const shouldIncludeCSRF = csrf ?? isMutation;
  if (shouldIncludeCSRF) {
    allHeaders["X-CSRF-Token"] = MOCK_CSRF_TOKEN;
  }

  const init: RequestInit = {
    method,
    headers: allHeaders,
  };

  if (body !== undefined) {
    init.body = JSON.stringify(body);
    if (!allHeaders["Content-Type"]) {
      allHeaders["Content-Type"] = "application/json";
    }
  }

  return new NextRequest(url, init);
};

export type ParsedResponse<T = Record<string, unknown>> = {
  status: number;
  ok: boolean;
  body: T;
  headers: Headers;
};

export const parseResponse = async <T = Record<string, unknown>>(
  response: Response
): Promise<ParsedResponse<T>> => {
  const text = await response.text();
  let body: T;
  try {
    body = text.length > 0 ? (JSON.parse(text) as T) : ({} as T);
  } catch {
    body = { raw: text } as unknown as T;
  }
  return {
    status: response.status,
    ok: response.ok,
    body,
    headers: response.headers,
  };
};

/**
 * Build a NextRequest with FormData (used by file upload endpoints).
 */
export const createFormDataRequest = (
  path: string,
  fields: Record<string, string | { file: Buffer; filename: string; type: string }>,
  options: { method?: string; auth?: boolean; csrf?: boolean } = {}
): NextRequest => {
  const { method = "POST", auth = true, csrf = true } = options;
  const formData = new FormData();

  for (const [key, value] of Object.entries(fields)) {
    if (typeof value === "string") {
      formData.append(key, value);
    } else {
      const blob = new Blob([value.file], { type: value.type });
      formData.append(key, blob, value.filename);
    }
  }

  const headers: Record<string, string> = {};
  if (auth) {
    headers.Authorization = `Bearer ${MOCK_AUTH_TOKEN}`;
  }
  if (csrf) {
    headers["X-CSRF-Token"] = MOCK_CSRF_TOKEN;
  }

  const url = new URL(path, "http://localhost:3000");
  return new NextRequest(url, {
    method,
    headers,
    body: formData,
  });
};
