import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import { adminDb } from "@/lib/firebase-admin";
import { verifyCSRF } from "@/lib/csrf";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import {
  getSecurityHeaders,
  getErrorSecurityHeaders,
} from "@/lib/security-headers";
import {
  QuizDraftSchema,
  validateInput,
  sanitizeString,
  sanitizeStringArray,
} from "@/lib/validation";
import { handleApiError } from "@/lib/error-handler";

/**
 * POST /api/quizzes/drafts - Save a quiz draft
 * Creates a new draft or updates existing one
 */
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
        { error: "Forbidden: Teacher role required to save drafts" },
        { status: 403, headers: getErrorSecurityHeaders() }
      );
    }

    // Rate limiting
    const rateLimitResult = await rateLimit({
      identifier: user.uid,
      key: "quizzes:drafts",
      limit: RATE_LIMITS.draft.limit,
      window: RATE_LIMITS.draft.window,
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

    // Validate input using Zod (lenient schema for drafts)
    const validation = validateInput(QuizDraftSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Invalid draft data.",
          details: validation.error.issues,
        },
        { status: 400, headers: getErrorSecurityHeaders() }
      );
    }

    const validatedData = validation.data;

    // Sanitize questions
    const sanitizedQuestions = (validatedData.questions || []).map((q) => {
      const questionData: Record<string, unknown> = {
        id: q.id || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        question: sanitizeString(q.question || ""),
        type: q.type || "multiple_choice",
        answer: sanitizeString(q.answer || ""),
        choices: q.choices ? sanitizeStringArray(q.choices) : [],
      };

      if (q.imageUrl && typeof q.imageUrl === "string" && q.imageUrl.length > 0) {
        questionData.imageUrl = sanitizeString(q.imageUrl);
      }

      return questionData;
    });

    const draftData: Record<string, unknown> = {
      teacherId: user.uid,
      title: sanitizeString(validatedData.title || ""),
      description: sanitizeString(validatedData.description || ""),
      questions: sanitizedQuestions,
      totalQuestions: sanitizedQuestions.length,
      isDraft: true,
      isActive: false,
      coverImageUrl: validatedData.coverImageUrl
        ? sanitizeString(validatedData.coverImageUrl)
        : "",
      updatedAt: new Date(),
      // Time settings
      duration: validatedData.duration ?? null,
      deadline: validatedData.deadline ?? null,
      // Quiz Options
      shuffleQuestions: validatedData.shuffleQuestions ?? false,
      shuffleChoices: validatedData.shuffleChoices ?? false,
      showResults: validatedData.showResults ?? true,
      allowRetake: validatedData.allowRetake ?? false,
      maxAttempts: validatedData.maxAttempts ?? 1,
      // Anti-Cheat Options
      preventTabSwitch: validatedData.preventTabSwitch ?? true,
      maxTabSwitches: validatedData.maxTabSwitches ?? 3,
      preventCopyPaste: validatedData.preventCopyPaste ?? true,
      fullscreenMode: validatedData.fullscreenMode ?? false,
      webcamProctoring: validatedData.webcamProctoring ?? false,
      disableRightClick: validatedData.disableRightClick ?? true,
      lockdownBrowser: validatedData.lockdownBrowser ?? false,
    };

    // Check if draftId is provided for update
    const draftId = body.draftId;

    if (draftId) {
      // Update existing draft
      const draftRef = adminDb.collection("quizDrafts").doc(draftId);
      const existingDraft = await draftRef.get();

      if (!existingDraft.exists) {
        return NextResponse.json(
          { error: "Draft not found" },
          { status: 404, headers: getErrorSecurityHeaders() }
        );
      }

      const existingData = existingDraft.data();
      if (existingData?.teacherId !== user.uid) {
        return NextResponse.json(
          { error: "Forbidden: You can only update your own drafts" },
          { status: 403, headers: getErrorSecurityHeaders() }
        );
      }

      await draftRef.update(draftData);

      return NextResponse.json(
        {
          success: true,
          id: draftId,
          message: "Draft updated successfully",
        },
        {
          status: 200,
          headers: getSecurityHeaders({
            rateLimitHeaders: rateLimitResult.headers,
          }),
        }
      );
    } else {
      // Create new draft
      draftData.createdAt = new Date();

      const result = await adminDb.collection("quizDrafts").add(draftData);

      return NextResponse.json(
        {
          success: true,
          id: result.id,
          message: "Draft saved successfully",
        },
        {
          status: 201,
          headers: getSecurityHeaders({
            rateLimitHeaders: rateLimitResult.headers,
          }),
        }
      );
    }
  } catch (error) {
    let userId: string | undefined;
    try {
      const user = await verifyAuth(request);
      userId = user?.uid;
    } catch {
      // Ignore auth errors in error handler
    }
    return handleApiError(error, { route: "/api/quizzes/drafts", userId });
  }
}

/**
 * GET /api/quizzes/drafts - Get all drafts for the authenticated teacher
 */
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
        { error: "Forbidden: Teacher role required to view drafts" },
        { status: 403, headers: getErrorSecurityHeaders() }
      );
    }

    // Pagination support
    const url = new URL(request.url);
    const limit = Math.min(
      Math.max(parseInt(url.searchParams.get("limit") || "20"), 1),
      50
    );

    // Get drafts - simple query without orderBy to avoid needing composite index
    // Sort in memory instead (fine for small draft collections)
    const draftsQuery = adminDb
      .collection("quizDrafts")
      .where("teacherId", "==", user.uid);

    const draftsSnapshot = await draftsQuery.get();

    const drafts = draftsSnapshot.docs.map((doc) => {
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
        title: data.title || "Untitled Draft",
        description: data.description || "",
        totalQuestions: data.totalQuestions || 0,
        createdAt,
        updatedAt,
      };
    });

    // Sort by updatedAt descending in memory
    drafts.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    // Apply pagination after sorting
    const paginatedDrafts = drafts.slice(0, limit);
    const hasMore = drafts.length > limit;

    return NextResponse.json(
      {
        drafts: paginatedDrafts,
        pagination: {
          limit,
          hasMore,
          total: drafts.length,
        },
      },
      {
        status: 200,
        headers: getSecurityHeaders({
          cacheControl: "no-store, no-cache, must-revalidate",
        }),
      }
    );
  } catch (error) {
    let userId: string | undefined;
    try {
      const user = await verifyAuth(request);
      userId = user?.uid;
    } catch {
      // Ignore auth errors in error handler
    }
    return handleApiError(error, { route: "/api/quizzes/drafts", userId });
  }
}
