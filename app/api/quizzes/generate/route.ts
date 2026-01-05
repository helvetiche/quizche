import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import { extractTextFromPDF, generateQuizFromContent } from "@/lib/gemini";
import { z } from "zod";

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

const generateQuizSchema = z.object({
  difficulty: z.enum(["easy", "medium", "hard"]),
  numQuestions: z.number().int().min(1).max(50),
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

    if (user.role !== "teacher") {
      return NextResponse.json(
        { error: "Forbidden: Teacher role required to generate quizzes" },
        { status: 403, headers }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const difficulty = formData.get("difficulty") as string | null;
    const numQuestionsStr = formData.get("numQuestions") as string | null;
    const additionalInstructions = formData.get("additionalInstructions") as string | null;

    if (!file) {
      return NextResponse.json(
        { error: "PDF file is required" },
        { status: 400, headers }
      );
    }

    if (!difficulty || !numQuestionsStr) {
      return NextResponse.json(
        { error: "Difficulty and number of questions are required" },
        { status: 400, headers }
      );
    }

    const numQuestions = parseInt(numQuestionsStr, 10);
    if (isNaN(numQuestions)) {
      return NextResponse.json(
        { error: "Number of questions must be a valid number" },
        { status: 400, headers }
      );
    }

    const validationResult = generateQuizSchema.safeParse({
      difficulty,
      numQuestions,
    });

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Invalid input data",
          details: validationResult.error.errors,
        },
        { status: 400, headers }
      );
    }

    const { difficulty: validatedDifficulty, numQuestions: validatedNumQuestions } =
      validationResult.data;

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "PDF file size exceeds 20MB limit" },
        { status: 400, headers }
      );
    }

    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
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
        { error: "Could not extract text from PDF. Please ensure the PDF contains readable content." },
        { status: 400, headers }
      );
    }

    if (extractedText.length < 100) {
      return NextResponse.json(
        { error: "PDF content is too short to generate a meaningful quiz" },
        { status: 400, headers }
      );
    }

    const quiz = await generateQuizFromContent(
      extractedText,
      validatedDifficulty,
      validatedNumQuestions,
      additionalInstructions?.trim() || undefined
    );

    return NextResponse.json({ quiz }, { status: 200, headers });
  } catch (error) {
    console.error("Quiz generation error:", error);

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
          { error: "Failed to process PDF. Please ensure the file is a valid PDF with readable content." },
          { status: 400, headers: errorHeaders }
        );
      }

      if (error.message.includes("Quiz generation")) {
        return NextResponse.json(
          { error: "Failed to generate quiz. Please try again or upload a different PDF." },
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
