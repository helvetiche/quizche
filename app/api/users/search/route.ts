import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import { adminDb } from "@/lib/firebase-admin";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import cache, { getApiCacheKey } from "@/lib/cache";


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

    if (user.role !== "student") {
      const headers = {
        "Content-Type": "application/json; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "no-store, no-cache, must-revalidate",
      };
      return NextResponse.json(
        { error: "Forbidden: Student role required" },
        { status: 403, headers }
      );
    }

    const url = new URL(request.url);
    const query = url.searchParams.get("q") || "";
    const limit = parseInt(url.searchParams.get("limit") || "20");
    const validatedLimit = Math.min(Math.max(limit, 1), 50);

    // Rate limiting
    const rateLimitResult = await rateLimit({
      identifier: user.uid,
      key: "users:search",
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
    const cacheKey = getApiCacheKey("/api/users/search", user.uid, {
      q: query,
      limit: validatedLimit.toString(),
    });
    const cached = await cache.get<{ users: any[] }>(cacheKey);
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
        "Cache-Control": "private, max-age=60",
        Vary: "Accept, Authorization",
        ...rateLimitResult.headers,
      };
      return NextResponse.json(cached, { status: 200, headers });
    }

    if (!query || query.trim().length === 0) {
      const headers = {
        "Content-Type": "application/json; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "no-store, no-cache, must-revalidate",
      };
      return NextResponse.json(
        { error: "Search query is required" },
        { status: 400, headers }
      );
    }

    if (query.trim().length < 2) {
      const headers = {
        "Content-Type": "application/json; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "no-store, no-cache, must-revalidate",
      };
      return NextResponse.json(
        { error: "Search query must be at least 2 characters" },
        { status: 400, headers }
      );
    }

    const searchTerm = query.trim().toLowerCase();

    // Get all existing connections for this user
    const [connectionsAsUser1, connectionsAsUser2] = await Promise.all([
      adminDb
        .collection("connections")
        .where("userId1", "==", user.uid)
        .get(),
      adminDb
        .collection("connections")
        .where("userId2", "==", user.uid)
        .get(),
    ]);

    const connectedUserIds = new Set<string>();
    connectionsAsUser1.forEach((doc) => {
      const data = doc.data();
      connectedUserIds.add(data.userId2);
    });
    connectionsAsUser2.forEach((doc) => {
      const data = doc.data();
      connectedUserIds.add(data.userId1);
    });

    // Search users by email or displayName
    // Note: Firestore doesn't support full-text search, so we'll fetch all students and filter
    // This is a limitation but works for basic use cases
    // We'll fetch a larger batch to ensure we get results
    let usersSnapshot;
    try {
      usersSnapshot = await adminDb
        .collection("users")
        .where("role", "==", "student")
        .limit(100) // Fetch up to 100 students to filter
        .get();
    } catch (error: any) {
      // If index doesn't exist, try without role filter (less efficient but works)
      console.warn("Index error, fetching all users:", error);
      usersSnapshot = await adminDb
        .collection("users")
        .limit(100)
        .get();
    }

    const matchingUsers: any[] = [];

    usersSnapshot.forEach((doc) => {
      const data = doc.data();
      const userId = doc.id;

      // Skip if not a student (if we didn't filter by role)
      if (data?.role !== "student") {
        return;
      }

      // Skip current user and existing connections
      if (userId === user.uid || connectedUserIds.has(userId)) {
        return;
      }

      const email = (data?.email || "").toLowerCase();
      const displayName = (
        data?.displayName ||
        data?.firstName ||
        ""
      ).toLowerCase();
      const firstName = (data?.firstName || "").toLowerCase();
      const lastName = (data?.lastName || "").toLowerCase();
      const fullName = `${firstName} ${lastName}`.trim().toLowerCase();

      // Check if search term matches email, displayName, firstName, lastName, or full name
      if (
        email.includes(searchTerm) ||
        displayName.includes(searchTerm) ||
        firstName.includes(searchTerm) ||
        lastName.includes(searchTerm) ||
        fullName.includes(searchTerm)
      ) {
        matchingUsers.push({
          id: userId,
          email: data?.email || "",
          displayName:
            data?.displayName ||
            `${data?.firstName || ""} ${data?.lastName || ""}`.trim() ||
            "",
          firstName: data?.firstName || "",
          lastName: data?.lastName || "",
        });
      }
    });

    // Sort by relevance (exact matches first, then prefix matches)
    matchingUsers.sort((a, b) => {
      const aEmail = a.email.toLowerCase();
      const bEmail = b.email.toLowerCase();
      const aName = a.displayName.toLowerCase();
      const bName = b.displayName.toLowerCase();

      const aExactEmail = aEmail === searchTerm;
      const bExactEmail = bEmail === searchTerm;
      const aStartsEmail = aEmail.startsWith(searchTerm);
      const bStartsEmail = bEmail.startsWith(searchTerm);
      const aStartsName = aName.startsWith(searchTerm);
      const bStartsName = bName.startsWith(searchTerm);

      if (aExactEmail && !bExactEmail) return -1;
      if (!aExactEmail && bExactEmail) return 1;
      if (aStartsEmail && !bStartsEmail) return -1;
      if (!aStartsEmail && bStartsEmail) return 1;
      if (aStartsName && !bStartsName) return -1;
      if (!aStartsName && bStartsName) return 1;
      return 0;
    });

    // Limit results
    const limitedUsers = matchingUsers.slice(0, validatedLimit);

    // Debug logging (remove in production if needed)
    console.log("User search debug:", {
      searchTerm,
      totalUsersFetched: usersSnapshot.size,
      matchingUsersCount: matchingUsers.length,
      limitedUsersCount: limitedUsers.length,
      connectedUserIdsCount: connectedUserIds.size,
    });

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
      "Cache-Control": "private, max-age=60",
      Vary: "Accept, Authorization",
      ...rateLimitResult.headers,
    };

    const result = { users: limitedUsers };

    // Cache the response
    await cache.set(cacheKey, result, 60); // 1 minute (shorter for search)

    return NextResponse.json(result, { status: 200, headers });
  } catch (error) {
    console.error("Search users error:", error);
    console.error("Error details:", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    const errorHeaders = {
      "Content-Type": "application/json; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "Cache-Control": "no-store, no-cache, must-revalidate",
    };

    return NextResponse.json(
      { 
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500, headers: errorHeaders }
    );
  }
}
