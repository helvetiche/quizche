import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import {
  getSecurityHeaders,
  getErrorSecurityHeaders,
} from "@/lib/security-headers";

export async function GET(request: NextRequest) {
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
    console.error("Verify error:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: getErrorSecurityHeaders() }
    );
  }
}
