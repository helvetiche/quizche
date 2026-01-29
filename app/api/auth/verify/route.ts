import { type NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import {
  getSecurityHeaders,
  getErrorSecurityHeaders,
} from "@/lib/security-headers";
import { handleApiError } from "@/lib/error-handler";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const user = await verifyAuth(request);

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized: Invalid or missing authentication token" },
        { status: 401, headers: getErrorSecurityHeaders() }
      );
    }

    return NextResponse.json(
      { user },
      { status: 200, headers: getSecurityHeaders() }
    );
  } catch (error) {
    return handleApiError(error, { route: "/api/auth/verify" });
  }
}
