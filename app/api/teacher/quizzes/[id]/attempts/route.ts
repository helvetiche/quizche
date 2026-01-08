import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import { adminDb } from "@/lib/firebase-admin";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import {
  getSecurityHeaders,
  getErrorSecurityHeaders,
  getPublicSecurityHeaders,
} from "@/lib/security-headers";
import { handleApiError } from "@/lib/error-handler";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await verifyAuth(request);

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized: Invalid or missing authentication token" },
        { status: 401, headers: getErrorSecurityHeaders() }
      );
    }

    if (user.role !== "teacher") {
      return NextResponse.json(
        { error: "Forbidden: Teacher role required to view quiz attempts" },
        { status: 403, headers: getErrorSecurityHeaders() }
      );
    }

    const { id } = await params;

    // Rate limiting
    const rateLimitResult = await rateLimit({
      identifier: user.uid,
      key: `teacher:quizzes:attempts:${id}`,
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

    if (!id) {
      return NextResponse.json(
        { error: "Quiz ID is required" },
        { status: 400, headers: getErrorSecurityHeaders() }
      );
    }

    // Verify quiz belongs to this teacher
    const quizDoc = await adminDb.collection("quizzes").doc(id).get();

    if (!quizDoc.exists) {
      return NextResponse.json(
        { error: "Quiz not found" },
        { status: 404, headers: getErrorSecurityHeaders() }
      );
    }

    const quizData = quizDoc.data();

    if (quizData?.teacherId !== user.uid) {
      return NextResponse.json(
        { error: "Forbidden: You can only view attempts for your own quizzes" },
        { status: 403, headers: getErrorSecurityHeaders() }
      );
    }

    // Pagination support
    const url = new URL(request.url);
    const limit = Math.min(Math.max(parseInt(url.searchParams.get("limit") || "50"), 1), 100);
    const lastDocId = url.searchParams.get("lastDocId");

    // Get attempts for this quiz with pagination
    let attemptsQuery = adminDb
      .collection("quizAttempts")
      .where("quizId", "==", id)
      .orderBy("completedAt", "desc")
      .limit(limit);

    if (lastDocId) {
      const lastDoc = await adminDb.collection("quizAttempts").doc(lastDocId).get();
      if (lastDoc.exists) {
        attemptsQuery = attemptsQuery.startAfter(lastDoc);
      }
    }

    const attemptsSnapshot = await attemptsQuery.get();

    // Collect user IDs from attempts that don't have denormalized data (legacy data)
    const userIdsToFetch = new Set<string>();
    attemptsSnapshot.docs.forEach(doc => {
      const attemptData = doc.data();
      const userId = attemptData.userId;
      // Only fetch user if denormalized data is missing (legacy attempts)
      if (userId && (!attemptData.studentEmail || !attemptData.studentName)) {
        userIdsToFetch.add(userId);
      }
    });

    // Batch fetch users only for legacy attempts (Firestore 'in' query limit is 10)
    const userMap = new Map<string, { email: string; displayName: string }>();
    if (userIdsToFetch.size > 0) {
      const userIdsArray = Array.from(userIdsToFetch);
      const batchSize = 10;
      for (let i = 0; i < userIdsArray.length; i += batchSize) {
        const batch = userIdsArray.slice(i, i + batchSize);
        const userPromises = batch.map(userId =>
          adminDb.collection("users").doc(userId).get()
        );
        const userDocs = await Promise.all(userPromises);
        userDocs.forEach((doc, index) => {
          if (doc.exists) {
            const userData = doc.data();
            userMap.set(batch[index], {
              email: userData?.email || "Unknown",
              displayName: userData?.displayName || "Unknown",
            });
          }
        });
      }
    }

    // Build attempts with student info - prefer denormalized data, fallback to user lookup
    const attempts = attemptsSnapshot.docs.map((doc) => {
      const attemptData = doc.data();
      // Use denormalized data if available (new attempts), otherwise use user lookup (legacy attempts)
      const userInfo = attemptData.studentEmail && attemptData.studentName
        ? {
            email: attemptData.studentEmail,
            displayName: attemptData.studentName,
          }
        : userMap.get(attemptData.userId) || {
            email: attemptData.studentEmail || "Unknown",
            displayName: attemptData.studentName || "Unknown",
          };

      const completedAt = attemptData.completedAt?.toDate
        ? attemptData.completedAt.toDate().toISOString()
        : attemptData.completedAt instanceof Date
          ? attemptData.completedAt.toISOString()
          : attemptData.completedAt || new Date().toISOString();

      // Format violations if they exist
      const violations = attemptData.violations || [];
      const formattedViolations = violations.map((v: any) => ({
        type: v.type,
        timestamp: v.timestamp?.toDate?.()?.toISOString() || v.timestamp || new Date().toISOString(),
        details: v.details,
      }));

      return {
        id: doc.id,
        userId: attemptData.userId,
        studentEmail: userInfo.email,
        studentName: userInfo.displayName,
        answers: attemptData.answers || {},
        score: attemptData.score || 0,
        totalQuestions: attemptData.totalQuestions || 0,
        percentage: attemptData.percentage || 0,
        completedAt,
        timeSpent: attemptData.timeSpent || 0,
        tabChangeCount: attemptData.tabChangeCount || 0,
        timeAway: attemptData.timeAway || 0,
        refreshDetected: attemptData.refreshDetected || false,
        violations: formattedViolations,
        disqualified: attemptData.disqualified || false,
      };
    });

    const lastDoc = attemptsSnapshot.docs[attemptsSnapshot.docs.length - 1];
    const hasMore = attemptsSnapshot.docs.length === limit;

    return NextResponse.json(
      {
        attempts,
        pagination: {
          limit,
          hasMore,
          lastDocId: hasMore && lastDoc ? lastDoc.id : null,
        },
      },
      {
        status: 200,
        headers: getPublicSecurityHeaders({
          rateLimitHeaders: rateLimitResult.headers,
          cacheControl: "no-store, no-cache, must-revalidate, proxy-revalidate",
        }),
      }
    );
  } catch (error) {
    // Try to get user for error context, but don't fail if auth fails
    let userId: string | undefined;
    try {
      const user = await verifyAuth(request);
      userId = user?.uid;
    } catch {
      // Ignore auth errors in error handler
    }
    return handleApiError(error, { route: "/api/teacher/quizzes/[id]/attempts", userId });
  }
}