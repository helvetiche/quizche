/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { type NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase-admin";
import {
  getSecurityHeaders,
  getErrorSecurityHeaders,
} from "@/lib/security-headers";
import { AuthLoginSchema, validateInput } from "@/lib/validation";
import { handleApiError } from "@/lib/error-handler";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = (await request.json()) as Record<string, unknown>;

    const validation = validateInput(AuthLoginSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Invalid input data. Please check all fields.",
          details: validation.error.issues,
        },
        { status: 400, headers: getErrorSecurityHeaders() }
      );
    }

    const { idToken } = validation.data;

    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const hasRole =
      decodedToken.role !== null && decodedToken.role !== undefined;
    const role = hasRole ? (decodedToken.role as string) : null;
    const tier = decodedToken.tier ?? "free";

    return NextResponse.json(
      {
        success: true,
        user: {
          uid: decodedToken.uid,
          email: decodedToken.email,
          role,
          tier,
        },
      },
      { status: 200, headers: getSecurityHeaders() }
    );
  } catch (error) {
    return handleApiError(error, { route: "/api/auth/login" });
  }
}
