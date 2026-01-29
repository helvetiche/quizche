import { type NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import { adminDb } from "@/lib/firebase-admin";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import {
  getErrorSecurityHeaders,
  getPublicSecurityHeaders,
} from "@/lib/security-headers";
import { handleApiError } from "@/lib/error-handler";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const user = await verifyAuth(request);

    if (user === null || user === undefined) {
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

    if (id === null || id === undefined || id === "") {
      return NextResponse.json(
        { error: "Quiz ID is required" },
        { status: 400, headers: getErrorSecurityHeaders() }
      );
    }

    // Verify quiz belongs to this teacher
    const quizDoc = await adminDb.collection("quizzes").doc(id).get();

    if (quizDoc.exists === false) {
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
    const limitParam = url.searchParams.get("limit");
    const limit = Math.min(
      Math.max(parseInt(limitParam !== null ? limitParam : "50", 10), 1),
      100
    );
    const lastDocId = url.searchParams.get("lastDocId");

    // Get attempts for this quiz with pagination
    let attemptsQuery = adminDb
      .collection("quizAttempts")
      .where("quizId", "==", id)
      .orderBy("completedAt", "desc")
      .limit(limit);

    if (lastDocId !== null && lastDocId !== undefined && lastDocId !== "") {
      const lastDoc = await adminDb
        .collection("quizAttempts")
        .doc(lastDocId)
        .get();
      if (lastDoc.exists === true) {
        attemptsQuery = attemptsQuery.startAfter(lastDoc);
      }
    }

    const attemptsSnapshot = await attemptsQuery.get();

    // Collect user IDs from attempts that don't have denormalized data (legacy data)
    const userIdsToFetch = new Set<string>();
    attemptsSnapshot.docs.forEach((doc) => {
      const attemptData = doc.data();
      const userId = attemptData.userId as string;
      // Only fetch user if denormalized data is missing (legacy attempts)
      if (
        userId !== undefined &&
        userId !== null &&
        userId !== "" &&
        (attemptData.studentEmail === undefined ||
          attemptData.studentEmail === null ||
          attemptData.studentEmail === "" ||
          attemptData.studentName === undefined ||
          attemptData.studentName === null ||
          attemptData.studentName === "")
      ) {
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
        const userPromises = batch.map((userId) =>
          adminDb.collection("users").doc(userId).get()
        );
        const userDocs = await Promise.all(userPromises);
        userDocs.forEach((doc, index) => {
          if (doc.exists === true) {
            const userData = doc.data();
            const userDataObj = userData as Record<string, unknown>;
            userMap.set(batch[index], {
              email:
                typeof userDataObj.email === "string"
                  ? userDataObj.email
                  : "Unknown",
              displayName:
                typeof userDataObj.displayName === "string"
                  ? userDataObj.displayName
                  : "Unknown",
            });
          }
        });
      }
    }

    // Build attempts with student info - prefer denormalized data, fallback to user lookup
    const attempts = attemptsSnapshot.docs.map((doc) => {
      const attemptData = doc.data();
      const attemptDataObj = attemptData as Record<string, unknown>;
      // Use denormalized data if available (new attempts), otherwise use user lookup (legacy attempts)
      const studentEmail =
        typeof attemptDataObj.studentEmail === "string"
          ? attemptDataObj.studentEmail
          : undefined;
      const studentName =
        typeof attemptDataObj.studentName === "string"
          ? attemptDataObj.studentName
          : undefined;
      const userId = attemptDataObj.userId as string;
      const userInfo =
        studentEmail !== undefined &&
        studentEmail !== null &&
        studentEmail !== "" &&
        studentName !== undefined &&
        studentName !== null &&
        studentName !== ""
          ? {
              email: studentEmail,
              displayName: studentName,
            }
          : (userMap.get(userId) ?? {
              email: studentEmail ?? "Unknown",
              displayName: studentName ?? "Unknown",
            });

      const completedAtValue = attemptDataObj.completedAt;
      const completedAt =
        completedAtValue !== undefined &&
        completedAtValue !== null &&
        (completedAtValue as { toDate?: () => Date }).toDate !== undefined
          ? (completedAtValue as { toDate: () => Date }).toDate().toISOString()
          : completedAtValue instanceof Date
            ? completedAtValue.toISOString()
            : completedAtValue !== undefined && completedAtValue !== null
              ? String(completedAtValue)
              : new Date().toISOString();

      // Format violations if they exist
      const violations = Array.isArray(attemptDataObj.violations)
        ? (attemptDataObj.violations as Record<string, unknown>[])
        : [];
      const formattedViolations = violations.map((v) => {
        const violationObj = v;
        const timestampValue = violationObj.timestamp;
        const timestamp =
          timestampValue !== undefined &&
          timestampValue !== null &&
          (timestampValue as { toDate?: () => Date }).toDate !== undefined
            ? (timestampValue as { toDate: () => Date }).toDate().toISOString()
            : timestampValue !== undefined && timestampValue !== null
              ? String(timestampValue)
              : new Date().toISOString();
        return {
          type: violationObj.type,
          timestamp,
          details: violationObj.details,
        };
      });

      return {
        id: doc.id,
        userId: userId,
        studentEmail: userInfo.email,
        studentName: userInfo.displayName,
        answers:
          attemptDataObj.answers !== undefined &&
          attemptDataObj.answers !== null &&
          typeof attemptDataObj.answers === "object"
            ? (attemptDataObj.answers as Record<string, unknown>)
            : {},
        score:
          typeof attemptDataObj.score === "number" ? attemptDataObj.score : 0,
        totalQuestions:
          typeof attemptDataObj.totalQuestions === "number"
            ? attemptDataObj.totalQuestions
            : 0,
        percentage:
          typeof attemptDataObj.percentage === "number"
            ? attemptDataObj.percentage
            : 0,
        completedAt,
        timeSpent:
          typeof attemptDataObj.timeSpent === "number"
            ? attemptDataObj.timeSpent
            : 0,
        tabChangeCount:
          typeof attemptDataObj.tabChangeCount === "number"
            ? attemptDataObj.tabChangeCount
            : 0,
        timeAway:
          typeof attemptDataObj.timeAway === "number"
            ? attemptDataObj.timeAway
            : 0,
        refreshDetected: attemptDataObj.refreshDetected === true,
        violations: formattedViolations,
        disqualified: attemptDataObj.disqualified === true,
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
          lastDocId:
            hasMore === true && lastDoc !== undefined ? lastDoc.id : null,
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
    return handleApiError(error, {
      route: "/api/teacher/quizzes/[id]/attempts",
      userId,
    });
  }
}
