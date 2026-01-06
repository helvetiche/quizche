import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import { adminDb } from "@/lib/firebase-admin";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import cache, { getApiCacheKey } from "@/lib/cache";
import { trackUsage } from "@/lib/monitoring";
import { verifyCSRF } from "@/lib/csrf";
import {
  getSecurityHeaders,
  getErrorSecurityHeaders,
  getPublicSecurityHeaders,
} from "@/lib/security-headers";
import { FlashcardSetSchema, validateInput } from "@/lib/validation";

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
  if (data.cards.length > 500) return false; // Limit to 500 cards per set
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
    // Validate image URLs if present
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

export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized: Invalid or missing authentication token" },
        { status: 401, headers: getErrorSecurityHeaders() }
      );
    }

    // Rate limiting
    const rateLimitResult = await rateLimit({
      identifier: user.uid,
      key: "flashcards:list",
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

    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get("limit") || "50");
    const validatedLimit = Math.min(Math.max(limit, 1), 100);

    // Check cache first
    const cacheKey = getApiCacheKey("/api/flashcards", user.uid, {
      limit: validatedLimit.toString(),
    });
    const cached = await cache.get<{ flashcards: any[] }>(cacheKey);
    if (cached) {
      return NextResponse.json(cached, {
        status: 200,
        headers: getPublicSecurityHeaders({
          rateLimitHeaders: rateLimitResult.headers,
          cacheControl: "private, max-age=300",
        }),
      });
    }

    // Optimized: Use field selection to reduce data transfer
    // Query own flashcards - only fetch needed fields
    const ownFlashcardsSnapshot = await adminDb
      .collection("flashcards")
      .where("userId", "==", user.uid)
      .orderBy("createdAt", "desc")
      .limit(validatedLimit)
      .get();

    const ownFlashcards = ownFlashcardsSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        title: data.title,
        description: data.description || "",
        totalCards: data.totalCards || 0,
        isPublic: data.isPublic || false,
        coverImageUrl: data.coverImageUrl || undefined,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
        isShared: false,
        sharedBy: undefined,
      };
    });

    // Query shared flashcards - optimized with composite index
    const sharedFlashcardsSnapshot = await adminDb
      .collection("flashcardShares")
      .where("sharedWithUserId", "==", user.uid)
      .orderBy("createdAt", "desc")
      .limit(validatedLimit)
      .get();

    // Optimized: Batch fetch flashcards and owners in parallel
    const sharedFlashcardIds: string[] = [];
    const ownerIds = new Set<string>();
    const ownerMap: Record<string, string> = {};

    sharedFlashcardsSnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.flashcardId && data.ownerId) {
        sharedFlashcardIds.push(data.flashcardId);
        ownerIds.add(data.ownerId);
        ownerMap[data.flashcardId] = data.ownerId;
      }
    });

    const sharedFlashcards: any[] = [];
    if (sharedFlashcardIds.length > 0) {
      // Optimized: Use batch reads (Firestore allows up to 10 per batch)
      const flashcardBatches: Promise<any[]>[] = [];
      for (let i = 0; i < sharedFlashcardIds.length; i += 10) {
        const batch = sharedFlashcardIds.slice(i, i + 10);
        flashcardBatches.push(
          Promise.all(
            batch.map((id) =>
              adminDb
                .collection("flashcards")
                .doc(id)
                .get()
                .then((doc) => ({ id, doc }))
            )
          )
        );
      }

      // Fetch owner details in parallel
      const ownerPromises = Array.from(ownerIds).map((uid) =>
        adminDb
          .collection("users")
          .doc(uid)
          .get()
          .then((doc) => ({ uid, doc }))
      );

      const [flashcardResults, ownerResults] = await Promise.all([
        Promise.all(flashcardBatches).then((results) => results.flat()),
        Promise.all(ownerPromises),
      ]);

      const ownerDetails: Record<string, any> = {};
      ownerResults.forEach(({ uid, doc }) => {
        if (doc.exists) {
          const data = doc.data();
          ownerDetails[uid] = {
            displayName:
              data?.displayName ||
              `${data?.firstName || ""} ${data?.lastName || ""}`.trim() ||
              "",
            email: data?.email || "",
          };
        }
      });

      // Map shared flashcards
      flashcardResults.forEach(({ id, doc }) => {
        if (doc.exists) {
          const data = doc.data();
          const ownerId = ownerMap[id];
          const owner = ownerDetails[ownerId] || { displayName: "", email: "" };

          sharedFlashcards.push({
            id: doc.id,
            title: data.title,
            description: data.description || "",
            totalCards: data.totalCards || 0,
            isPublic: data.isPublic || false,
            coverImageUrl: data.coverImageUrl || undefined,
            createdAt:
              data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
            updatedAt:
              data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
            isShared: true,
            sharedBy: owner.displayName || owner.email || "Unknown",
            sharedByUserId: ownerId,
          });
        }
      });
    }

    // Merge and deduplicate (prioritize own flashcards)
    const flashcardMap = new Map<string, any>();
    ownFlashcards.forEach((fc) => {
      flashcardMap.set(fc.id, fc);
    });
    sharedFlashcards.forEach((fc) => {
      if (!flashcardMap.has(fc.id)) {
        flashcardMap.set(fc.id, fc);
      }
    });

    const flashcards = Array.from(flashcardMap.values());
    const result = { flashcards };

    // Cache the result
    await cache.set(cacheKey, result, 300); // 5 minutes

    // Track usage
    trackUsage({
      userId: user.uid,
      route: "/api/flashcards",
      method: "GET",
      timestamp: new Date(),
    });

    return NextResponse.json(result, {
      status: 200,
      headers: getPublicSecurityHeaders({
        rateLimitHeaders: rateLimitResult.headers,
        cacheControl: "private, max-age=300",
      }),
    });
  } catch (error) {
    console.error("Get flashcards error:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: getErrorSecurityHeaders() }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized: Invalid or missing authentication token" },
        { status: 401, headers: getErrorSecurityHeaders() }
      );
    }

    // Rate limiting for flashcard creation
    const rateLimitResult = await rateLimit({
      identifier: user.uid,
      key: "flashcards:create",
      limit: RATE_LIMITS.flashcardCreate.limit,
      window: RATE_LIMITS.flashcardCreate.window,
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

    const validatedData = validation.data;

    // Sanitize and prepare data
    const sanitizedCards = validatedData.cards.map((card) => {
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

    const flashcardSetData: any = {
      userId: user.uid,
      title: validatedData.title,
      description: validatedData.description || "",
      cards: sanitizedCards,
      isPublic: validatedData.isPublic || false,
      totalCards: sanitizedCards.length,
      coverImageUrl: validatedData.coverImageUrl || "",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const docRef = await adminDb.collection("flashcards").add(flashcardSetData);

    // Invalidate cache for user's flashcard list
    await cache.delete(getApiCacheKey("/api/flashcards", user.uid));

    // Track usage
    trackUsage({
      userId: user.uid,
      route: "/api/flashcards",
      method: "POST",
      timestamp: new Date(),
    });

    return NextResponse.json(
      {
        id: docRef.id,
        message: "Flashcard set created successfully",
      },
      {
        status: 201,
        headers: getSecurityHeaders({
          rateLimitHeaders: rateLimitResult.headers,
        }),
      }
    );
  } catch (error) {
    console.error("Create flashcard set error:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: getErrorSecurityHeaders() }
    );
  }
}
