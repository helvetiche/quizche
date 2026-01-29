import { type NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import { adminDb } from "@/lib/firebase-admin";
import { verifyCSRF } from "@/lib/csrf";
import {
  getSecurityHeaders,
  getErrorSecurityHeaders,
} from "@/lib/security-headers";
import { SessionUpdateSchema, validateInput } from "@/lib/validation";
import { handleApiError } from "@/lib/error-handler";

export async function POST(
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

    if (user.role !== "student") {
      return NextResponse.json(
        { error: "Forbidden: Student role required" },
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

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "Quiz ID is required" },
        { status: 400, headers: getErrorSecurityHeaders() }
      );
    }

    // Verify quiz exists
    const quizDoc = await adminDb.collection("quizzes").doc(id).get();
    if (!quizDoc.exists) {
      return NextResponse.json(
        { error: "Quiz not found" },
        { status: 404, headers: getErrorSecurityHeaders() }
      );
    }

    // Check if student has already taken this quiz (prevent retakes)
    const existingAttempts = await adminDb
      .collection("quizAttempts")
      .where("userId", "==", user.uid)
      .where("quizId", "==", id)
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

    // Check if session already exists
    const existingSessions = await adminDb
      .collection("activeQuizSessions")
      .where("quizId", "==", id)
      .where("userId", "==", user.uid)
      .where("status", "==", "active")
      .get();

    if (!existingSessions.empty) {
      const existingSession = existingSessions.docs[0];
      return NextResponse.json(
        {
          sessionId: existingSession.id,
          message: "Session already exists",
        },
        { status: 200, headers: getSecurityHeaders() }
      );
    }

    // Get user info
    const userDoc = await adminDb.collection("users").doc(user.uid).get();
    const userData = userDoc.exists ? userDoc.data() : null;

    // Create new session
    const sessionData = {
      quizId: id,
      userId: user.uid,
      studentEmail: userData?.email || "",
      studentName: userData?.displayName || "",
      startedAt: new Date(),
      lastActivity: new Date(),
      tabChangeCount: 0,
      timeAway: 0,
      violations: [],
      disqualified: false,
      status: "active" as const,
    };

    const sessionRef = await adminDb
      .collection("activeQuizSessions")
      .add(sessionData);

    return NextResponse.json(
      {
        sessionId: sessionRef.id,
        message: "Session created successfully",
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
    return handleApiError(error, {
      route: "/api/student/quizzes/[id]/session",
      userId,
    });
  }
}

export async function PUT(request: NextRequest): Promise<NextResponse> {
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
        { error: "Forbidden: Student role required" },
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
    const validation = validateInput(SessionUpdateSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Invalid session update data. Please check all fields.",
          details: validation.error.issues,
        },
        { status: 400, headers: getErrorSecurityHeaders() }
      );
    }

    const validatedData = validation.data;
    const { sessionId } = validatedData;

    // Verify session belongs to user
    const sessionDoc = await adminDb
      .collection("activeQuizSessions")
      .doc(sessionId)
      .get();

    if (!sessionDoc.exists) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404, headers: getErrorSecurityHeaders() }
      );
    }

    const sessionData = sessionDoc.data();
    if (sessionData?.userId !== user.uid) {
      return NextResponse.json(
        { error: "Forbidden: Session does not belong to user" },
        { status: 403, headers: getErrorSecurityHeaders() }
      );
    }

    // Update session
    const updateData: any = {
      lastActivity: new Date(),
    };

    if (validatedData.tabChangeCount !== undefined)
      updateData.tabChangeCount = validatedData.tabChangeCount;
    if (validatedData.timeAway !== undefined)
      updateData.timeAway = validatedData.timeAway;
    if (validatedData.violations !== undefined)
      updateData.violations = validatedData.violations;
    if (validatedData.disqualified !== undefined) {
      updateData.disqualified = validatedData.disqualified;
      updateData.status = validatedData.disqualified
        ? "disqualified"
        : "active";
    }

    await adminDb
      .collection("activeQuizSessions")
      .doc(sessionId)
      .update(updateData);

    return NextResponse.json(
      { message: "Session updated successfully" },
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
    return handleApiError(error, {
      route: "/api/student/quizzes/[id]/session",
      userId,
    });
  }
}

export async function DELETE(request: NextRequest): Promise<NextResponse> {
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
        { error: "Forbidden: Student role required" },
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

    const url = new URL(request.url);
    const sessionId = url.searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID is required" },
        { status: 400, headers: getErrorSecurityHeaders() }
      );
    }

    // Verify session belongs to user
    const sessionDoc = await adminDb
      .collection("activeQuizSessions")
      .doc(sessionId)
      .get();

    if (!sessionDoc.exists) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404, headers: getErrorSecurityHeaders() }
      );
    }

    const sessionData = sessionDoc.data();
    if (sessionData?.userId !== user.uid) {
      return NextResponse.json(
        { error: "Forbidden: Session does not belong to user" },
        { status: 403, headers: getErrorSecurityHeaders() }
      );
    }

    // Update status to completed instead of deleting
    await adminDb.collection("activeQuizSessions").doc(sessionId).update({
      status: "completed",
      lastActivity: new Date(),
    });

    return NextResponse.json(
      { message: "Session ended successfully" },
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
    return handleApiError(error, {
      route: "/api/student/quizzes/[id]/session",
      userId,
    });
  }
}
