/* eslint-disable @typescript-eslint/no-unnecessary-condition, @typescript-eslint/prefer-nullish-coalescing */

import { type NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import { adminDb } from "@/lib/firebase-admin";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import cache, { getApiCacheKey } from "@/lib/cache";
import {
  getErrorSecurityHeaders,
  getPublicSecurityHeaders,
} from "@/lib/security-headers";
import { handleApiError } from "@/lib/error-handler";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const user = await verifyAuth(request);

    if (user === null || user === undefined) {
      return NextResponse.json(
        { error: "Unauthorized: Invalid or missing authentication token" },
        { status: 401, headers: getErrorSecurityHeaders() }
      );
    }

    if (user.role !== "student") {
      return NextResponse.json(
        { error: "Forbidden: Student role required" },
        { status: 403, headers: getErrorSecurityHeaders() }
      );
    }

    const url = new URL(request.url);
    const queryParam = url.searchParams.get("q");
    const query = queryParam !== null ? queryParam : "";
    const limitParam = url.searchParams.get("limit");
    const limit = parseInt(limitParam !== null ? limitParam : "20", 10);
    const validatedLimit = Math.min(Math.max(limit, 1), 50);

    // Rate limiting
    const rateLimitResult = await rateLimit({
      identifier: user.uid,
      key: "users:search",
      limit: RATE_LIMITS.general.limit,
      window: RATE_LIMITS.general.window,
    });

    if (rateLimitResult.success === false) {
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
    const cacheKey = getApiCacheKey("/api/users/search", user.uid, {
      q: query,
      limit: validatedLimit.toString(),
    });
    const cached = await cache.get<{ users: Record<string, unknown>[] }>(
      cacheKey
    );
    if (cached !== null && cached !== undefined) {
      return NextResponse.json(cached, {
        status: 200,
        headers: getPublicSecurityHeaders({
          rateLimitHeaders: rateLimitResult.headers,
          cacheControl: "private, max-age=60",
        }),
      });
    }

    if (query === null || query === undefined || query.trim().length === 0) {
      return NextResponse.json(
        { error: "Search query is required" },
        { status: 400, headers: getErrorSecurityHeaders() }
      );
    }

    if (query.trim().length < 2) {
      return NextResponse.json(
        { error: "Search query must be at least 2 characters" },
        { status: 400, headers: getErrorSecurityHeaders() }
      );
    }

    const searchTerm = query.trim().toLowerCase();

    // Get all existing connections for this user
    const [connectionsAsUser1, connectionsAsUser2] = await Promise.all([
      adminDb.collection("connections").where("userId1", "==", user.uid).get(),
      adminDb.collection("connections").where("userId2", "==", user.uid).get(),
    ]);

    const connectedUserIds = new Set<string>();
    connectionsAsUser1.forEach((doc) => {
      const data = doc.data();
      const userId2 = data.userId2 as string;
      if (userId2 !== undefined && userId2 !== null) {
        connectedUserIds.add(userId2);
      }
    });
    connectionsAsUser2.forEach((doc) => {
      const data = doc.data();
      const userId1 = data.userId1 as string;
      if (userId1 !== undefined && userId1 !== null) {
        connectedUserIds.add(userId1);
      }
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
    } catch (error: unknown) {
      // If index doesn't exist, try without role filter (less efficient but works)
      console.warn("Index error, fetching all users:", error);
      usersSnapshot = await adminDb.collection("users").limit(100).get();
    }

    const matchingUsers: {
      id: string;
      email: string;
      displayName: string;
      firstName: string;
      lastName: string;
    }[] = [];

    usersSnapshot.forEach((doc) => {
      const data = doc.data();
      const userId = doc.id;
      const userData = data as Record<string, unknown>;

      // Skip if not a student (if we didn't filter by role)
      if (userData.role !== "student") {
        return;
      }

      // Skip current user and existing connections
      if (userId === user.uid || connectedUserIds.has(userId)) {
        return;
      }

      const email = (
        typeof userData.email === "string" ? userData.email : ""
      ).toLowerCase();
      const displayNameValue = userData.displayName ?? userData.firstName ?? "";
      const displayName = (
        typeof displayNameValue === "string" ? displayNameValue : ""
      ).toLowerCase();
      const firstName = (
        typeof userData.firstName === "string" ? userData.firstName : ""
      ).toLowerCase();
      const lastName = (
        typeof userData.lastName === "string" ? userData.lastName : ""
      ).toLowerCase();
      const fullName = `${firstName} ${lastName}`.trim().toLowerCase();

      // Check if search term matches email, displayName, firstName, lastName, or full name
      if (
        email.includes(searchTerm) ||
        displayName.includes(searchTerm) ||
        firstName.includes(searchTerm) ||
        lastName.includes(searchTerm) ||
        fullName.includes(searchTerm)
      ) {
        const emailValue =
          typeof userData.email === "string" ? userData.email : "";
        const displayNameFinal =
          typeof userData.displayName === "string"
            ? userData.displayName
            : `${typeof userData.firstName === "string" ? userData.firstName : ""} ${typeof userData.lastName === "string" ? userData.lastName : ""}`.trim();
        matchingUsers.push({
          id: userId,
          email: emailValue,
          displayName: displayNameFinal !== "" ? displayNameFinal : "",
          firstName:
            typeof userData.firstName === "string" ? userData.firstName : "",
          lastName:
            typeof userData.lastName === "string" ? userData.lastName : "",
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
    console.warn("User search debug:", {
      searchTerm,
      totalUsersFetched: usersSnapshot.size,
      matchingUsersCount: matchingUsers.length,
      limitedUsersCount: limitedUsers.length,
      connectedUserIdsCount: connectedUserIds.size,
    });

    const result = { users: limitedUsers };

    // Cache the response
    await cache.set(cacheKey, result, 60); // 1 minute (shorter for search)

    return NextResponse.json(result, {
      status: 200,
      headers: getPublicSecurityHeaders({
        rateLimitHeaders: rateLimitResult.headers,
        cacheControl: "private, max-age=60",
      }),
    });
  } catch (error) {
    // Try to get user for error context, but don't fail if auth fails
    let userId: string | undefined;
    try {
      const user = await verifyAuth(request);
      userId = user?.uid;
    } catch {
      // Ignore auth errors in error handler
    }
    return handleApiError(error, { route: "/api/users/search", userId });
  }
}
