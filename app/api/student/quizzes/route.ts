import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import { adminDb } from "@/lib/firebase-admin";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import cache, { getApiCacheKey } from "@/lib/cache";

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

    if (user.role !== "student") {
      const headers = {
        "Content-Type": "application/json; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "no-store, no-cache, must-revalidate",
      };
      return NextResponse.json(
        { error: "Forbidden: Student role required to view assigned quizzes" },
        { status: 403, headers }
      );
    }

    // Rate limiting
    const rateLimitResult = await rateLimit({
      identifier: user.uid,
      key: "student:quizzes:list",
      limit: RATE_LIMITS.general.limit,
      window: RATE_LIMITS.general.window,
    });

    if (!rateLimitResult.success) {
      const headers = {
        "Content-Type": "application/json; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
        ...rateLimitResult.headers,
      };
      return NextResponse.json(
        { error: "Rate limit exceeded. Please try again later." },
        { status: 429, headers }
      );
    }

    // Check cache first
    const cacheKey = getApiCacheKey("/api/student/quizzes", user.uid);
    const cached = await cache.get<{ quizzes: any[] }>(cacheKey);
    if (cached) {
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
        "Cache-Control": "private, max-age=300",
        Vary: "Accept, Authorization",
        ...rateLimitResult.headers,
      };
      return NextResponse.json(cached, { status: 200, headers });
    }

    // Get sections the student belongs to
    const studentSectionsSnapshot = await adminDb
      .collection("section_students")
      .where("studentId", "==", user.uid)
      .get();

    const sectionIds = studentSectionsSnapshot.docs.map(doc => doc.data().sectionId);

    if (sectionIds.length === 0) {
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
      return NextResponse.json({ quizzes: [] }, { status: 200, headers });
    }

    // Get quiz IDs assigned to these sections
    // Firestore 'in' query limit is 10, so batch if needed
    const quizIdsSet = new Set<string>();
    const batchSize = 10;
    
    for (let i = 0; i < sectionIds.length; i += batchSize) {
      const batch = sectionIds.slice(i, i + batchSize);
      const quizSectionsSnapshot = await adminDb
        .collection("quiz_sections")
        .where("sectionId", "in", batch)
        .get();
      
      quizSectionsSnapshot.docs.forEach(doc => {
        const quizId = doc.data().quizId;
        if (quizId) quizIdsSet.add(quizId);
      });
    }

    const quizIds = Array.from(quizIdsSet);

    if (quizIds.length === 0) {
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
      return NextResponse.json({ quizzes: [] }, { status: 200, headers });
    }

    // Fetch quizzes by ID (Firestore doesn't support 'in' with document IDs directly)
    const quizPromises = quizIds.map(quizId =>
      adminDb.collection("quizzes").doc(quizId).get()
    );

    const quizDocs = await Promise.all(quizPromises);
    const now = new Date();

    const quizzes = quizDocs
      .filter(doc => doc.exists)
      .map(doc => {
        const data = doc.data()!;
        const createdAt = data.createdAt?.toDate
          ? data.createdAt.toDate().toISOString()
          : data.createdAt instanceof Date
            ? data.createdAt.toISOString()
            : data.createdAt || new Date().toISOString();

        const updatedAt = data.updatedAt?.toDate
          ? data.updatedAt.toDate().toISOString()
          : data.updatedAt instanceof Date
            ? data.updatedAt.toISOString()
            : data.updatedAt || createdAt;

        const availableDate = data.availableDate?.toDate
          ? data.availableDate.toDate()
          : data.availableDate instanceof Date
            ? data.availableDate
            : null;

        const dueDate = data.dueDate?.toDate
          ? data.dueDate.toDate()
          : data.dueDate instanceof Date
            ? data.dueDate
            : null;

        return {
          id: doc.id,
          title: data.title || "",
          description: data.description || "",
          totalQuestions: data.totalQuestions || 0,
          duration: data.duration || null,
          availableDate: availableDate ? availableDate.toISOString() : null,
          dueDate: dueDate ? dueDate.toISOString() : null,
          allowRetake: data.allowRetake !== undefined ? data.allowRetake : false,
          showResults: data.showResults !== undefined ? data.showResults : true,
          createdAt,
          updatedAt,
        };
      })
      .filter(quiz => {
        // Only show active quizzes (check the data)
        const quizDoc = quizDocs.find(doc => doc.id === quiz.id);
        const quizData = quizDoc?.data();
        if (quizData && quizData.isActive === false) return false;

        // Check if quiz is available (if availableDate is set)
        if (quiz.availableDate) {
          const available = new Date(quiz.availableDate);
          if (now < available) return false;
        }

        // Check if quiz is still open (if dueDate is set)
        if (quiz.dueDate) {
          const due = new Date(quiz.dueDate);
          if (now > due) return false;
        }

        return true;
      })
      .sort((a, b) => {
        // Sort by due date (earliest first), then by created date
        if (a.dueDate && b.dueDate) {
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

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
      "Cache-Control": "private, max-age=300",
      Vary: "Accept, Authorization",
      ...rateLimitResult.headers,
    };

    const result = { quizzes };

    // Cache the response
    await cache.set(cacheKey, result, 300); // 5 minutes

    return NextResponse.json(result, { status: 200, headers });
  } catch (error) {
    console.error("Get student quizzes error:", error);

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