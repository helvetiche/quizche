/* eslint-disable @typescript-eslint/strict-boolean-expressions, @typescript-eslint/no-unnecessary-condition, @typescript-eslint/prefer-nullish-coalescing */
import { type NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import {
  extractTextFromPDF,
  generateFlashcardsFromContent,
} from "@/lib/gemini";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { trackAIUsage } from "@/lib/monitoring";
import { verifyCSRF } from "@/lib/csrf";
import {
  getSecurityHeaders,
  getErrorSecurityHeaders,
} from "@/lib/security-headers";
import {
  FlashcardGenerationSchema,
  validateInput,
  validateFileUpload,
} from "@/lib/validation";
import { handleApiError } from "@/lib/error-handler";

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const user = await verifyAuth(request);

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized: Invalid or missing authentication token" },
        { status: 401, headers: getErrorSecurityHeaders() }
      );
    }

    if (user.role !== "student") {
      return NextResponse.json(
        { error: "Forbidden: Student role required to generate flashcards" },
        { status: 403, headers: getErrorSecurityHeaders() }
      );
    }

    // Rate limiting for AI generation (expensive operation)
    const rateLimitResult = await rateLimit({
      identifier: user.uid,
      key: "ai:flashcard_generation",
      limit: RATE_LIMITS.aiGeneration.limit,
      window: RATE_LIMITS.aiGeneration.window,
    });

    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error:
            "Rate limit exceeded. You can generate flashcards up to 3 times per hour. Please try again later.",
        },
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

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const difficulty = formData.get("difficulty") as string | null;
    const numCardsStr = formData.get("numCards") as string | null;
    const additionalInstructions = formData.get("additionalInstructions") as
      | string
      | null;

    if (!file) {
      return NextResponse.json(
        { error: "PDF file is required" },
        { status: 400, headers: getErrorSecurityHeaders() }
      );
    }

    if (!difficulty || !numCardsStr) {
      return NextResponse.json(
        { error: "Difficulty and number of flashcards are required" },
        { status: 400, headers: getErrorSecurityHeaders() }
      );
    }

    const numCards = parseInt(numCardsStr, 10);
    if (isNaN(numCards)) {
      return NextResponse.json(
        { error: "Number of flashcards must be a valid number" },
        { status: 400, headers: getErrorSecurityHeaders() }
      );
    }

    // Validate input using Zod
    const validation = validateInput(FlashcardGenerationSchema, {
      difficulty,
      numCards,
    });

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Invalid input data",
          details: validation.error.issues,
        },
        { status: 400, headers: getErrorSecurityHeaders() }
      );
    }

    const { difficulty: validatedDifficulty, numCards: validatedNumCards } =
      validation.data;

    // Validate file upload
    const fileValidation = validateFileUpload(file, MAX_FILE_SIZE, [
      "application/pdf",
    ]);

    if (!fileValidation.valid) {
      return NextResponse.json(
        { error: fileValidation.error || "Invalid PDF file" },
        { status: 400, headers: getErrorSecurityHeaders() }
      );
    }

    // Also check file extension as additional validation
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json(
        { error: "File must be a PDF" },
        { status: 400, headers: getErrorSecurityHeaders() }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const pdfBuffer = Buffer.from(arrayBuffer);

    if (pdfBuffer.length === 0) {
      return NextResponse.json(
        { error: "PDF file is empty or corrupted" },
        { status: 400, headers: getErrorSecurityHeaders() }
      );
    }

    const extractedText = await extractTextFromPDF(pdfBuffer);

    if (!extractedText || extractedText.trim().length === 0) {
      return NextResponse.json(
        {
          error:
            "Could not extract text from PDF. Please ensure the PDF contains readable content.",
        },
        { status: 400, headers: getErrorSecurityHeaders() }
      );
    }

    if (extractedText.length < 100) {
      return NextResponse.json(
        { error: "PDF content is too short to generate meaningful flashcards" },
        { status: 400, headers: getErrorSecurityHeaders() }
      );
    }

    const flashcardSet = await generateFlashcardsFromContent(
      extractedText,
      validatedDifficulty,
      validatedNumCards,
      additionalInstructions?.trim() || undefined
    );

    // Track AI usage and cost
    // Estimate tokens: ~5000 input (extracted text) + ~15000 output (flashcards)
    const estimatedTokens = {
      input: Math.ceil(extractedText.length / 4), // Rough estimate: 4 chars per token
      output: Math.ceil(JSON.stringify(flashcardSet).length / 4),
    };
    const estimatedCost =
      (estimatedTokens.input / 1_000_000) * 0.075 +
      (estimatedTokens.output / 1_000_000) * 0.3;

    await trackAIUsage(
      user.uid,
      "flashcard_generation",
      estimatedTokens,
      estimatedCost
    );

    return NextResponse.json(
      { flashcardSet },
      {
        status: 200,
        headers: getSecurityHeaders({
          rateLimitHeaders: rateLimitResult.headers,
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
    return handleApiError(error, { route: "/api/flashcards/generate", userId });
  }
}
