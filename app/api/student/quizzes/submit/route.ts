import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import { adminDb } from "@/lib/firebase-admin";
import { verifyCSRF } from "@/lib/csrf";
import {
  getSecurityHeaders,
  getErrorSecurityHeaders,
} from "@/lib/security-headers";
import {
  QuizSubmissionSchema,
  validateInput,
  sanitizeString,
} from "@/lib/validation";
import { handleApiError } from "@/lib/error-handler";

export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized: Invalid or missing authentication token" },
        { status: 401, headers: getErrorSecurityHeaders() }
      );
    }

    if (user.role !== "student") {
      return NextResponse.json(
        { error: "Forbidden: Student role required to submit quizzes" },
        { status: 403, headers: getErrorSecurityHeaders() }
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
    const validation = validateInput(QuizSubmissionSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Invalid submission data. Please check all fields.",
          details: validation.error.issues,
        },
        { status: 400, headers: getErrorSecurityHeaders() }
      );
    }

    const validatedData = validation.data;

    // Get quiz data
    const quizDoc = await adminDb
      .collection("quizzes")
      .doc(validatedData.quizId)
      .get();

    if (!quizDoc.exists) {
      return NextResponse.json(
        { error: "Quiz not found" },
        { status: 404, headers: getErrorSecurityHeaders() }
      );
    }

    const quizData = quizDoc.data();

    // Check if student already submitted this quiz (always prevent retakes)
    const existingAttempts = await adminDb
      .collection("quizAttempts")
      .where("userId", "==", user.uid)
      .where("quizId", "==", validatedData.quizId)
      .get();

    if (!existingAttempts.empty) {
      return NextResponse.json(
        {
          error:
            "You have already taken this quiz. Each quiz can only be taken once.",
        },
        { status: 400, headers: getErrorSecurityHeaders() }
      );
    }

    // Calculate score
    const questions = quizData?.questions || [];
    let score = 0;
    const answerMap: Record<number, string> = {};

    validatedData.answers.forEach((answer) => {
      answerMap[answer.questionIndex] = sanitizeString(answer.answer).toLowerCase();
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
      quizId: validatedData.quizId,
      quizTitle: quizData?.title || "",
      teacherId: quizData?.teacherId || "",
      studentEmail: userData?.email || "",
      studentName: userData?.displayName || "",
      answers: answerMap,
      score,
      totalQuestions,
      percentage,
      completedAt: new Date(),
      timeSpent: validatedData.timeSpent || 0,
      tabChangeCount: validatedData.tabChangeCount || 0,
      timeAway: validatedData.timeAway || 0,
      refreshDetected: validatedData.refreshDetected || false,
      violations: validatedData.violations || [],
      disqualified: validatedData.disqualified || false,
    };

    const attemptRef = await adminDb
      .collection("quizAttempts")
      .add(attemptData);

    // Cleanup active session if exists
    if (validatedData.sessionId) {
      try {
        const sessionDoc = await adminDb
          .collection("activeQuizSessions")
          .doc(validatedData.sessionId)
          .get();

        if (sessionDoc.exists) {
          await adminDb
            .collection("activeQuizSessions")
            .doc(validatedData.sessionId)
            .update({
              status: validatedData.disqualified ? "disqualified" : "completed",
              lastActivity: new Date(),
            });
        }
      } catch (error) {
        console.error("Error cleaning up session:", error);
        // Don't fail the submission if session cleanup fails
      }
    }

    return NextResponse.json(
      {
        success: true,
        attemptId: attemptRef.id,
        score,
        totalQuestions,
        percentage,
        message: "Quiz submitted successfully",
      },
      { status: 200, headers: getSecurityHeaders() }
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
    return handleApiError(error, { route: "/api/student/quizzes/submit", userId });
  }
}
