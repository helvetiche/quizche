import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import { adminDb } from "@/lib/firebase-admin";
import { verifyCSRF } from "@/lib/csrf";

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

    if (user.role !== "student") {
      const headers = {
        "Content-Type": "application/json; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "no-store, no-cache, must-revalidate",
      };
      return NextResponse.json(
        { error: "Forbidden: Student role required to submit quizzes" },
        { status: 403, headers }
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

    if (!body.quizId || typeof body.quizId !== "string") {
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

    if (!body.answers || !Array.isArray(body.answers)) {
      const headers = {
        "Content-Type": "application/json; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "no-store, no-cache, must-revalidate",
      };
      return NextResponse.json(
        { error: "Answers array is required" },
        { status: 400, headers }
      );
    }

    // Get quiz data
    const quizDoc = await adminDb.collection("quizzes").doc(body.quizId).get();

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

    // Check if student already submitted this quiz (always prevent retakes)
    const existingAttempts = await adminDb
      .collection("quizAttempts")
      .where("userId", "==", user.uid)
      .where("quizId", "==", body.quizId)
      .get();

    if (!existingAttempts.empty) {
      const headers = {
        "Content-Type": "application/json; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "no-store, no-cache, must-revalidate",
      };
      return NextResponse.json(
        {
          error:
            "You have already taken this quiz. Each quiz can only be taken once.",
        },
        { status: 400, headers }
      );
    }

    // Calculate score
    const questions = quizData?.questions || [];
    let score = 0;
    const answerMap: Record<number, string> = {};

    body.answers.forEach((answer: any) => {
      if (
        typeof answer.questionIndex === "number" &&
        typeof answer.answer === "string"
      ) {
        answerMap[answer.questionIndex] = answer.answer.trim().toLowerCase();
      }
    });

    questions.forEach((question: any, index: number) => {
      const studentAnswer = answerMap[index];
      const correctAnswer = question.answer?.trim().toLowerCase() || "";

      if (studentAnswer === correctAnswer) {
        score++;
      }
    });

    const totalQuestions = questions.length;
    const percentage =
      totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0;

    // Get user info for denormalization (to avoid lookups later)
    const userDoc = await adminDb.collection("users").doc(user.uid).get();
    const userData = userDoc.exists ? userDoc.data() : null;

    // Save attempt with denormalized student info
    const attemptData = {
      userId: user.uid,
      quizId: body.quizId,
      quizTitle: quizData?.title || "",
      teacherId: quizData?.teacherId || "",
      studentEmail: userData?.email || "",
      studentName: userData?.displayName || "",
      answers: answerMap,
      score,
      totalQuestions,
      percentage,
      completedAt: new Date(),
      timeSpent: body.timeSpent || 0,
      tabChangeCount: body.tabChangeCount || 0,
      timeAway: body.timeAway || 0,
      refreshDetected: body.refreshDetected || false,
      violations: body.violations || [],
      disqualified: body.disqualified || false,
    };

    const attemptRef = await adminDb
      .collection("quizAttempts")
      .add(attemptData);

    // Cleanup active session if exists
    if (body.sessionId) {
      try {
        const sessionDoc = await adminDb
          .collection("activeQuizSessions")
          .doc(body.sessionId)
          .get();

        if (sessionDoc.exists) {
          await adminDb
            .collection("activeQuizSessions")
            .doc(body.sessionId)
            .update({
              status: body.disqualified ? "disqualified" : "completed",
              lastActivity: new Date(),
            });
        }
      } catch (error) {
        console.error("Error cleaning up session:", error);
        // Don't fail the submission if session cleanup fails
      }
    }

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
        attemptId: attemptRef.id,
        score,
        totalQuestions,
        percentage,
        message: "Quiz submitted successfully",
      },
      { status: 200, headers }
    );
  } catch (error) {
    console.error("Submit quiz error:", error);

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
