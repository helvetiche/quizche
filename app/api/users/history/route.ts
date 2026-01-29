import { type NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import { adminDb } from "@/lib/firebase-admin";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import cache, { getApiCacheKey } from "@/lib/cache";
import {
  getSecurityHeaders,
  getErrorSecurityHeaders,
  getPublicSecurityHeaders,
} from "@/lib/security-headers";
import { handleApiError } from "@/lib/error-handler";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const user = await verifyAuth(request);

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized: Invalid or missing authentication token" },
        { status: 401, headers: getErrorSecurityHeaders() }
      );
    }

    // Only students can access their own quiz history
    if (user.role !== "student") {
      return NextResponse.json(
        { error: "Forbidden: Students only" },
        { status: 403, headers: getErrorSecurityHeaders() }
      );
    }

    // Rate limiting
    const rateLimitResult = await rateLimit({
      identifier: user.uid,
      key: "users:history",
      limit: RATE_LIMITS.history.limit,
      window: RATE_LIMITS.history.window,
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

    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get("limit") || "50");
    const lastDocId = url.searchParams.get("lastDocId");

    // Validate limit (1-100)
    const validatedLimit = Math.min(Math.max(limit, 1), 100);

    // Check cache first
    const cacheKey = getApiCacheKey("/api/users/history", user.uid, {
      limit: validatedLimit.toString(),
      lastDocId: lastDocId || "",
    });
    const cached = await cache.get<{
      attempts: any[];
      stats: any;
      pagination: any;
    }>(cacheKey);
    if (cached) {
      return NextResponse.json(cached, {
        status: 200,
        headers: getPublicSecurityHeaders({
          rateLimitHeaders: rateLimitResult.headers,
          cacheControl: "private, max-age=300",
        }),
      });
    }

    // Query quiz attempts for this user, ordered by completion date (newest first)
    // Use cursor-based pagination (more efficient than offset)
    let attemptsQuery = adminDb
      .collection("quizAttempts")
      .where("userId", "==", user.uid)
      .orderBy("completedAt", "desc")
      .limit(validatedLimit);

    if (lastDocId) {
      const lastDoc = await adminDb
        .collection("quizAttempts")
        .doc(lastDocId)
        .get();
      if (lastDoc.exists) {
        attemptsQuery = attemptsQuery.startAfter(lastDoc);
      }
    }

    const attemptsSnapshot = await attemptsQuery.get();

    const attempts = attemptsSnapshot.docs.map((doc) => {
      const data = doc.data();
      // Format violations if they exist
      const violations = data.violations || [];
      const formattedViolations = violations.map((v: any) => ({
        type: v.type,
        timestamp:
          v.timestamp?.toDate?.()?.toISOString() ||
          v.timestamp ||
          new Date().toISOString(),
        details: v.details,
      }));

      return {
        id: doc.id,
        quizId: data.quizId,
        quizTitle: data.quizTitle,
        teacherId: data.teacherId,
        answers: data.answers,
        score: data.score,
        totalQuestions: data.totalQuestions,
        percentage: data.percentage,
        completedAt:
          data.completedAt?.toDate?.()?.toISOString() || data.completedAt,
        timeSpent: data.timeSpent,
        tabChangeCount: data.tabChangeCount || 0,
        timeAway: data.timeAway || 0,
        refreshDetected: data.refreshDetected || false,
        violations: formattedViolations,
        disqualified: data.disqualified || false,
      };
    });

    // Calculate stats (only for current page)
    const totalQuizzes = attempts.length;
    const totalScore = attempts.reduce(
      (sum, attempt) => sum + (attempt.percentage || 0),
      0
    );
    const averageScore = totalQuizzes > 0 ? totalScore / totalQuizzes : 0;

    // Get recent attempts (limit to 5 for dashboard)
    const recentAttempts = attempts.slice(0, 5);

    const lastDoc = attemptsSnapshot.docs[attemptsSnapshot.docs.length - 1];
    const hasMore = attemptsSnapshot.docs.length === validatedLimit;

    const result = {
      attempts,
      stats: {
        totalQuizzes,
        averageScore: Math.round(averageScore * 10) / 10, // Round to 1 decimal
        recentAttempts,
      },
      pagination: {
        limit: validatedLimit,
        hasMore,
        lastDocId: hasMore && lastDoc ? lastDoc.id : null,
      },
    };

    // Cache the response
    await cache.set(cacheKey, result, 300); // 5 minutes

    return NextResponse.json(result, {
      status: 200,
      headers: getPublicSecurityHeaders({
        rateLimitHeaders: rateLimitResult.headers,
        cacheControl: "private, max-age=300",
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
    return handleApiError(error, { route: "/api/users/history", userId });
  }
}
