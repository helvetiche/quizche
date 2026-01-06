import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import {
  extractTextFromPDF,
  generateFlashcardsFromContent,
} from "@/lib/gemini";
import { z } from "zod";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { trackAIUsage } from "@/lib/monitoring";
import { verifyCSRF } from "@/lib/csrf";

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

const generateFlashcardSchema = z.object({
  difficulty: z.enum(["easy", "medium", "hard"]),
  numCards: z.number().int().min(1).max(500),
});

const getHeaders = () => ({
  "Content-Type": "application/json; charset=utf-8",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
  "Content-Security-Policy":
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://*.firebaseio.com https://*.googleapis.com;",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "geolocation=(), microphone=(), camera=()",
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Vary: "Accept, Authorization",
});

export async function POST(request: NextRequest) {
  const headers = getHeaders();

  try {
    const user = await verifyAuth(request);

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized: Invalid or missing authentication token" },
        { status: 401, headers }
      );
    }

    if (user.role !== "student") {
      return NextResponse.json(
        { error: "Forbidden: Student role required to generate flashcards" },
        { status: 403, headers }
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
        { status: 429, headers: { ...headers, ...rateLimitResult.headers } }
      );
    }

    // CSRF protection
    const csrfError = await verifyCSRF(request, user.uid);
    if (csrfError) {
      return NextResponse.json(
        { error: csrfError.error },
        {
          status: csrfError.status,
          headers: { ...headers, ...csrfError.headers },
        }
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
        { status: 400, headers }
      );
    }

    if (!difficulty || !numCardsStr) {
      return NextResponse.json(
        { error: "Difficulty and number of flashcards are required" },
        { status: 400, headers }
      );
    }

    const numCards = parseInt(numCardsStr, 10);
    if (isNaN(numCards)) {
      return NextResponse.json(
        { error: "Number of flashcards must be a valid number" },
        { status: 400, headers }
      );
    }

    const validationResult = generateFlashcardSchema.safeParse({
      difficulty,
      numCards,
    });

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Invalid input data",
          details: validationResult.error.issues,
        },
        { status: 400, headers }
      );
    }

    const { difficulty: validatedDifficulty, numCards: validatedNumCards } =
      validationResult.data;

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "PDF file size exceeds 20MB limit" },
        { status: 400, headers }
      );
    }

    if (
      file.type !== "application/pdf" &&
      !file.name.toLowerCase().endsWith(".pdf")
    ) {
      return NextResponse.json(
        { error: "File must be a PDF" },
        { status: 400, headers }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const pdfBuffer = Buffer.from(arrayBuffer);

    if (pdfBuffer.length === 0) {
      return NextResponse.json(
        { error: "PDF file is empty or corrupted" },
        { status: 400, headers }
      );
    }

    const extractedText = await extractTextFromPDF(pdfBuffer);

    if (!extractedText || extractedText.trim().length === 0) {
      return NextResponse.json(
        {
          error:
            "Could not extract text from PDF. Please ensure the PDF contains readable content.",
        },
        { status: 400, headers }
      );
    }

    if (extractedText.length < 100) {
      return NextResponse.json(
        { error: "PDF content is too short to generate meaningful flashcards" },
        { status: 400, headers }
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

    const responseHeaders = {
      ...headers,
      ...rateLimitResult.headers,
    };

    return NextResponse.json(
      { flashcardSet },
      { status: 200, headers: responseHeaders }
    );
  } catch (error) {
    console.error("Flashcard generation error:", error);

    const errorHeaders = {
      ...headers,
      "Cache-Control": "no-store, no-cache, must-revalidate",
    };

    if (error instanceof Error) {
      if (error.message.includes("NEXT_PRIVATE_GEMINI_API_KEY")) {
        return NextResponse.json(
          { error: "Server configuration error. Please contact support." },
          { status: 500, headers: errorHeaders }
        );
      }

      if (
        error.message.includes("PDF extraction") ||
        error.message.includes("extract text")
      ) {
        return NextResponse.json(
          {
            error:
              "Failed to process PDF. Please ensure the file is a valid PDF with readable content.",
          },
          { status: 400, headers: errorHeaders }
        );
      }

      if (error.message.includes("Flashcard generation")) {
        return NextResponse.json(
          {
            error:
              "Failed to generate flashcards. Please try again or upload a different PDF.",
          },
          { status: 500, headers: errorHeaders }
        );
      }
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: errorHeaders }
    );
  }
}
