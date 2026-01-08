import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import { adminDb } from "@/lib/firebase-admin";
import { verifyCSRF } from "@/lib/csrf";
import {
  getSecurityHeaders,
  getErrorSecurityHeaders,
} from "@/lib/security-headers";
import { handleApiError } from "@/lib/error-handler";

export async function DELETE(
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
        { error: "Forbidden: Teacher role required to delete sections" },
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
    const sectionId = id;

    if (!sectionId) {
      return NextResponse.json(
        { error: "Section ID is required" },
        { status: 400, headers: getErrorSecurityHeaders() }
      );
    }

    // Check if section exists and belongs to this teacher
    const sectionDoc = await adminDb
      .collection("sections")
      .doc(sectionId)
      .get();

    if (!sectionDoc.exists) {
      return NextResponse.json(
        { error: "Section not found" },
        { status: 404, headers: getErrorSecurityHeaders() }
      );
    }

    const sectionData = sectionDoc.data();
    if (sectionData?.teacherId !== user.uid) {
      return NextResponse.json(
        { error: "Forbidden: You can only delete your own sections" },
        { status: 403, headers: getErrorSecurityHeaders() }
      );
    }

    // Use transaction for atomic deletion
    await adminDb.runTransaction(async (transaction) => {
      // Get all student assignments for this section
      const sectionStudentsSnapshot = await adminDb
        .collection("section_students")
        .where("sectionId", "==", sectionId)
        .get();

      // Delete all student assignments
      sectionStudentsSnapshot.docs.forEach((doc) => {
        transaction.delete(doc.ref);
      });

      // Delete the section
      const sectionRef = adminDb.collection("sections").doc(sectionId);
      transaction.delete(sectionRef);
    });

    return NextResponse.json(
      {
        success: true,
        message: "Section deleted successfully",
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
      route: "/api/teacher/sections/[id]",
      userId,
    });
  }
}
