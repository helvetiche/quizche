/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unnecessary-condition, @typescript-eslint/explicit-function-return-type, @typescript-eslint/no-unsafe-return */
import { type NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import { adminDb } from "@/lib/firebase-admin";
import { verifyCSRF } from "@/lib/csrf";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import {
  getSecurityHeaders,
  getErrorSecurityHeaders,
} from "@/lib/security-headers";
import { handleApiError } from "@/lib/error-handler";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await verifyAuth(request);
    const { id: quizId } = await params;

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401, headers: getErrorSecurityHeaders() }
      );
    }

    if (user.role !== "teacher") {
      return NextResponse.json(
        { error: "Forbidden: Teacher role required" },
        { status: 403, headers: getErrorSecurityHeaders() }
      );
    }

    // Rate limiting
    const rateLimitResult = await rateLimit({
      identifier: user.uid,
      key: `quizzes:sections:${quizId}`,
      limit: RATE_LIMITS.general.limit,
      window: RATE_LIMITS.general.window,
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

    // CSRF protection
    const csrfError = await verifyCSRF(request, user.uid);
    if (csrfError !== undefined && csrfError !== null) {
      return NextResponse.json(
        { error: csrfError.error },
        { status: csrfError.status, headers: csrfError.headers }
      );
    }

    // Verify quiz exists and belongs to this teacher
    const quizDoc = await adminDb.collection("quizzes").doc(quizId).get();
    if (!quizDoc.exists) {
      return NextResponse.json(
        { error: "Quiz not found" },
        { status: 404, headers: getErrorSecurityHeaders() }
      );
    }

    const quizData = quizDoc.data();
    if (quizData !== undefined && quizData.teacherId !== user.uid) {
      return NextResponse.json(
        { error: "Forbidden: You don't own this quiz" },
        { status: 403, headers: getErrorSecurityHeaders() }
      );
    }

    const body = await request.json();
    const { sectionIds, excludedStudentIds = [] } = body;

    if (!Array.isArray(sectionIds)) {
      return NextResponse.json(
        { error: "sectionIds must be an array" },
        { status: 400, headers: getErrorSecurityHeaders() }
      );
    }

    if (!Array.isArray(excludedStudentIds)) {
      return NextResponse.json(
        { error: "excludedStudentIds must be an array" },
        { status: 400, headers: getErrorSecurityHeaders() }
      );
    }

    // Validate that all sections exist and belong to this teacher
    for (const sectionId of sectionIds) {
      // eslint-disable-next-line no-await-in-loop
      const sectionDoc = await adminDb
        .collection("sections")
        .doc(sectionId)
        .get();
      if (!sectionDoc.exists) {
        return NextResponse.json(
          { error: `Section ${sectionId} not found` },
          { status: 400, headers: getErrorSecurityHeaders() }
        );
      }
      if (sectionDoc.data()?.teacherId !== user.uid) {
        return NextResponse.json(
          { error: `Section ${sectionId} doesn't belong to you` },
          { status: 403, headers: getErrorSecurityHeaders() }
        );
      }
    }

    // Delete existing quiz_sections for this quiz
    const existingAssignments = await adminDb
      .collection("quiz_sections")
      .where("quizId", "==", quizId)
      .get();

    // Delete existing excluded students for this quiz
    const existingExclusions = await adminDb
      .collection("quiz_excluded_students")
      .where("quizId", "==", quizId)
      .get();

    const batch = adminDb.batch();

    // Delete old assignments
    existingAssignments.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    // Delete old exclusions
    existingExclusions.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    // Create new assignments
    for (const sectionId of sectionIds) {
      const newAssignmentRef = adminDb.collection("quiz_sections").doc();
      batch.set(newAssignmentRef, {
        quizId,
        sectionId,
        assignedAt: new Date(),
      });
    }

    // Create new exclusions
    for (const studentId of excludedStudentIds) {
      const newExclusionRef = adminDb
        .collection("quiz_excluded_students")
        .doc();
      batch.set(newExclusionRef, {
        quizId,
        studentId,
        excludedAt: new Date(),
      });
    }

    await batch.commit();

    return NextResponse.json(
      { success: true, message: "Section assignments updated" },
      { status: 200, headers: getSecurityHeaders() }
    );
  } catch (error) {
    let userId: string | undefined;
    try {
      const user = await verifyAuth(request);
      userId = user?.uid;
    } catch {
      // Ignore
    }
    return handleApiError(error, {
      route: "/api/quizzes/[id]/sections",
      userId,
    });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await verifyAuth(request);
    const { id: quizId } = await params;

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401, headers: getErrorSecurityHeaders() }
      );
    }

    // Get section assignments for this quiz
    const assignmentsSnapshot = await adminDb
      .collection("quiz_sections")
      .where("quizId", "==", quizId)
      .get();

    const sectionIds = assignmentsSnapshot.docs.map(
      (doc) => doc.data().sectionId
    );

    // Get excluded students for this quiz
    const exclusionsSnapshot = await adminDb
      .collection("quiz_excluded_students")
      .where("quizId", "==", quizId)
      .get();

    const excludedStudentIds = exclusionsSnapshot.docs.map(
      (doc) => doc.data().studentId
    );

    return NextResponse.json(
      { sectionIds, excludedStudentIds },
      { status: 200, headers: getSecurityHeaders() }
    );
  } catch (error) {
    let userId: string | undefined;
    try {
      const user = await verifyAuth(request);
      userId = user?.uid;
    } catch {
      // Ignore
    }
    return handleApiError(error, {
      route: "/api/quizzes/[id]/sections",
      userId,
    });
  }
}
