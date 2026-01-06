import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import { adminDb } from "@/lib/firebase-admin";
import { verifyCSRF } from "@/lib/csrf";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import cache, { getApiCacheKey } from "@/lib/cache";

export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);

    if (!user) {
      const headers = {
        "Content-Type": "application/json; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "no-store, no-cache, must-revalidate",
      };
      return NextResponse.json(
        { error: "Unauthorized: Invalid or missing authentication token" },
        { status: 401, headers }
      );
    }

    const body = await request.json();
    const { firstName, middleName, lastName, nameExtension, age, school, profilePhotoUrl } =
      body;

    if (!firstName || !lastName) {
      const headers = {
        "Content-Type": "application/json; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "no-store, no-cache, must-revalidate",
      };
      return NextResponse.json(
        { error: "First name and last name are required" },
        { status: 400, headers }
      );
    }

    if (!age || typeof age !== "number" || age <= 0) {
      const headers = {
        "Content-Type": "application/json; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "no-store, no-cache, must-revalidate",
      };
      return NextResponse.json(
        { error: "Valid age is required" },
        { status: 400, headers }
      );
    }

    if (!school) {
      const headers = {
        "Content-Type": "application/json; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "no-store, no-cache, must-revalidate",
      };
      return NextResponse.json(
        { error: "School is required" },
        { status: 400, headers }
      );
    }

    const userRef = adminDb.collection("users").doc(user.uid);

    const updateData: Record<string, unknown> = {
      firstName: firstName.trim(),
      middleName: middleName?.trim() || "",
      lastName: lastName.trim(),
      nameExtension: nameExtension?.trim() || "",
      age: age,
      school: school.trim(),
      profileCompleted: true,
      updatedAt: new Date(),
    };

    // Allow profile photo if provided
    if (body.profilePhotoUrl && typeof body.profilePhotoUrl === "string") {
      updateData.profilePhotoUrl = body.profilePhotoUrl.trim();
    }

    await userRef.set(updateData, { merge: true });

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
        message: "Profile updated successfully",
      },
      { status: 200, headers }
    );
  } catch (error) {
    console.error("Profile update error:", error);

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

export async function PUT(request: NextRequest) {
  try {
    const user = await verifyAuth(request);

    if (!user) {
      const headers = {
        "Content-Type": "application/json; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "no-store, no-cache, must-revalidate",
      };
      return NextResponse.json(
        { error: "Unauthorized: Invalid or missing authentication token" },
        { status: 401, headers }
      );
    }

    // Rate limiting
    const rateLimitResult = await rateLimit({
      identifier: user.uid,
      key: "users:profile:update",
      limit: RATE_LIMITS.general.limit,
      window: RATE_LIMITS.general.window,
    });

    if (!rateLimitResult.success) {
      const headers = {
        "Content-Type": "application/json; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
        ...rateLimitResult.headers,
      };
      return NextResponse.json(
        { error: "Rate limit exceeded. Please try again later." },
        { status: 429, headers }
      );
    }

    // CSRF protection
    const csrfError = await verifyCSRF(request, user.uid);
    if (csrfError) {
      return NextResponse.json(
        { error: csrfError.error },
        { status: csrfError.status, headers: csrfError.headers }
      );
    }

    const body = await request.json();
    const { firstName, middleName, lastName, nameExtension, age, school, profilePhotoUrl } =
      body;

    if (!firstName || !lastName) {
      const headers = {
        "Content-Type": "application/json; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "no-store, no-cache, must-revalidate",
      };
      return NextResponse.json(
        { error: "First name and last name are required" },
        { status: 400, headers }
      );
    }

    if (!age || typeof age !== "number" || age <= 0) {
      const headers = {
        "Content-Type": "application/json; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "no-store, no-cache, must-revalidate",
      };
      return NextResponse.json(
        { error: "Valid age is required" },
        { status: 400, headers }
      );
    }

    if (!school) {
      const headers = {
        "Content-Type": "application/json; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "no-store, no-cache, must-revalidate",
      };
      return NextResponse.json(
        { error: "School is required" },
        { status: 400, headers }
      );
    }

    const userRef = adminDb.collection("users").doc(user.uid);
    const updateData: Record<string, unknown> = {
      firstName: firstName.trim(),
      middleName: middleName?.trim() || "",
      lastName: lastName.trim(),
      nameExtension: nameExtension?.trim() || "",
      age: age,
      school: school.trim(),
      updatedAt: new Date(),
    };

    // Allow profile photo if provided
    if (profilePhotoUrl !== undefined) {
      if (profilePhotoUrl === null || profilePhotoUrl === "") {
        updateData.profilePhotoUrl = null;
      } else if (typeof profilePhotoUrl === "string" && profilePhotoUrl.trim().length > 0) {
        updateData.profilePhotoUrl = profilePhotoUrl.trim();
      }
    }

    await userRef.update(updateData);

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
        message: "Profile updated successfully",
      },
      { status: 200, headers }
    );
  } catch (error) {
    console.error("Profile update error:", error);

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

export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);

    if (!user) {
      const headers = {
        "Content-Type": "application/json; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "no-store, no-cache, must-revalidate",
      };
      return NextResponse.json(
        { error: "Unauthorized: Invalid or missing authentication token" },
        { status: 401, headers }
      );
    }

    // Rate limiting
    const rateLimitResult = await rateLimit({
      identifier: user.uid,
      key: "users:profile:get",
      limit: RATE_LIMITS.general.limit,
      window: RATE_LIMITS.general.window,
    });

    if (!rateLimitResult.success) {
      const headers = {
        "Content-Type": "application/json; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
        ...rateLimitResult.headers,
      };
      return NextResponse.json(
        { error: "Rate limit exceeded. Please try again later." },
        { status: 429, headers }
      );
    }

    // Check cache first
    const cacheKey = getApiCacheKey("/api/users/profile", user.uid);
    const cached = await cache.get<{ profile: Record<string, unknown> }>(cacheKey);
    if (cached) {
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
        "Cache-Control": "private, max-age=300",
        Vary: "Accept, Authorization",
        ...rateLimitResult.headers,
      };
      return NextResponse.json(cached, { status: 200, headers });
    }

    const userDoc = await adminDb.collection("users").doc(user.uid).get();

    if (!userDoc.exists) {
      const headers = {
        "Content-Type": "application/json; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "no-store, no-cache, must-revalidate",
      };
      return NextResponse.json(
        {
          profile: {
            firstName: "",
            middleName: "",
            lastName: "",
            nameExtension: "",
            age: null,
            school: "",
            profilePhotoUrl: null,
            profileCompleted: false,
          },
        },
        { status: 200, headers }
      );
    }

    const userData = userDoc.data() as Record<string, unknown> | undefined;

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
      "Cache-Control": "private, max-age=300",
      Vary: "Accept, Authorization",
      ...rateLimitResult.headers,
    };

    const profileData = {
      profile: {
        firstName: userData?.firstName || "",
        middleName: userData?.middleName || "",
        lastName: userData?.lastName || "",
        nameExtension: userData?.nameExtension || "",
        age: userData?.age || null,
        school: userData?.school || "",
        profilePhotoUrl: userData?.profilePhotoUrl || null,
        profileCompleted: userData?.profileCompleted || false,
      },
    };

    // Cache the response
    await cache.set(cacheKey, profileData, 300); // 5 minutes

    return NextResponse.json(profileData, { status: 200, headers });
  } catch (error) {
    console.error("Get profile error:", error);

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
