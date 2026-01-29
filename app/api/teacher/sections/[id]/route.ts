import { type NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import { adminDb } from "@/lib/firebase-admin";
import { verifyCSRF } from "@/lib/csrf";
import {
  getSecurityHeaders,
  getErrorSecurityHeaders,
} from "@/lib/security-headers";
import { handleApiError } from "@/lib/error-handler";
import { SectionCreateSchema, validateInput } from "@/lib/validation";

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
    const sectionId = id;

    if (!sectionId) {
      return NextResponse.json(
        { error: "Section ID is required" },
        { status: 400, headers: getErrorSecurityHeaders() }
      );
    }

    // Get section
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
        { error: "Forbidden: You can only view your own sections" },
        { status: 403, headers: getErrorSecurityHeaders() }
      );
    }

    // Get students in this section
    const sectionStudentsSnapshot = await adminDb
      .collection("section_students")
      .where("sectionId", "==", sectionId)
      .get();

    const studentIds = sectionStudentsSnapshot.docs.map(
      (doc) => doc.data().studentId
    );

    let students: any[] = [];
    if (studentIds.length > 0) {
      const usersSnapshot = await adminDb
        .collection("users")
        .where("__name__", "in", studentIds.slice(0, 10))
        .get();

      students = usersSnapshot.docs.map((doc) => ({
        id: doc.id,
        email: doc.data().email,
        displayName: doc.data().displayName,
        role: doc.data().role,
      }));
    }

    return NextResponse.json(
      {
        section: {
          id: sectionDoc.id,
          ...sectionData,
          students,
        },
      },
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
      route: "/api/teacher/sections/[id]",
      userId,
    });
  }
}

export async function PUT(
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
        { error: "Forbidden: Teacher role required to update sections" },
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
        { error: "Forbidden: You can only update your own sections" },
        { status: 403, headers: getErrorSecurityHeaders() }
      );
    }

    const body = await request.json();
    const validation = validateInput(SectionCreateSchema, body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error },
        { status: 400, headers: getErrorSecurityHeaders() }
      );
    }

    const validatedData = validation.data;
    const uniqueStudentIds = Array.from(new Set(validatedData.studentIds));

    // Verify all students exist and are students
    if (uniqueStudentIds.length > 0) {
      const batchSize = 10;
      for (let i = 0; i < uniqueStudentIds.length; i += batchSize) {
        const batch = uniqueStudentIds.slice(i, i + batchSize);
        const usersSnapshot = await adminDb
          .collection("users")
          .where("__name__", "in", batch)
          .get();

        const foundIds = usersSnapshot.docs.map((doc) => doc.id);
        const missingIds = batch.filter((id) => !foundIds.includes(id));

        if (missingIds.length > 0) {
          return NextResponse.json(
            { error: `Students not found: ${missingIds.join(", ")}` },
            { status: 400, headers: getErrorSecurityHeaders() }
          );
        }

        for (const doc of usersSnapshot.docs) {
          if (doc.data().role !== "student") {
            return NextResponse.json(
              { error: `User ${doc.id} is not a student` },
              { status: 400, headers: getErrorSecurityHeaders() }
            );
          }
        }
      }
    }

    // Update section and student assignments in a transaction
    await adminDb.runTransaction(async (transaction) => {
      // Update section
      const sectionRef = adminDb.collection("sections").doc(sectionId);
      transaction.update(sectionRef, {
        name: validatedData.name,
        description: validatedData.description || "",
        updatedAt: new Date().toISOString(),
      });

      // Get current student assignments
      const currentStudentsSnapshot = await adminDb
        .collection("section_students")
        .where("sectionId", "==", sectionId)
        .get();

      const currentStudentIds = currentStudentsSnapshot.docs.map(
        (doc) => doc.data().studentId
      );

      // Remove students no longer in the section
      for (const doc of currentStudentsSnapshot.docs) {
        if (!uniqueStudentIds.includes(doc.data().studentId)) {
          transaction.delete(doc.ref);
        }
      }

      // Add new students
      for (const studentId of uniqueStudentIds) {
        if (!currentStudentIds.includes(studentId)) {
          const newDocRef = adminDb.collection("section_students").doc();
          transaction.set(newDocRef, {
            sectionId,
            studentId,
            createdAt: new Date().toISOString(),
          });
        }
      }
    });

    return NextResponse.json(
      { success: true, message: "Section updated successfully" },
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
      route: "/api/teacher/sections/[id]",
      userId,
    });
  }
}

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
