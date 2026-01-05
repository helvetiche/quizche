import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { idToken, role } = body;

    if (!idToken) {
      const headers = {
        "Content-Type": "application/json; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "no-store, no-cache, must-revalidate",
      };
      return NextResponse.json(
        { error: "Missing ID token" },
        { status: 400, headers }
      );
    }

    if (!role || (role !== "student" && role !== "teacher")) {
      const headers = {
        "Content-Type": "application/json; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "no-store, no-cache, must-revalidate",
      };
      return NextResponse.json(
        { error: "Invalid role. Must be 'student' or 'teacher'" },
        { status: 400, headers }
      );
    }

    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const uid = decodedToken.uid;

    const userRecord = await adminAuth.getUser(uid);
    const existingClaims = userRecord.customClaims || {};

    if (existingClaims.role) {
      const headers = {
        "Content-Type": "application/json; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "no-store, no-cache, must-revalidate",
      };
      return NextResponse.json(
        { error: "User already has a role assigned" },
        { status: 400, headers }
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

    const headers = {
      "Content-Type": "application/json; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "X-XSS-Protection": "1; mode=block",
      "Strict-Transport-Security":
        "max-age=31536000; includeSubDomains; preload",
      "Content-Security-Policy":
        "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://*.firebaseio.com https://*.googleapis.com;",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "Permissions-Policy": "geolocation=(), microphone=(), camera=()",
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      Vary: "Accept, Authorization",
    };

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
      { status: 201, headers }
    );
  } catch (error) {
    console.error("Register error:", error);

    const errorHeaders = {
      "Content-Type": "application/json; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "Cache-Control": "no-store, no-cache, must-revalidate",
    };

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: errorHeaders }
    );
  }
}
