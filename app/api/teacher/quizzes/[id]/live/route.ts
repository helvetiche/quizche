import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import { adminDb } from "@/lib/firebase-admin";
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
        { error: "Forbidden: Teacher role required" },
        { status: 403, headers: getErrorSecurityHeaders() }
      );
    }

    const { id } = await params;

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
        { error: "Forbidden: You can only view live sessions for your own quizzes" },
        { status: 403, headers: getErrorSecurityHeaders() }
      );
    }

    // Get active sessions for this quiz
    const activeSessionsSnapshot = await adminDb
      .collection("activeQuizSessions")
      .where("quizId", "==", id)
      .where("status", "==", "active")
      .get();

    const sessions = activeSessionsSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        quizId: data.quizId,
        userId: data.userId,
        studentEmail: data.studentEmail || "",
        studentName: data.studentName || "",
        startedAt: data.startedAt?.toDate?.()?.toISOString() || data.startedAt,
        lastActivity: data.lastActivity?.toDate?.()?.toISOString() || data.lastActivity,
        tabChangeCount: data.tabChangeCount || 0,
        timeAway: data.timeAway || 0,
        violations: data.violations || [],
        disqualified: data.disqualified || false,
        status: data.status || "active",
      };
    });

    return NextResponse.json(
      { sessions },
      {
        status: 200,
        headers: getPublicSecurityHeaders({
          cacheControl: "no-store, no-cache, must-revalidate",
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
    return handleApiError(error, { route: "/api/teacher/quizzes/[id]/live", userId });
  }
}
