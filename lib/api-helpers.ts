import { type NextRequest, NextResponse } from "next/server";
import { verifyAuth, type AuthUser } from "@/lib/auth";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { verifyCSRF } from "@/lib/csrf";
import { getErrorSecurityHeaders } from "@/lib/security-headers";

export async function requireAuth(
  request: NextRequest
): Promise<{ user: AuthUser; error: null } | { user: null; error: NextResponse }> {
  const user = await verifyAuth(request);

  if (!user) {
    return {
      user: null,
      error: NextResponse.json(
        { error: "Unauthorized: Invalid or missing authentication token" },
        { status: 401, headers: getErrorSecurityHeaders() }
      ),
    };
  }

  return { user, error: null };
}

export function requireRole(
  user: AuthUser,
  role: string
): NextResponse | null {
  if (user.role !== role) {
    return NextResponse.json(
      { error: `Forbidden: ${role} role required` },
      { status: 403, headers: getErrorSecurityHeaders() }
    );
  }

  return null;
}

export async function applyRateLimit(
  user: AuthUser,
  key: string,
  limit: number,
  window: number
): Promise<{ success: boolean; error: NextResponse | null }> {
  const result = await rateLimit({
    identifier: user.uid,
    key,
    limit,
    window,
  });

  if (!result.success) {
    return {
      success: false,
      error: NextResponse.json(
        { error: "Rate limit exceeded. Please try again later." },
        {
          status: 429,
          headers: getErrorSecurityHeaders({
            rateLimitHeaders: result.headers,
          }),
        }
      ),
    };
  }

  return { success: true, error: null };
}

export async function applyCSRF(
  request: NextRequest,
  userId: string
): Promise<{ success: boolean; error: NextResponse | null }> {
  const csrfError = await verifyCSRF(request, userId);

  if (csrfError !== null) {
    return {
      success: false,
      error: NextResponse.json(
        { error: csrfError.error },
        { status: csrfError.status, headers: csrfError.headers }
      ),
    };
  }

  return { success: true, error: null };
}