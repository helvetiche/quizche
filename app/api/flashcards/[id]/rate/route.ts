import { type NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import { adminDb } from "@/lib/firebase-admin";
import { RateFlashcardSchema, validateInput } from "@/lib/validation";
import {
  getSecurityHeaders,
  getErrorSecurityHeaders,
} from "@/lib/security-headers";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const user = await verifyAuth(request);

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized: Invalid or missing authentication token" },
        { status: 401, headers: getErrorSecurityHeaders() }
      );
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { error: "Flashcard set ID is required" },
        { status: 400, headers: getErrorSecurityHeaders() }
      );
    }

    const body = (await request.json()) as unknown;
    const validation = validateInput(RateFlashcardSchema, body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Invalid rating data",
          details: validation.error.issues,
        },
        { status: 400, headers: getErrorSecurityHeaders() }
      );
    }

    const { rating } = validation.data;
    const flashcardRef = adminDb.collection("flashcards").doc(id);

    await adminDb.runTransaction(async (transaction) => {
      const doc = await transaction.get(flashcardRef);
      if (!doc.exists) {
        throw new Error("Flashcard set not found");
      }

      const data = doc.data() as
        | { ratings?: Record<string, number> }
        | undefined;
      const ratings = data?.ratings ?? {};

      // Update user's rating
      ratings[user.uid] = rating;

      // Recalculate average
      const ratingValues = Object.values(ratings);
      const totalRatings = ratingValues.length;
      const sum = ratingValues.reduce((a, b) => a + b, 0);
      const averageRating = sum / totalRatings;

      transaction.update(flashcardRef, {
        ratings,
        totalRatings,
        averageRating,
      });
    });

    return NextResponse.json(
      { message: "Rating submitted successfully" },
      { status: 200, headers: getSecurityHeaders() }
    );
  } catch (error) {
    console.error("Error rating flashcard:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to rate flashcard";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500, headers: getErrorSecurityHeaders() }
    );
  }
}
