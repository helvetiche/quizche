import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import { adminDb } from "@/lib/firebase-admin";
import { verifyCSRF } from "@/lib/csrf";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import {
  getSecurityHeaders,
  getErrorSecurityHeaders,
  getPublicSecurityHeaders,
} from "@/lib/security-headers";
import {
  QuizDataSchema,
  validateInput,
  sanitizeString,
  sanitizeStringArray,
} from "@/lib/validation";
import { handleApiError } from "@/lib/error-handler";

const QUESTION_TYPES = [
  "multiple_choice",
  "identification",
  "true_or_false",
  "essay",
  "enumeration",
  "reflection",
] as const;

type QuestionType = (typeof QUESTION_TYPES)[number];

interface Question {
  question: string;
  type: QuestionType;
  choices?: string[];
  answer: string;
  imageUrl?: string;
}

interface QuizData {
  title: string;
  description?: string;
  questions: Question[];
}

// Legacy validation functions kept for backward compatibility
// New code should use Zod schemas from lib/validation.ts

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
        { error: "Forbidden: Teacher role required to create quizzes" },
        { status: 403, headers: getErrorSecurityHeaders() }
      );
    }

    // Rate limiting
    const rateLimitResult = await rateLimit({
      identifier: user.uid,
      key: "quizzes:create",
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
    if (csrfError) {
      return NextResponse.json(
        { error: csrfError.error },
        { status: csrfError.status, headers: csrfError.headers }
      );
    }

    const body = await request.json();

    // Validate input using Zod
    const validation = validateInput(QuizDataSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Invalid quiz data. Please check all fields.",
          details: validation.error.issues,
        },
        { status: 400, headers: getErrorSecurityHeaders() }
      );
    }

    const validatedData = validation.data; // Already sanitized by validateInput

    const sanitizedQuestions = validatedData.questions.map((q) => {
      const questionData: any = {
        question: sanitizeString(q.question),
        type: q.type,
        answer: sanitizeString(q.answer),
      };

      if (
        q.type === "multiple_choice" &&
        q.choices &&
        Array.isArray(q.choices)
      ) {
        const filteredChoices = sanitizeStringArray(q.choices).filter(
          (c: string) => c.length > 0
        );
        if (filteredChoices.length > 0) {
          questionData.choices = filteredChoices;
        }
      }

      if (q.imageUrl && typeof q.imageUrl === "string" && q.imageUrl.length > 0) {
        questionData.imageUrl = sanitizeString(q.imageUrl);
      }

      return questionData;
    });

    const quizData: Record<string, unknown> = {
      teacherId: user.uid,
      title: sanitizeString(validatedData.title),
      description: validatedData.description
        ? sanitizeString(validatedData.description)
        : "",
      questions: sanitizedQuestions,
      totalQuestions: sanitizedQuestions.length,
      isActive: validatedData.isActive ?? true,
      coverImageUrl: validatedData.coverImageUrl
        ? sanitizeString(validatedData.coverImageUrl)
        : "",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Conditionally add optional fields to avoid undefined values in Firestore
    if (validatedData.timeLimit !== undefined) {
      quizData.duration = validatedData.timeLimit;
    }

    const result = await adminDb.collection("quizzes").add(quizData);

    return NextResponse.json(
      {
        success: true,
        id: result.id,
        message: "Quiz created successfully",
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
    return handleApiError(error, { route: "/api/quizzes", userId });
  }
}

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
        { error: "Forbidden: Teacher role required to view quizzes" },
        { status: 403, headers: getErrorSecurityHeaders() }
      );
    }

    // Pagination support
    const url = new URL(request.url);
    const limit = Math.min(
      Math.max(parseInt(url.searchParams.get("limit") || "50"), 1),
      100
    );
    const lastDocId = url.searchParams.get("lastDocId");

    // Get quizzes with pagination
    let quizzesQuery = adminDb
      .collection("quizzes")
      .where("teacherId", "==", user.uid)
      .orderBy("createdAt", "desc")
      .limit(limit);

    if (lastDocId) {
      const lastDoc = await adminDb.collection("quizzes").doc(lastDocId).get();
      if (lastDoc.exists) {
        quizzesQuery = quizzesQuery.startAfter(lastDoc);
      }
    }

    const quizzesSnapshot = await quizzesQuery.get();

    const quizzes = quizzesSnapshot.docs.map((doc) => {
      const data = doc.data();
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

      return {
        id: doc.id,
        title: data.title,
        description: data.description || "",
        totalQuestions: data.totalQuestions || 0,
        isActive: data.isActive !== undefined ? data.isActive : true,
        createdAt,
        updatedAt,
      };
    });

    const lastDoc = quizzesSnapshot.docs[quizzesSnapshot.docs.length - 1];
    const hasMore = quizzesSnapshot.docs.length === limit;

    return NextResponse.json(
      {
        quizzes,
        pagination: {
          limit,
          hasMore,
          lastDocId: hasMore && lastDoc ? lastDoc.id : null,
        },
      },
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
    return handleApiError(error, { route: "/api/quizzes", userId });
  }
}
