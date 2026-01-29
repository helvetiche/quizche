/* eslint-disable @typescript-eslint/strict-boolean-expressions, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unnecessary-condition, @typescript-eslint/prefer-nullish-coalescing, @typescript-eslint/explicit-function-return-type */
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

type RouteParams = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/quizzes/drafts/[id] - Get a specific draft
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: draftId } = await params;
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

    const draftRef = adminDb.collection("quizDrafts").doc(draftId);
    const draftDoc = await draftRef.get();

    if (!draftDoc.exists) {
      return NextResponse.json(
        { error: "Draft not found" },
        { status: 404, headers: getErrorSecurityHeaders() }
      );
    }

    const draftData = draftDoc.data();

    if (!draftData) {
      return NextResponse.json(
        { error: "Draft not found" },
        { status: 404, headers: getErrorSecurityHeaders() }
      );
    }

    if (draftData.teacherId !== user.uid) {
      return NextResponse.json(
        { error: "Forbidden: You can only view your own drafts" },
        { status: 403, headers: getErrorSecurityHeaders() }
      );
    }

    const createdAt = draftData.createdAt?.toDate
      ? draftData.createdAt.toDate().toISOString()
      : draftData.createdAt instanceof Date
        ? draftData.createdAt.toISOString()
        : draftData.createdAt || new Date().toISOString();

    const updatedAt = draftData.updatedAt?.toDate
      ? draftData.updatedAt.toDate().toISOString()
      : draftData.updatedAt instanceof Date
        ? draftData.updatedAt.toISOString()
        : draftData.updatedAt || createdAt;

    return NextResponse.json(
      {
        draft: {
          id: draftDoc.id,
          title: draftData.title ?? "",
          description: draftData.description ?? "",
          questions: draftData.questions ?? ([] as never[]),
          totalQuestions: draftData.totalQuestions ?? 0,
          duration: draftData.duration ?? null,
          deadline: draftData.deadline ?? null,
          shuffleQuestions: draftData.shuffleQuestions ?? false,
          shuffleChoices: draftData.shuffleChoices ?? false,
          showResults: draftData.showResults ?? true,
          allowRetake: draftData.allowRetake ?? false,
          maxAttempts: draftData.maxAttempts ?? 1,
          preventTabSwitch: draftData.preventTabSwitch ?? true,
          maxTabSwitches: draftData.maxTabSwitches ?? 3,
          preventCopyPaste: draftData.preventCopyPaste ?? true,
          fullscreenMode: draftData.fullscreenMode ?? false,
          webcamProctoring: draftData.webcamProctoring ?? false,
          disableRightClick: draftData.disableRightClick ?? true,
          lockdownBrowser: draftData.lockdownBrowser ?? false,
          coverImageUrl: draftData.coverImageUrl ?? "",
          createdAt,
          updatedAt,
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
    return handleApiError(error, { route: "/api/quizzes/drafts/[id]", userId });
  }
}

/**
 * DELETE /api/quizzes/drafts/[id] - Delete a specific draft
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: draftId } = await params;
    const user = await verifyAuth(request);

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized: Invalid or missing authentication token" },
        { status: 401, headers: getErrorSecurityHeaders() }
      );
    }

    if (user.role !== "teacher") {
      return NextResponse.json(
        { error: "Forbidden: Teacher role required to delete drafts" },
        { status: 403, headers: getErrorSecurityHeaders() }
      );
    }

    // Rate limiting
    const rateLimitResult = await rateLimit({
      identifier: user.uid,
      key: "quizzes:drafts:delete",
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
    if (csrfError !== undefined && csrfError !== null) {
      return NextResponse.json(
        { error: csrfError.error },
        { status: csrfError.status, headers: csrfError.headers }
      );
    }

    const draftRef = adminDb.collection("quizDrafts").doc(draftId);
    const draftDoc = await draftRef.get();

    if (!draftDoc.exists) {
      return NextResponse.json(
        { error: "Draft not found" },
        { status: 404, headers: getErrorSecurityHeaders() }
      );
    }

    const draftData = draftDoc.data();

    // Verify ownership
    if (draftData !== undefined && draftData.teacherId !== user.uid) {
      return NextResponse.json(
        { error: "Forbidden: You can only delete your own drafts" },
        { status: 403, headers: getErrorSecurityHeaders() }
      );
    }

    await draftRef.delete();

    return NextResponse.json(
      {
        success: true,
        message: "Draft deleted successfully",
      },
      {
        status: 200,
        headers: getSecurityHeaders({
          rateLimitHeaders: rateLimitResult.headers,
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
    return handleApiError(error, { route: "/api/quizzes/drafts/[id]", userId });
  }
}
