import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import { adminDb } from "@/lib/firebase-admin";
import { verifyCSRF } from "@/lib/csrf";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import cache, { getApiCacheKey } from "@/lib/cache";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;

    if (!id) {
      const headers = {
        "Content-Type": "application/json; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "no-store, no-cache, must-revalidate",
      };
      return NextResponse.json(
        { error: "Flashcard set ID is required" },
        { status: 400, headers }
      );
    }

    const flashcardDoc = await adminDb.collection("flashcards").doc(id).get();

    if (!flashcardDoc.exists) {
      const headers = {
        "Content-Type": "application/json; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "no-store, no-cache, must-revalidate",
      };
      return NextResponse.json(
        { error: "Flashcard set not found" },
        { status: 404, headers }
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
          const headers = {
            "Content-Type": "application/json; charset=utf-8",
            "X-Content-Type-Options": "nosniff",
            "Cache-Control": "no-store, no-cache, must-revalidate",
          };
          return NextResponse.json(
            {
              error:
                "Forbidden: You can only access your own flashcard sets, public ones, or shared ones",
            },
            { status: 403, headers }
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
    const cacheKey = getApiCacheKey(`/api/flashcards/${id}`, user.uid);
    const cached = await cache.get<{ flashcardSet: any }>(cacheKey);
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

    const result = {
      flashcardSet: {
        id: flashcardDoc.id,
        title: flashcardData?.title || "",
        description: flashcardData?.description || "",
        cards: flashcardData?.cards || [],
        totalCards: flashcardData?.totalCards || 0,
        isPublic: flashcardData?.isPublic || false,
        coverImageUrl: flashcardData?.coverImageUrl || undefined,
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

    return NextResponse.json(result, { status: 200, headers });
  } catch (error) {
    console.error("Get flashcard set error:", error);

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

interface Flashcard {
  front: string;
  back: string;
  frontImageUrl?: string;
  backImageUrl?: string;
}

interface FlashcardSetData {
  title: string;
  description?: string;
  cards: Flashcard[];
  isPublic?: boolean;
  coverImageUrl?: string;
}

const validateFlashcardSet = (data: any): data is FlashcardSetData => {
  if (!data || typeof data !== "object") return false;
  if (
    !data.title ||
    typeof data.title !== "string" ||
    data.title.trim().length === 0
  ) {
    return false;
  }
  if (data.title.trim().length > 200) return false;
  if (
    data.description &&
    (typeof data.description !== "string" || data.description.length > 500)
  ) {
    return false;
  }
  if (!Array.isArray(data.cards) || data.cards.length === 0) {
    return false;
  }
  if (data.cards.length > 500) return false;
  if (
    typeof data.isPublic !== "undefined" &&
    typeof data.isPublic !== "boolean"
  ) {
    return false;
  }
  if (
    data.coverImageUrl !== undefined &&
    (typeof data.coverImageUrl !== "string" ||
      data.coverImageUrl.trim().length === 0)
  ) {
    return false;
  }
  return data.cards.every((card: any) => {
    if (
      !card ||
      typeof card !== "object" ||
      typeof card.front !== "string" ||
      typeof card.back !== "string" ||
      card.front.trim().length === 0 ||
      card.back.trim().length === 0 ||
      card.front.trim().length > 1000 ||
      card.back.trim().length > 1000
    ) {
      return false;
    }
    if (
      card.frontImageUrl !== undefined &&
      (typeof card.frontImageUrl !== "string" ||
        card.frontImageUrl.trim().length === 0)
    ) {
      return false;
    }
    if (
      card.backImageUrl !== undefined &&
      (typeof card.backImageUrl !== "string" ||
        card.backImageUrl.trim().length === 0)
    ) {
      return false;
    }
    return true;
  });
};

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
        { error: "Forbidden: Student role required to update flashcards" },
        { status: 403, headers }
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
      const headers = {
        "Content-Type": "application/json; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "no-store, no-cache, must-revalidate",
      };
      return NextResponse.json(
        { error: "Flashcard set ID is required" },
        { status: 400, headers }
      );
    }

    const flashcardDoc = await adminDb.collection("flashcards").doc(id).get();

    if (!flashcardDoc.exists) {
      const headers = {
        "Content-Type": "application/json; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "no-store, no-cache, must-revalidate",
      };
      return NextResponse.json(
        { error: "Flashcard set not found" },
        { status: 404, headers }
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
        const headers = {
          "Content-Type": "application/json; charset=utf-8",
          "X-Content-Type-Options": "nosniff",
          "Cache-Control": "no-store, no-cache, must-revalidate",
        };
        return NextResponse.json(
          {
            error:
              "Forbidden: You can only update your own flashcard sets or shared ones",
          },
          { status: 403, headers }
        );
      }

      // Clone-on-edit: Create a new flashcard copy
      const body = await request.json();

      if (!validateFlashcardSet(body)) {
        const headers = {
          "Content-Type": "application/json; charset=utf-8",
          "X-Content-Type-Options": "nosniff",
          "Cache-Control": "no-store, no-cache, must-revalidate",
        };
        return NextResponse.json(
          { error: "Invalid flashcard set data. Please check all fields." },
          { status: 400, headers }
        );
      }

      // Sanitize and prepare data
      const sanitizedCards = body.cards.map((card: Flashcard) => {
        const cardData: any = {
          front: card.front.trim(),
          back: card.back.trim(),
        };

        if (
          card.frontImageUrl &&
          typeof card.frontImageUrl === "string" &&
          card.frontImageUrl.trim().length > 0
        ) {
          cardData.frontImageUrl = card.frontImageUrl.trim();
        }

        if (
          card.backImageUrl &&
          typeof card.backImageUrl === "string" &&
          card.backImageUrl.trim().length > 0
        ) {
          cardData.backImageUrl = card.backImageUrl.trim();
        }

        return cardData;
      });

      const clonedFlashcardData: any = {
        userId: user.uid,
        title: body.title.trim(),
        description: body.description?.trim() || "",
        cards: sanitizedCards,
        isPublic: body.isPublic || false,
        totalCards: sanitizedCards.length,
        clonedFrom: id, // Reference to original
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      if (
        body.coverImageUrl &&
        typeof body.coverImageUrl === "string" &&
        body.coverImageUrl.trim().length > 0
      ) {
        clonedFlashcardData.coverImageUrl = body.coverImageUrl.trim();
      } else if (flashcardData?.coverImageUrl) {
        clonedFlashcardData.coverImageUrl = flashcardData.coverImageUrl;
      }

      const newDocRef = await adminDb
        .collection("flashcards")
        .add(clonedFlashcardData);

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
        "Cache-Control": "no-store, no-cache, must-revalidate",
      };

      return NextResponse.json(
        {
          id: newDocRef.id,
          message: "Flashcard cloned and updated successfully",
          cloned: true,
          originalId: id,
        },
        { status: 201, headers }
      );
    }

    const body = await request.json();

    if (!validateFlashcardSet(body)) {
      const headers = {
        "Content-Type": "application/json; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "no-store, no-cache, must-revalidate",
      };
      return NextResponse.json(
        { error: "Invalid flashcard set data. Please check all fields." },
        { status: 400, headers }
      );
    }

    // Sanitize and prepare data
    const sanitizedCards = body.cards.map((card: Flashcard) => {
      const cardData: any = {
        front: card.front.trim(),
        back: card.back.trim(),
      };

      if (
        card.frontImageUrl &&
        typeof card.frontImageUrl === "string" &&
        card.frontImageUrl.trim().length > 0
      ) {
        cardData.frontImageUrl = card.frontImageUrl.trim();
      }

      if (
        card.backImageUrl &&
        typeof card.backImageUrl === "string" &&
        card.backImageUrl.trim().length > 0
      ) {
        cardData.backImageUrl = card.backImageUrl.trim();
      }

      return cardData;
    });

    const updateData: any = {
      title: body.title.trim(),
      description: body.description?.trim() || "",
      cards: sanitizedCards,
      isPublic: body.isPublic || false,
      totalCards: sanitizedCards.length,
      updatedAt: new Date(),
    };

    if (
      body.coverImageUrl &&
      typeof body.coverImageUrl === "string" &&
      body.coverImageUrl.trim().length > 0
    ) {
      updateData.coverImageUrl = body.coverImageUrl.trim();
    }

    await adminDb.collection("flashcards").doc(id).update(updateData);

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
      "Cache-Control": "no-store, no-cache, must-revalidate",
    };

    return NextResponse.json(
      {
        id,
        message: "Flashcard set updated successfully",
      },
      { status: 200, headers }
    );
  } catch (error) {
    console.error("Update flashcard set error:", error);

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
