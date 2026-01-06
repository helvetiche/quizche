import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase-admin";
import { verifyAuth } from "@/lib/auth";
import { verifyCSRF } from "@/lib/csrf";

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
    const { idToken } = body;

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

    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const hasRole = decodedToken.role && decodedToken.role !== undefined;
    const role = hasRole ? decodedToken.role : null;
    const tier = decodedToken.tier || "free";

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
          uid: decodedToken.uid,
          email: decodedToken.email,
          role: role,
          tier: tier,
        },
      },
      { status: 200, headers }
    );
  } catch (error) {
    console.error("Login error:", error);

    const errorHeaders = {
      "Content-Type": "application/json; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "Cache-Control": "no-store, no-cache, must-revalidate",
    };

    return NextResponse.json(
      { error: "Invalid token" },
      { status: 401, headers: errorHeaders }
    );
  }
}
