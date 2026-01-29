import { type NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import { adminDb } from "@/lib/firebase-admin";
import { verifyCSRF } from "@/lib/csrf";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import cache, { getApiCacheKey } from "@/lib/cache";
import {
  FlashcardSetSchema,
  validateInput,
  sanitizeString,
} from "@/lib/validation";
import { handleApiError } from "@/lib/error-handler";
import {
  getSecurityHeaders,
  getErrorSecurityHeaders,
  getPublicSecurityHeaders,
} from "@/lib/security-headers";

export async function GET(
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

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "Flashcard set ID is required" },
        { status: 400, headers: getErrorSecurityHeaders() }
      );
    }

    const flashcardDoc = await adminDb.collection("flashcards").doc(id).get();

    if (!flashcardDoc.exists) {
      return NextResponse.json(
        { error: "Flashcard set not found" },
        { status: 404, headers: getErrorSecurityHeaders() }
      );
    }

    const flashcardData = flashcardDoc.data();

    // Check access permissions
    // Students can access their own flashcard sets, public ones, or shared ones
    if (user.role === "student") {
      const isOwner = flashcardData?.userId === user.uid;
      const isPublic = flashcardData?.isPublic || false;

      if (!isOwner && !isPublic) {
        // Check if flashcard is shared with this user
        const shareDoc = await adminDb
          .collection("flashcardShares")
          .where("flashcardId", "==", id)
          .where("sharedWithUserId", "==", user.uid)
          .limit(1)
          .get();

        if (shareDoc.empty) {
          return NextResponse.json(
            {
              error:
                "Forbidden: You can only access your own flashcard sets, public ones, or shared ones",
            },
            { status: 403, headers: getErrorSecurityHeaders() }
          );
        }
      }
    }

    // Rate limiting
    const rateLimitResult = await rateLimit({
      identifier: user.uid,
      key: `flashcards:get:${id}`,
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

    // Check cache first
    const cacheKey = getApiCacheKey(`/api/flashcards/${id}`, user.uid);
    const cached = await cache.get<{ flashcardSet: any }>(cacheKey);
    if (cached) {
      return NextResponse.json(cached, {
        status: 200,
        headers: getPublicSecurityHeaders({
          rateLimitHeaders: rateLimitResult.headers,
          cacheControl: "private, max-age=300",
        }),
      });
    }

    const result = {
      flashcardSet: {
        id: flashcardDoc.id,
        title: flashcardData?.title || "",
        description: flashcardData?.description || "",
        cards: flashcardData?.cards || [],
        totalCards: flashcardData?.totalCards || 0,
        isPublic: flashcardData?.isPublic || false,
        coverImageUrl: flashcardData?.coverImageUrl || null,
        createdAt:
          flashcardData?.createdAt?.toDate?.()?.toISOString() ||
          flashcardData?.createdAt,
        updatedAt:
          flashcardData?.updatedAt?.toDate?.()?.toISOString() ||
          flashcardData?.updatedAt,
      },
    };

    // Cache the response
    await cache.set(cacheKey, result, 300); // 5 minutes

    return NextResponse.json(result, {
      status: 200,
      headers: getPublicSecurityHeaders({
        rateLimitHeaders: rateLimitResult.headers,
        cacheControl: "private, max-age=300",
      }),
    });
  } catch (error) {
    // Try to get user for error context, but don't fail if auth fails
    let userId: string | undefined;
    try {
      const user = await verifyAuth(request);
      userId = user?.uid;
    } catch {
      // Ignore auth errors in error handler
    }
    return handleApiError(error, { route: "/api/flashcards/[id]", userId });
  }
}

// Legacy validation removed - now using Zod schemas from lib/validation.ts

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

    if (user.role !== "student") {
      return NextResponse.json(
        { error: "Forbidden: Student role required to update flashcards" },
        { status: 403, headers: getErrorSecurityHeaders() }
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

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "Flashcard set ID is required" },
        { status: 400, headers: getErrorSecurityHeaders() }
      );
    }

    const flashcardDoc = await adminDb.collection("flashcards").doc(id).get();

    if (!flashcardDoc.exists) {
      return NextResponse.json(
        { error: "Flashcard set not found" },
        { status: 404, headers: getErrorSecurityHeaders() }
      );
    }

    const flashcardData = flashcardDoc.data();
    const isOwner = flashcardData?.userId === user.uid;

    // If user is not the owner, clone the flashcard
    if (!isOwner) {
      // Check if flashcard is shared with this user
      const shareDoc = await adminDb
        .collection("flashcardShares")
        .where("flashcardId", "==", id)
        .where("sharedWithUserId", "==", user.uid)
        .limit(1)
        .get();

      if (shareDoc.empty) {
        return NextResponse.json(
          {
            error:
              "Forbidden: You can only update your own flashcard sets or shared ones",
          },
          { status: 403, headers: getErrorSecurityHeaders() }
        );
      }

      // Clone-on-edit: Create a new flashcard copy
      const body = await request.json();

      // Validate input using Zod
      const validation = validateInput(FlashcardSetSchema, body);
      if (!validation.success) {
        return NextResponse.json(
          {
            error: "Invalid flashcard set data. Please check all fields.",
            details: validation.error.issues,
          },
          { status: 400, headers: getErrorSecurityHeaders() }
        );
      }

      const validatedData = validation.data; // Already sanitized by validateInput

      // Sanitize and prepare data
      const sanitizedCards = validatedData.cards.map((card) => {
        const cardData: any = {
          front: sanitizeString(card.front),
          back: sanitizeString(card.back),
        };

        if (
          card.frontImageUrl &&
          typeof card.frontImageUrl === "string" &&
          card.frontImageUrl.length > 0
        ) {
          cardData.frontImageUrl = sanitizeString(card.frontImageUrl);
        }

        if (
          card.backImageUrl &&
          typeof card.backImageUrl === "string" &&
          card.backImageUrl.length > 0
        ) {
          cardData.backImageUrl = sanitizeString(card.backImageUrl);
        }

        return cardData;
      });

      const clonedFlashcardData: any = {
        userId: user.uid,
        title: sanitizeString(validatedData.title),
        description: validatedData.description
          ? sanitizeString(validatedData.description)
          : "",
        cards: sanitizedCards,
        isPublic: validatedData.isPublic || false,
        totalCards: sanitizedCards.length,
        clonedFrom: id, // Reference to original
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      if (validatedData.coverImageUrl) {
        clonedFlashcardData.coverImageUrl = sanitizeString(
          validatedData.coverImageUrl
        );
      } else if (flashcardData?.coverImageUrl) {
        clonedFlashcardData.coverImageUrl = sanitizeString(
          flashcardData.coverImageUrl
        );
      }

      const newDocRef = await adminDb
        .collection("flashcards")
        .add(clonedFlashcardData);

      return NextResponse.json(
        {
          id: newDocRef.id,
          message: "Flashcard cloned and updated successfully",
          cloned: true,
          originalId: id,
        },
        { status: 201, headers: getSecurityHeaders() }
      );
    }

    const body = await request.json();

    // Validate input using Zod
    const validation = validateInput(FlashcardSetSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Invalid flashcard set data. Please check all fields.",
          details: validation.error.issues,
        },
        { status: 400, headers: getErrorSecurityHeaders() }
      );
    }

    const validatedData = validation.data; // Already sanitized by validateInput

    // Sanitize and prepare data
    const sanitizedCards = validatedData.cards.map((card) => {
      const cardData: any = {
        front: sanitizeString(card.front),
        back: sanitizeString(card.back),
      };

      if (
        card.frontImageUrl &&
        typeof card.frontImageUrl === "string" &&
        card.frontImageUrl.length > 0
      ) {
        cardData.frontImageUrl = sanitizeString(card.frontImageUrl);
      }

      if (
        card.backImageUrl &&
        typeof card.backImageUrl === "string" &&
        card.backImageUrl.length > 0
      ) {
        cardData.backImageUrl = sanitizeString(card.backImageUrl);
      }

      return cardData;
    });

    const updateData: any = {
      title: sanitizeString(validatedData.title),
      description: validatedData.description
        ? sanitizeString(validatedData.description)
        : "",
      cards: sanitizedCards,
      isPublic: validatedData.isPublic || false,
      totalCards: sanitizedCards.length,
      updatedAt: new Date(),
    };

    if (validatedData.coverImageUrl) {
      updateData.coverImageUrl = sanitizeString(validatedData.coverImageUrl);
    }

    await adminDb.collection("flashcards").doc(id).update(updateData);

    return NextResponse.json(
      {
        id,
        message: "Flashcard set updated successfully",
      },
      { status: 200, headers: getSecurityHeaders() }
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
    return handleApiError(error, { route: "/api/flashcards/[id]", userId });
  }
}
