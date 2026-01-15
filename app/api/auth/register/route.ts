import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import {
  getSecurityHeaders,
  getErrorSecurityHeaders,
} from "@/lib/security-headers";
import { AuthRegisterSchema, validateInput } from "@/lib/validation";
import { handleApiError } from "@/lib/error-handler";

export async function POST(request: NextRequest) {
  try {
    // Register endpoint should NOT require CSRF - it's the initial registration point
    // CSRF protection is meant for authenticated sessions, not for establishing them

    const body = await request.json();

    // Validate input using Zod
    const validation = validateInput(AuthRegisterSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Invalid input data. Please check all fields.",
          details: validation.error.issues,
        },
        { status: 400, headers: getErrorSecurityHeaders() }
      );
    }

    const { idToken, role } = validation.data;

    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const uid = decodedToken.uid;

    const userRecord = await adminAuth.getUser(uid);
    const existingClaims = userRecord.customClaims || {};

    if (existingClaims.role) {
      return NextResponse.json(
        { error: "User already has a role assigned" },
        { status: 400, headers: getErrorSecurityHeaders() }
      );
    }

    await adminAuth.setCustomUserClaims(uid, {
      role: role,
      tier: "free",
    });

    await adminDb.collection("users").doc(uid).set(
      {
        displayName: decodedToken.name || userRecord.displayName || "",
        email: decodedToken.email || userRecord.email || "",
        role: role,
        tier: "free",
        profileCompleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      { merge: true }
    );

    return NextResponse.json(
      {
        success: true,
        user: {
          uid: uid,
          email: decodedToken.email,
          role: role,
          tier: "free",
        },
      },
      { status: 201, headers: getSecurityHeaders() }
    );
  } catch (error) {
    return handleApiError(error, { route: "/api/auth/register" });
  }
}
