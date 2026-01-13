import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import { adminDb } from "@/lib/firebase-admin";
import { verifyCSRF } from "@/lib/csrf";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import {
  getSecurityHeaders,
  getErrorSecurityHeaders,
} from "@/lib/security-headers";
import { handleApiError } from "@/lib/error-handler";
import { z } from "zod";

// Schema for quiz settings update (no questions required)
const QuizSettingsSchema = z.object({
  isActive: z.boolean().optional(),
  duration: z.number().int().min(0).max(600).nullable().optional(),
  deadline: z.string().max(50).optional().nullable(),
  maxAttempts: z.number().int().min(1).max(100).optional(),
  allowRetake: z.boolean().optional(),
  showResults: z.boolean().optional(),
  shuffleQuestions: z.boolean().optional(),
  shuffleChoices: z.boolean().optional(),
  preventCopyPaste: z.boolean().optional(),
  fullscreenMode: z.boolean().optional(),
  disableRightClick: z.boolean().optional(),
  antiCheat: z.object({
    enabled: z.boolean().optional(),
    tabChangeLimit: z.number().int().min(1).max(10).optional(),
    autoSubmitOnDisqualification: z.boolean().optional(),
  }).optional(),
});

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
        { error: "Forbidden: Teacher role required to update quiz settings" },
        { status: 403, headers: getErrorSecurityHeaders() }
      );
    }

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "Quiz ID is required" },
        { status: 400, headers: getErrorSecurityHeaders() }
      );
    }

    // Rate limiting
    const rateLimitResult = await rateLimit({
      identifier: user.uid,
      key: `quizzes:settings:${id}`,
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

    const quizDoc = await adminDb.collection("quizzes").doc(id).get();

    if (!quizDoc.exists) {
      return NextResponse.json(
        { error: "Quiz not found" },
        { status: 404, headers: getErrorSecurityHeaders() }
      );
    }

    const quizData = quizDoc.data();

    if (quizData?.teacherId !== user.uid) {
      return NextResponse.json(
        { error: "Forbidden: You can only update your own quizzes" },
        { status: 403, headers: getErrorSecurityHeaders() }
      );
    }

    const body = await request.json();

    // Validate input
    const validation = QuizSettingsSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Invalid settings data",
          details: validation.error.issues,
        },
        { status: 400, headers: getErrorSecurityHeaders() }
      );
    }

    const settings = validation.data;

    // Build update object with only provided fields
    const updateData: Record<string, any> = {
      updatedAt: new Date(),
    };

    if (settings.isActive !== undefined) {
      updateData.isActive = settings.isActive;
    }
    if (settings.duration !== undefined) {
      updateData.duration = settings.duration;
    }
    if (settings.deadline !== undefined) {
      updateData.deadline = settings.deadline;
    }
    if (settings.maxAttempts !== undefined) {
      updateData.maxAttempts = settings.maxAttempts;
    }
    if (settings.allowRetake !== undefined) {
      updateData.allowRetake = settings.allowRetake;
    }
    if (settings.showResults !== undefined) {
      updateData.showResults = settings.showResults;
    }
    if (settings.shuffleQuestions !== undefined) {
      updateData.shuffleQuestions = settings.shuffleQuestions;
    }
    if (settings.shuffleChoices !== undefined) {
      updateData.shuffleChoices = settings.shuffleChoices;
    }
    if (settings.preventCopyPaste !== undefined) {
      updateData.preventCopyPaste = settings.preventCopyPaste;
    }
    if (settings.fullscreenMode !== undefined) {
      updateData.fullscreenMode = settings.fullscreenMode;
    }
    if (settings.disableRightClick !== undefined) {
      updateData.disableRightClick = settings.disableRightClick;
    }
    if (settings.antiCheat !== undefined) {
      updateData.antiCheat = {
        ...(quizData?.antiCheat || {}),
        ...settings.antiCheat,
      };
    }

    await adminDb.collection("quizzes").doc(id).update(updateData);

    return NextResponse.json(
      {
        success: true,
        message: "Quiz settings updated successfully",
      },
      { status: 200, headers: getSecurityHeaders({ rateLimitHeaders: rateLimitResult.headers }) }
    );
  } catch (error) {
    let userId: string | undefined;
    try {
      const user = await verifyAuth(request);
      userId = user?.uid;
    } catch {
      // Ignore
    }
    return handleApiError(error, { route: "/api/quizzes/[id]/settings", userId });
  }
}
