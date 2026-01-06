import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import { adminDb } from "@/lib/firebase-admin";
import { verifyCSRF } from "@/lib/csrf";

export async function GET(request: NextRequest) {
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

    if (user.role !== "teacher") {
      const headers = {
        "Content-Type": "application/json; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "no-store, no-cache, must-revalidate",
      };
      return NextResponse.json(
        { error: "Forbidden: Teacher role required to view sections" },
        { status: 403, headers }
      );
    }

    // Pagination support
    const url = new URL(request.url);
    const limit = Math.min(Math.max(parseInt(url.searchParams.get("limit") || "50"), 1), 100);
    const lastDocId = url.searchParams.get("lastDocId");

    // Get sections created by this teacher with pagination
    let sectionsQuery = adminDb
      .collection("sections")
      .where("teacherId", "==", user.uid)
      .orderBy("createdAt", "desc")
      .limit(limit);

    if (lastDocId) {
      const lastDoc = await adminDb.collection("sections").doc(lastDocId).get();
      if (lastDoc.exists) {
        sectionsQuery = sectionsQuery.startAfter(lastDoc);
      }
    }

    const sectionsSnapshot = await sectionsQuery.get();

    // Collect all section IDs and student IDs for batch queries
    const sectionIds = sectionsSnapshot.docs.map(doc => doc.id);
    
    // Get all section_students relationships in batch
    const sectionStudentsPromises = sectionIds.map(sectionId =>
      adminDb
        .collection("section_students")
        .where("sectionId", "==", sectionId)
        .get()
    );
    const sectionStudentsSnapshots = await Promise.all(sectionStudentsPromises);

    // Collect all unique student IDs
    const studentIdsSet = new Set<string>();
    sectionStudentsSnapshots.forEach(snapshot => {
      snapshot.docs.forEach(doc => {
        const studentId = doc.data().studentId;
        if (studentId) studentIdsSet.add(studentId);
      });
    });

    const studentIds = Array.from(studentIdsSet);

    // Batch fetch all users at once (Firestore allows up to 10 in 'in' queries, so batch if needed)
    const userMap = new Map<string, any>();
    if (studentIds.length > 0) {
      // Firestore 'in' query limit is 10, so batch in chunks
      const batchSize = 10;
      for (let i = 0; i < studentIds.length; i += batchSize) {
        const batch = studentIds.slice(i, i + batchSize);
        const userPromises = batch.map(studentId =>
          adminDb.collection("users").doc(studentId).get()
        );
        const userDocs = await Promise.all(userPromises);
        userDocs.forEach(doc => {
          if (doc.exists) {
            const userData = doc.data();
            userMap.set(doc.id, {
              id: doc.id,
              email: userData?.email || "",
              displayName: userData?.displayName || "",
              role: userData?.role || "student",
            });
          }
        });
      }
    }

    // Build section-student mapping
    const sectionStudentsMap = new Map<string, string[]>();
    sectionStudentsSnapshots.forEach((snapshot, index) => {
      const sectionId = sectionIds[index];
      const studentIds = snapshot.docs.map(doc => doc.data().studentId);
      sectionStudentsMap.set(sectionId, studentIds);
    });

    // Build sections with students
    const sectionsPromises = sectionsSnapshot.docs.map(async (doc) => {
      const sectionData = doc.data();
      const sectionStudentIds = sectionStudentsMap.get(doc.id) || [];
      const students = sectionStudentIds
        .map(studentId => userMap.get(studentId))
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
        description: sectionData.description || "",
        teacherId: sectionData.teacherId,
        students,
        createdAt,
        updatedAt,
      };
    });

    const sections = await Promise.all(sectionsPromises);

    const lastDoc = sectionsSnapshot.docs[sectionsSnapshot.docs.length - 1];
    const hasMore = sectionsSnapshot.docs.length === limit;

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
        sections,
        pagination: {
          limit,
          hasMore,
          lastDocId: hasMore && lastDoc ? lastDoc.id : null,
        },
      },
      { status: 200, headers }
    );
  } catch (error) {
    console.error("Get sections error:", error);

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

    if (user.role !== "teacher") {
      const headers = {
        "Content-Type": "application/json; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "no-store, no-cache, must-revalidate",
      };
      return NextResponse.json(
        { error: "Forbidden: Teacher role required to create sections" },
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

    if (!body.name || typeof body.name !== "string" || body.name.trim().length === 0) {
      const headers = {
        "Content-Type": "application/json; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "no-store, no-cache, must-revalidate",
      };
      return NextResponse.json(
        { error: "Section name is required" },
        { status: 400, headers }
      );
    }

    if (body.name.length > 100) {
      const headers = {
        "Content-Type": "application/json; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "no-store, no-cache, must-revalidate",
      };
      return NextResponse.json(
        { error: "Section name must be 100 characters or less" },
        { status: 400, headers }
      );
    }

    if (body.description && (typeof body.description !== "string" || body.description.length > 500)) {
      const headers = {
        "Content-Type": "application/json; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "no-store, no-cache, must-revalidate",
      };
      return NextResponse.json(
        { error: "Section description must be 500 characters or less" },
        { status: 400, headers }
      );
    }

    if (!body.studentIds || !Array.isArray(body.studentIds)) {
      const headers = {
        "Content-Type": "application/json; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "no-store, no-cache, must-revalidate",
      };
      return NextResponse.json(
        { error: "Student IDs must be provided as an array" },
        { status: 400, headers }
      );
    }

    // Validate student IDs in batch
    const studentIdsArray = Array.isArray(body.studentIds) ? body.studentIds : [];
    const uniqueStudentIds: string[] = [];
    
    for (const studentId of studentIdsArray) {
      if (typeof studentId === "string" && studentId.trim().length > 0) {
        if (!uniqueStudentIds.includes(studentId)) {
          uniqueStudentIds.push(studentId);
        }
      } else {
        const headers = {
          "Content-Type": "application/json; charset=utf-8",
          "X-Content-Type-Options": "nosniff",
          "Cache-Control": "no-store, no-cache, must-revalidate",
        };
        return NextResponse.json(
          { error: "Invalid student ID format" },
          { status: 400, headers }
        );
      }
    }

    // Batch validate students (Firestore 'in' query limit is 10)
    const batchSize = 10;
    for (let i = 0; i < uniqueStudentIds.length; i += batchSize) {
      const batch = uniqueStudentIds.slice(i, i + batchSize);
      const studentPromises = batch.map((studentId) =>
        adminDb.collection("users").doc(studentId).get()
      );
      const studentDocs = await Promise.all(studentPromises);
      
      for (let j = 0; j < studentDocs.length; j++) {
        const studentDoc = studentDocs[j];
        if (!studentDoc.exists || studentDoc.data()?.role !== "student") {
          const headers = {
            "Content-Type": "application/json; charset=utf-8",
            "X-Content-Type-Options": "nosniff",
            "Cache-Control": "no-store, no-cache, must-revalidate",
          };
          return NextResponse.json(
            { error: `Student with ID ${batch[j]} not found or not a student` },
            { status: 400, headers }
          );
        }
      }
    }

    // Use transaction for atomic section creation
    const sectionData = {
      name: body.name.trim(),
      description: body.description?.trim() || "",
      teacherId: user.uid,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const sectionRef = adminDb.collection("sections").doc();
    
    // Use batch write for better performance and atomicity
    const batch = adminDb.batch();
    batch.set(sectionRef, sectionData);

    // Add students to section
    uniqueStudentIds.forEach((studentId: string) => {
      const sectionStudentRef = adminDb.collection("section_students").doc();
      batch.set(sectionStudentRef, {
        sectionId: sectionRef.id,
        studentId,
        addedAt: new Date(),
      });
    });

    await batch.commit();
    const sectionResult = { id: sectionRef.id };

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
        id: sectionResult.id,
        message: "Section created successfully",
      },
      { status: 201, headers }
    );
  } catch (error) {
    console.error("Create section error:", error);

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