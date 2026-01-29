import { type NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import { generateCSRFToken } from "@/lib/csrf";
import {
  getSecurityHeaders,
  getErrorSecurityHeaders,
} from "@/lib/security-headers";
import { handleApiError } from "@/lib/error-handler";

/**
 * GET /api/csrf - Generate CSRF token for authenticated user
 * This endpoint should be called on page load to get a CSRF token
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const user = await verifyAuth(request);

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized: Invalid or missing authentication token" },
        { status: 401, headers: getErrorSecurityHeaders() }
      );
    }

    // Generate CSRF token for the user
    const token = await generateCSRFToken(user.uid);

    const headers = getSecurityHeaders();
    headers["X-CSRF-Token"] = token; // Include token in response header

    return NextResponse.json({ csrfToken: token }, { status: 200, headers });
  } catch (error) {
    return handleApiError(error, { route: "/api/csrf" });
  }
}
