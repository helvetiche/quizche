/* eslint-disable @typescript-eslint/strict-boolean-expressions, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unnecessary-condition, @typescript-eslint/prefer-nullish-coalescing, @typescript-eslint/no-explicit-any */
import { type NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import { adminDb } from "@/lib/firebase-admin";
import { verifyCSRF } from "@/lib/csrf";
import { SECTIONS_DEFAULT_LIMIT, SECTIONS_MAX_LIMIT } from "@/lib/constants";
import {
  getSecurityHeaders,
  getErrorSecurityHeaders,
} from "@/lib/security-headers";
import {
  SectionCreateSchema,
  validateInput,
  sanitizeString,
} from "@/lib/validation";
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
        { error: "Forbidden: Teacher role required to view sections" },
        { status: 403, headers: getErrorSecurityHeaders() }
      );
    }

    // Pagination support
    const url = new URL(request.url);
    const limit = Math.min(
      Math.max(
        parseInt(
          url.searchParams.get("limit") || SECTIONS_DEFAULT_LIMIT.toString(),
          10
        ),
        1
      ),
      SECTIONS_MAX_LIMIT
    );
    const lastDocId = url.searchParams.get("lastDocId");

    // Get sections created by this teacher with pagination
    let sectionsQuery = adminDb
      .collection("sections")
      .where("teacherId", "==", user.uid)
      .orderBy("createdAt", "desc")
      .limit(limit);

    if (lastDocId !== undefined && lastDocId !== null) {
      const lastDoc = await adminDb.collection("sections").doc(lastDocId).get();
      if (lastDoc.exists !== undefined && lastDoc.exists !== null) {
        sectionsQuery = sectionsQuery.startAfter(lastDoc);
      }
    }

    const sectionsSnapshot = await sectionsQuery.get();

    // Collect all section IDs
    const sectionIds = sectionsSnapshot.docs.map((doc) => doc.id);

    // Get all section_students relationships in batched `in` queries
    // (Firestore 'in' limit is 10, so batch section IDs)
    const sectionStudentsSnapshots = [];
    const sectionBatchSize = 10;
    for (let i = 0; i < sectionIds.length; i += sectionBatchSize) {
      const batch = sectionIds.slice(i, i + sectionBatchSize);
      // eslint-disable-next-line no-await-in-loop
      const snapshot = await adminDb
        .collection("section_students")
        .where("sectionId", "in", batch)
        .get();
      sectionStudentsSnapshots.push(snapshot);
    }

    // Collect unique student IDs and build denormalized map
    const studentIdsSet = new Set<string>();
    const denormalizedStudentMap = new Map<
      string,
      { email: string; displayName: string }
    >();
    sectionStudentsSnapshots.forEach((snapshot) => {
      snapshot.docs.forEach((doc: any) => {
        const data = doc.data();
        const studentId = data.studentId as string;
        if (studentId) studentIdsSet.add(studentId);

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
          denormalizedStudentMap.set(studentId, {
            email: studentEmail,
            displayName: studentName,
          });
        }
      });
    });

    const studentIds = Array.from(studentIdsSet);

    // Batch fetch users for legacy data (Firestore 'in' limit is 10)
    const userMap = new Map<string, { email: string; displayName: string }>();
    if (studentIds.length > 0) {
      const batchSize = 10;
      const userBatches = [];
      for (let i = 0; i < studentIds.length; i += batchSize) {
        userBatches.push(studentIds.slice(i, i + batchSize));
      }

      const allUserDocs = await Promise.all(
        userBatches.map((batch) =>
          Promise.all(
            batch.map((studentId) =>
              adminDb.collection("users").doc(studentId).get()
            )
          )
        )
      );

      allUserDocs.flat().forEach((doc) => {
        if (doc.exists !== undefined && doc.exists !== null) {
          const userData = doc.data();
          userMap.set(doc.id, {
            email:
              typeof userData?.email === "string" ? userData.email : "Unknown",
            displayName:
              typeof userData?.displayName === "string"
                ? userData.displayName
                : typeof userData?.firstName === "string"
                  ? userData.firstName
                  : "Unknown",
          });
        }
      });
    }

    // Build section-student mapping with denormalized data + fallback
    const sectionStudentsMap = new Map<string, string[]>();
    sectionStudentsSnapshots.forEach((snapshot) => {
      snapshot.docs.forEach((doc: any) => {
        const data = doc.data();
        const sectionId = data.sectionId as string;
        const studentId = data.studentId as string;
        if (!sectionStudentsMap.has(sectionId)) {
          sectionStudentsMap.set(sectionId, []);
        }
        sectionStudentsMap.get(sectionId)?.push(studentId);
      });
    });

    // Build sections with students (use denormalized data, fallback to user lookup)
    const sections = sectionsSnapshot.docs.map((doc) => {
      const sectionData = doc.data();
      const sectionStudentIds =
        sectionStudentsMap.get(doc.id) ?? ([] as never[]);
      const students = sectionStudentIds
        .map((studentId) => {
          const denormalized = denormalizedStudentMap.get(studentId);
          if (
            denormalized !== undefined &&
            denormalized.email !== "" &&
            denormalized.displayName !== ""
          ) {
            return denormalized;
          }
          return (
            userMap.get(studentId) ?? {
              email: "",
              displayName: "",
            }
          );
        })
        .filter(Boolean);

      const createdAt = sectionData.createdAt?.toDate
        ? sectionData.createdAt.toDate().toISOString()
        : sectionData.createdAt instanceof Date
          ? sectionData.createdAt.toISOString()
          : sectionData.createdAt || new Date().toISOString();

      const updatedAt = sectionData.updatedAt?.toDate
        ? sectionData.updatedAt.toDate().toISOString()
        : sectionData.updatedAt instanceof Date
          ? sectionData.updatedAt.toISOString()
          : sectionData.updatedAt || createdAt;

      return {
        id: doc.id,
        name: sectionData.name,
        description: sectionData.description ?? "",
        teacherId: sectionData.teacherId,
        students,
        createdAt,
        updatedAt,
      };
    });

    const lastDoc = sectionsSnapshot.docs[sectionsSnapshot.docs.length - 1];
    const hasMore = sectionsSnapshot.docs.length === limit;

    return NextResponse.json(
      {
        sections,
        pagination: {
          limit,
          hasMore,
          lastDocId: hasMore && lastDoc ? lastDoc.id : null,
        },
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
    return handleApiError(error, { route: "/api/teacher/sections", userId });
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
        { error: "Forbidden: Teacher role required to create sections" },
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
    const validation = validateInput(SectionCreateSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Invalid section data. Please check all fields.",
          details: validation.error.issues,
        },
        { status: 400, headers: getErrorSecurityHeaders() }
      );
    }

    const validatedData = validation.data; // Already sanitized by validateInput
    const uniqueStudentIds = Array.from(new Set(validatedData.studentIds));

    const batchSize = 10;
    const studentBatches = [];
    for (let i = 0; i < uniqueStudentIds.length; i += batchSize) {
      studentBatches.push(uniqueStudentIds.slice(i, i + batchSize));
    }

    const allStudentDocs = await Promise.all(
      studentBatches.map((batch) =>
        Promise.all(
          batch.map((studentId) =>
            adminDb.collection("users").doc(studentId).get()
          )
        )
      )
    );

    for (let i = 0; i < studentBatches.length; i++) {
      const batch = studentBatches[i];
      const studentDocs = allStudentDocs[i];

      for (let j = 0; j < studentDocs.length; j++) {
        const studentDoc = studentDocs[j];
        if (!studentDoc.exists || studentDoc.data()?.role !== "student") {
          return NextResponse.json(
            { error: `Student with ID ${batch[j]} not found or not a student` },
            { status: 400, headers: getErrorSecurityHeaders() }
          );
        }
      }
    }

    // Build a map of studentId → {email, displayName} from the fetched docs
    const studentDocsMap = new Map<
      string,
      { email: string; displayName: string }
    >();
    for (let i = 0; i < studentBatches.length; i++) {
      const batch = studentBatches[i];
      const studentDocs = allStudentDocs[i];
      for (let j = 0; j < studentDocs.length; j++) {
        const studentDoc = studentDocs[j];
        if (studentDoc.exists) {
          const data = studentDoc.data();
          studentDocsMap.set(batch[j], {
            email: typeof data?.email === "string" ? data.email : "",
            displayName:
              typeof data?.displayName === "string"
                ? data.displayName
                : typeof data?.firstName === "string"
                  ? data.firstName
                  : "",
          });
        }
      }
    }

    // Use transaction for atomic section creation
    const sectionData = {
      name: sanitizeString(validatedData.name),
      description: validatedData.description
        ? sanitizeString(validatedData.description)
        : "",
      teacherId: user.uid,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const sectionRef = adminDb.collection("sections").doc();

    // Use batch write for better performance and atomicity
    const batch = adminDb.batch();
    batch.set(sectionRef, sectionData);

    // Add students to section (with denormalized data to avoid N+1 reads on GET)
    uniqueStudentIds.forEach((studentId: string) => {
      const sectionStudentRef = adminDb.collection("section_students").doc();
      const studentInfo = studentDocsMap.get(studentId);
      batch.set(sectionStudentRef, {
        sectionId: sectionRef.id,
        studentId,
        studentEmail:
          studentInfo !== undefined && typeof studentInfo.email === "string"
            ? studentInfo.email
            : "",
        studentName:
          studentInfo !== undefined &&
          typeof studentInfo.displayName === "string"
            ? studentInfo.displayName
            : "",
        addedAt: new Date(),
      });
    });

    await batch.commit();

    return NextResponse.json(
      {
        success: true,
        id: sectionRef.id,
        message: "Section created successfully",
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
    return handleApiError(error, { route: "/api/teacher/sections", userId });
  }
}
