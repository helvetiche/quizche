import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase-admin";
import { verifyAuth } from "@/lib/auth";
import { verifyCSRF } from "@/lib/csrf";
import {
  getSecurityHeaders,
  getErrorSecurityHeaders,
} from "@/lib/security-headers";
import { AuthLoginSchema, validateInput } from "@/lib/validation";
import { handleApiError } from "@/lib/error-handler";

export async function POST(request: NextRequest) {
  try {
    // Optional CSRF protection: Only verify if user is already authenticated
    const existingUser = await verifyAuth(request);
    if (existingUser) {
      const csrfError = await verifyCSRF(request, existingUser.uid);
      if (csrfError) {
        return NextResponse.json(
          { error: csrfError.error },
          { status: csrfError.status, headers: csrfError.headers }
        );
      }
    }

    const body = await request.json();

    // Validate input using Zod
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
    const hasRole = decodedToken.role && decodedToken.role !== undefined;
    const role = hasRole ? decodedToken.role : null;
    const tier = decodedToken.tier || "free";

    return NextResponse.json(
      {
        success: true,
        user: {
          uid: decodedToken.uid,
          email: decodedToken.email,
          role: role,
          tier: tier,
        },
      },
      { status: 200, headers: getSecurityHeaders() }
    );
  } catch (error) {
    return handleApiError(error, { route: "/api/auth/login" });
  }
}
