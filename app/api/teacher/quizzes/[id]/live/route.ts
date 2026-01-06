import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import { adminDb } from "@/lib/firebase-admin";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    if (user.role !== "teacher") {
      const headers = {
        "Content-Type": "application/json; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "no-store, no-cache, must-revalidate",
      };
      return NextResponse.json(
        { error: "Forbidden: Teacher role required" },
        { status: 403, headers }
      );
    }

    const { id } = await params;

    if (!id) {
      const headers = {
        "Content-Type": "application/json; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "no-store, no-cache, must-revalidate",
      };
      return NextResponse.json(
        { error: "Quiz ID is required" },
        { status: 400, headers }
      );
    }

    // Verify quiz belongs to this teacher
    const quizDoc = await adminDb.collection("quizzes").doc(id).get();

    if (!quizDoc.exists) {
      const headers = {
        "Content-Type": "application/json; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "no-store, no-cache, must-revalidate",
      };
      return NextResponse.json(
        { error: "Quiz not found" },
        { status: 404, headers }
      );
    }

    const quizData = quizDoc.data();

    if (quizData?.teacherId !== user.uid) {
      const headers = {
        "Content-Type": "application/json; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "no-store, no-cache, must-revalidate",
      };
      return NextResponse.json(
        { error: "Forbidden: You can only view live sessions for your own quizzes" },
        { status: 403, headers }
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

    const headers = {
      "Content-Type": "application/json; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "no-store, no-cache, must-revalidate",
    };

    return NextResponse.json(
      { sessions },
      { status: 200, headers }
    );
  } catch (error) {
    console.error("Get live sessions error:", error);

    const errorHeaders = {
      "Content-Type": "application/json; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "no-store, no-cache, must-revalidate",
    };

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: errorHeaders }
    );
  }
}
