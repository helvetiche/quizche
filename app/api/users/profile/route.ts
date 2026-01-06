import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import { adminDb } from "@/lib/firebase-admin";
import { verifyCSRF } from "@/lib/csrf";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import cache, { getApiCacheKey } from "@/lib/cache";
import {
  getSecurityHeaders,
  getErrorSecurityHeaders,
  getPublicSecurityHeaders,
} from "@/lib/security-headers";
import {
  UserProfileSchema,
  UserProfileUpdateSchema,
  validateInput,
} from "@/lib/validation";

export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized: Invalid or missing authentication token" },
        { status: 401, headers: getErrorSecurityHeaders() }
      );
    }

    const body = await request.json();

    // Validate input using Zod
    const validation = validateInput(UserProfileSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Invalid profile data. Please check all fields.",
          details: validation.error.issues,
        },
        { status: 400, headers: getErrorSecurityHeaders() }
      );
    }

    const validatedData = validation.data;

    const userRef = adminDb.collection("users").doc(user.uid);

    const updateData: Record<string, unknown> = {
      firstName: validatedData.firstName,
      middleName: validatedData.middleName || "",
      lastName: validatedData.lastName,
      nameExtension: validatedData.nameExtension || "",
      age: validatedData.age,
      school: validatedData.school,
      profileCompleted: true,
      updatedAt: new Date(),
    };

    // Allow profile photo if provided
    if (validatedData.profilePhotoUrl !== undefined) {
      updateData.profilePhotoUrl = validatedData.profilePhotoUrl || null;
    }

    await userRef.set(updateData, { merge: true });

    // Invalidate cache
    await cache.delete(getApiCacheKey("/api/users/profile", user.uid));

    return NextResponse.json(
      {
        success: true,
        message: "Profile updated successfully",
      },
      { status: 200, headers: getSecurityHeaders() }
    );
  } catch (error) {
    console.error("Profile update error:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: getErrorSecurityHeaders() }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await verifyAuth(request);

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized: Invalid or missing authentication token" },
        { status: 401, headers: getErrorSecurityHeaders() }
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
      return NextResponse.json(
        { error: "Rate limit exceeded. Please try again later." },
        {
          status: 429,
          headers: getErrorSecurityHeaders({
            rateLimitHeaders: rateLimitResult.headers,
          }),
        }
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

    // Validate input using Zod
    const validation = validateInput(UserProfileUpdateSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Invalid profile data. Please check all fields.",
          details: validation.error.issues,
        },
        { status: 400, headers: getErrorSecurityHeaders() }
      );
    }

    const validatedData = validation.data;

    const userRef = adminDb.collection("users").doc(user.uid);
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    // Only update provided fields
    if (validatedData.firstName !== undefined) {
      updateData.firstName = validatedData.firstName;
    }
    if (validatedData.middleName !== undefined) {
      updateData.middleName = validatedData.middleName || "";
    }
    if (validatedData.lastName !== undefined) {
      updateData.lastName = validatedData.lastName;
    }
    if (validatedData.nameExtension !== undefined) {
      updateData.nameExtension = validatedData.nameExtension || "";
    }
    if (validatedData.age !== undefined) {
      updateData.age = validatedData.age;
    }
    if (validatedData.school !== undefined) {
      updateData.school = validatedData.school;
    }
    if (validatedData.profilePhotoUrl !== undefined) {
      updateData.profilePhotoUrl = validatedData.profilePhotoUrl || null;
    }

    await userRef.update(updateData);

    // Invalidate cache
    await cache.delete(getApiCacheKey("/api/users/profile", user.uid));

    return NextResponse.json(
      {
        success: true,
        message: "Profile updated successfully",
      },
      { status: 200, headers: getSecurityHeaders() }
    );
  } catch (error) {
    console.error("Profile update error:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: getErrorSecurityHeaders() }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized: Invalid or missing authentication token" },
        { status: 401, headers: getErrorSecurityHeaders() }
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
      return NextResponse.json(
        { error: "Rate limit exceeded. Please try again later." },
        {
          status: 429,
          headers: getErrorSecurityHeaders({
            rateLimitHeaders: rateLimitResult.headers,
          }),
        }
      );
    }

    // Check cache first
    const cacheKey = getApiCacheKey("/api/users/profile", user.uid);
    const cached = await cache.get<{ profile: Record<string, unknown> }>(cacheKey);
    if (cached) {
      return NextResponse.json(
        cached,
        {
          status: 200,
          headers: getPublicSecurityHeaders({
            rateLimitHeaders: rateLimitResult.headers,
            cacheControl: "private, max-age=300",
          }),
        }
      );
    }

    // Optimized: Only fetch needed fields (Firestore Admin SDK doesn't support .select(),
    // but we manually extract only needed fields after fetching)
    const userDoc = await adminDb.collection("users").doc(user.uid).get();

    if (!userDoc.exists) {
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
        {
          status: 200,
          headers: getPublicSecurityHeaders({
            rateLimitHeaders: rateLimitResult.headers,
            cacheControl: "private, max-age=300",
          }),
        }
      );
    }

    const userData = userDoc.data() as Record<string, unknown> | undefined;

    // Extract only needed fields (field selection optimization)
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

    return NextResponse.json(
      profileData,
      {
        status: 200,
        headers: getPublicSecurityHeaders({
          rateLimitHeaders: rateLimitResult.headers,
          cacheControl: "private, max-age=300",
        }),
      }
    );
  } catch (error) {
    console.error("Get profile error:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: getErrorSecurityHeaders() }
    );
  }
}
