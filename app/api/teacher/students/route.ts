import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import { adminDb } from "@/lib/firebase-admin";
import { verifyCSRF } from "@/lib/csrf";
import {
  getSecurityHeaders,
  getErrorSecurityHeaders,
  getPublicSecurityHeaders,
} from "@/lib/security-headers";
import { StudentAssignmentSchema, validateInput } from "@/lib/validation";
import { handleApiError } from "@/lib/error-handler";

export async function GET(request: NextRequest) {
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
        { error: "Forbidden: Teacher role required to view students" },
        { status: 403, headers: getErrorSecurityHeaders() }
      );
    }

    // Get students assigned to this teacher
    const teacherStudentsSnapshot = await adminDb
      .collection("teacher_students")
      .where("teacherId", "==", user.uid)
      .orderBy("createdAt", "desc")
      .get();

    const studentPromises = teacherStudentsSnapshot.docs.map(async (doc) => {
      const data = doc.data();
      const studentDoc = await adminDb.collection("users").doc(data.studentId).get();

      if (!studentDoc.exists) return null;

      const studentData = studentDoc.data();
      const createdAt = data.createdAt?.toDate
        ? data.createdAt.toDate().toISOString()
        : data.createdAt instanceof Date
          ? data.createdAt.toISOString()
          : data.createdAt || new Date().toISOString();

      return {
        id: studentDoc.id,
        email: studentData?.email || "",
        displayName: studentData?.displayName || "",
        role: studentData?.role || "student",
        createdAt,
      };
    });

    const students = (await Promise.all(studentPromises)).filter(Boolean);

    return NextResponse.json(
      { students },
      {
        status: 200,
        headers: getPublicSecurityHeaders({
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
    return handleApiError(error, { route: "/api/teacher/students", userId });
  }
}

export async function POST(request: NextRequest) {
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
        { error: "Forbidden: Teacher role required to add students" },
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
    const validation = validateInput(StudentAssignmentSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Invalid input data. Please check all fields.",
          details: validation.error.issues,
        },
        { status: 400, headers: getErrorSecurityHeaders() }
      );
    }

    const { studentId } = validation.data;

    // Verify student exists and is a student role
    const studentDoc = await adminDb.collection("users").doc(studentId).get();

    if (!studentDoc.exists) {
      return NextResponse.json(
        { error: "Student not found" },
        { status: 404, headers: getErrorSecurityHeaders() }
      );
    }

    const studentData = studentDoc.data();
    if (studentData?.role !== "student") {
      return NextResponse.json(
        { error: "User is not a student" },
        { status: 400, headers: getErrorSecurityHeaders() }
      );
    }

    // Check if student is already assigned to this teacher
    const existingAssignment = await adminDb
      .collection("teacher_students")
      .where("teacherId", "==", user.uid)
      .where("studentId", "==", studentId)
      .get();

    if (!existingAssignment.empty) {
      return NextResponse.json(
        { error: "Student is already assigned to this teacher" },
        { status: 400, headers: getErrorSecurityHeaders() }
      );
    }

    // Add student to teacher
    await adminDb.collection("teacher_students").add({
      teacherId: user.uid,
      studentId: studentId,
      createdAt: new Date(),
    });

    return NextResponse.json(
      {
        success: true,
        message: "Student added successfully",
      },
      { status: 201, headers: getSecurityHeaders() }
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
    return handleApiError(error, { route: "/api/teacher/students", userId });
  }
}