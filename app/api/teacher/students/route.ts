/* eslint-disable @typescript-eslint/strict-boolean-expressions, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unnecessary-condition, @typescript-eslint/prefer-nullish-coalescing */
import { type NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import { adminDb } from "@/lib/firebase-admin";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { verifyCSRF } from "@/lib/csrf";
import {
  getSecurityHeaders,
  getErrorSecurityHeaders,
  getPublicSecurityHeaders,
} from "@/lib/security-headers";
import { StudentAssignmentSchema, validateInput } from "@/lib/validation";
import { handleApiError } from "@/lib/error-handler";

export async function GET(request: NextRequest): Promise<NextResponse> {
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

    // Rate limiting
    const rateLimitResult = await rateLimit({
      identifier: user.uid,
      key: "teacher:students",
      limit: RATE_LIMITS.history.limit,
      window: RATE_LIMITS.history.window,
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

    // Get students assigned to this teacher
    const teacherStudentsSnapshot = await adminDb
      .collection("teacher_students")
      .where("teacherId", "==", user.uid)
      .orderBy("createdAt", "desc")
      .get();

    // Collect student IDs that need user doc lookup (legacy data without denormalized fields)
    const userIdsToFetch = new Set<string>();
    const students = teacherStudentsSnapshot.docs.map((doc) => {
      const data = doc.data();
      const studentEmail = data.studentEmail as string | undefined;
      const studentName = data.studentName as string | undefined;

      if (
        studentEmail !== undefined &&
        studentEmail !== null &&
        studentEmail !== "" &&
        studentName !== undefined &&
        studentName !== null &&
        studentName !== ""
      ) {
        const createdAt = data.createdAt?.toDate
          ? data.createdAt.toDate().toISOString()
          : data.createdAt instanceof Date
            ? data.createdAt.toISOString()
            : data.createdAt || new Date().toISOString();

        return {
          id: doc.id,
          studentId: data.studentId,
          email: studentEmail,
          displayName: studentName,
          role: "student",
          createdAt,
        };
      }

      userIdsToFetch.add(data.studentId);
      return null;
    }).filter(Boolean) as { id: string; studentId: string; email: string; displayName: string; role: string; createdAt: string }[];

    // Batch fetch users for legacy data (Firestore 'in' limit is 10)
    const userMap = new Map<string, { email: string; displayName: string }>();
    if (userIdsToFetch.size > 0) {
      const userIdsArray = Array.from(userIdsToFetch);
      const batchSize = 10;
      for (let i = 0; i < userIdsArray.length; i += batchSize) {
        const batch = userIdsArray.slice(i, i + batchSize);
        const userPromises = batch.map((studentId) =>
          adminDb.collection("users").doc(studentId).get()
        );
        // eslint-disable-next-line no-await-in-loop
        const userDocs = await Promise.all(userPromises);
        userDocs.forEach((userDoc) => {
          if (userDoc.exists) {
            const userData = userDoc.data();
            userMap.set(
              userDoc.id,
              {
                email: typeof userData?.email === "string" ? userData.email : "Unknown",
                displayName:
                  typeof userData?.displayName === "string"
                    ? userData.displayName
                    : typeof userData?.firstName === "string"
                      ? userData.firstName
                      : "Unknown",
              }
            );
          }
        });
      }
    }

    // Fill in legacy data from userMap
    const enrichedStudents = students.map((student) => {
      if (
        student.email !== undefined &&
        student.email !== "" &&
        student.displayName !== undefined &&
        student.displayName !== ""
      ) {
        return student;
      }
      const userInfo = userMap.get(student.studentId);
      return {
        ...student,
        email: userInfo?.email ?? "",
        displayName: userInfo?.displayName ?? "",
      };
    });

    return NextResponse.json(
      { students: enrichedStudents },
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

export async function POST(request: NextRequest): Promise<NextResponse> {
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
    if (csrfError !== undefined && csrfError !== null) {
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
    if (studentData !== undefined && studentData.role !== "student") {
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

    // Add student to teacher (with denormalized data to avoid N+1 reads on GET)
    await adminDb.collection("teacher_students").add({
      teacherId: user.uid,
      studentId: studentId,
      studentEmail: typeof studentData?.email === "string" ? studentData.email : "",
      studentName:
        typeof studentData?.displayName === "string"
          ? studentData.displayName
          : typeof studentData?.firstName === "string"
            ? studentData.firstName
            : "",
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
