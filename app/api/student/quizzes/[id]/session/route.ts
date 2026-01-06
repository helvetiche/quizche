import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import { adminDb } from "@/lib/firebase-admin";
import { verifyCSRF } from "@/lib/csrf";

export async function POST(
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

    // Verify quiz exists
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

    // Check if student has already taken this quiz (prevent retakes)
    const existingAttempts = await adminDb
      .collection("quizAttempts")
      .where("userId", "==", user.uid)
      .where("quizId", "==", id)
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

    // Check if session already exists
    const existingSessions = await adminDb
      .collection("activeQuizSessions")
      .where("quizId", "==", id)
      .where("userId", "==", user.uid)
      .where("status", "==", "active")
      .get();

    if (!existingSessions.empty) {
      const existingSession = existingSessions.docs[0];
      const headers = {
        "Content-Type": "application/json; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "no-store, no-cache, must-revalidate",
      };
      return NextResponse.json(
        {
          sessionId: existingSession.id,
          message: "Session already exists",
        },
        { status: 200, headers }
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

    const headers = {
      "Content-Type": "application/json; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "no-store, no-cache, must-revalidate",
    };

    return NextResponse.json(
      {
        sessionId: sessionRef.id,
        message: "Session created successfully",
      },
      { status: 200, headers }
    );
  } catch (error) {
    console.error("Create session error:", error);

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

export async function PUT(
  request: NextRequest
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

    // CSRF protection
    const csrfError = await verifyCSRF(request, user.uid);
    if (csrfError) {
      return NextResponse.json(
        { error: csrfError.error },
        { status: csrfError.status, headers: csrfError.headers }
      );
    }

    const body = await request.json();
    const { sessionId, tabChangeCount, timeAway, violations, disqualified } =
      body;

    if (!sessionId) {
      const headers = {
        "Content-Type": "application/json; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "no-store, no-cache, must-revalidate",
      };
      return NextResponse.json(
        { error: "Session ID is required" },
        { status: 400, headers }
      );
    }

    // Verify session belongs to user
    const sessionDoc = await adminDb
      .collection("activeQuizSessions")
      .doc(sessionId)
      .get();

    if (!sessionDoc.exists) {
      const headers = {
        "Content-Type": "application/json; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "no-store, no-cache, must-revalidate",
      };
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404, headers }
      );
    }

    const sessionData = sessionDoc.data();
    if (sessionData?.userId !== user.uid) {
      const headers = {
        "Content-Type": "application/json; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "no-store, no-cache, must-revalidate",
      };
      return NextResponse.json(
        { error: "Forbidden: Session does not belong to user" },
        { status: 403, headers }
      );
    }

    // Update session
    const updateData: any = {
      lastActivity: new Date(),
    };

    if (tabChangeCount !== undefined)
      updateData.tabChangeCount = tabChangeCount;
    if (timeAway !== undefined) updateData.timeAway = timeAway;
    if (violations !== undefined) updateData.violations = violations;
    if (disqualified !== undefined) {
      updateData.disqualified = disqualified;
      updateData.status = disqualified ? "disqualified" : "active";
    }

    await adminDb
      .collection("activeQuizSessions")
      .doc(sessionId)
      .update(updateData);

    const headers = {
      "Content-Type": "application/json; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "no-store, no-cache, must-revalidate",
    };

    return NextResponse.json(
      { message: "Session updated successfully" },
      { status: 200, headers }
    );
  } catch (error) {
    console.error("Update session error:", error);

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

export async function DELETE(
  request: NextRequest
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
      const headers = {
        "Content-Type": "application/json; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "no-store, no-cache, must-revalidate",
      };
      return NextResponse.json(
        { error: "Session ID is required" },
        { status: 400, headers }
      );
    }

    // Verify session belongs to user
    const sessionDoc = await adminDb
      .collection("activeQuizSessions")
      .doc(sessionId)
      .get();

    if (!sessionDoc.exists) {
      const headers = {
        "Content-Type": "application/json; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "no-store, no-cache, must-revalidate",
      };
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404, headers }
      );
    }

    const sessionData = sessionDoc.data();
    if (sessionData?.userId !== user.uid) {
      const headers = {
        "Content-Type": "application/json; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "no-store, no-cache, must-revalidate",
      };
      return NextResponse.json(
        { error: "Forbidden: Session does not belong to user" },
        { status: 403, headers }
      );
    }

    // Update status to completed instead of deleting
    await adminDb.collection("activeQuizSessions").doc(sessionId).update({
      status: "completed",
      lastActivity: new Date(),
    });

    const headers = {
      "Content-Type": "application/json; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "no-store, no-cache, must-revalidate",
    };

    return NextResponse.json(
      { message: "Session ended successfully" },
      { status: 200, headers }
    );
  } catch (error) {
    console.error("Delete session error:", error);

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
