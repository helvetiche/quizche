/* eslint-disable @typescript-eslint/strict-boolean-expressions, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unnecessary-condition, @typescript-eslint/prefer-nullish-coalescing, @typescript-eslint/no-explicit-any, @typescript-eslint/no-floating-promises, @typescript-eslint/no-unsafe-return */
import { type NextRequest, NextResponse } from "next/server";
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
import {
  FlashcardSetSchema,
  validateInput,
  sanitizeString,
} from "@/lib/validation";
import { handleApiError } from "@/lib/error-handler";

type Flashcard = {
  front: string;
  back: string;
  frontImageUrl?: string;
  backImageUrl?: string;
};

type FlashcardSetData = {
  title: string;
  description?: string;
  cards: Flashcard[];
  isPublic?: boolean;
  coverImageUrl?: string;
};

const _validateFlashcardSet = (data: unknown): data is FlashcardSetData => {
  if (data === null || data === undefined || typeof data !== "object")
    return false;
  const obj = data as Record<string, unknown>;
  if (typeof obj.title !== "string" || obj.title.trim().length === 0) {
    return false;
  }
  if (obj.title.trim().length > 200) return false;
  if (
    obj.description !== undefined &&
    (typeof obj.description !== "string" || obj.description.length > 500)
  ) {
    return false;
  }
  if (!Array.isArray(obj.cards) || obj.cards.length === 0) {
    return false;
  }
  if (obj.cards.length > 500) return false; // Limit to 500 cards per set
  if (obj.isPublic !== undefined && typeof obj.isPublic !== "boolean") {
    return false;
  }
  if (
    obj.coverImageUrl !== undefined &&
    (typeof obj.coverImageUrl !== "string" ||
      obj.coverImageUrl.trim().length === 0)
  ) {
    return false;
  }
  return obj.cards.every((card: unknown) => {
    if (card === null || card === undefined || typeof card !== "object") {
      return false;
    }
    const cardObj = card as Record<string, unknown>;
    if (
      typeof cardObj.front !== "string" ||
      typeof cardObj.back !== "string" ||
      cardObj.front.trim().length === 0 ||
      cardObj.back.trim().length === 0 ||
      cardObj.front.trim().length > 1000 ||
      cardObj.back.trim().length > 1000
    ) {
      return false;
    }
    // Validate image URLs if present
    if (
      cardObj.frontImageUrl !== undefined &&
      (typeof cardObj.frontImageUrl !== "string" ||
        cardObj.frontImageUrl.trim().length === 0)
    ) {
      return false;
    }
    if (
      cardObj.backImageUrl !== undefined &&
      (typeof cardObj.backImageUrl !== "string" ||
        cardObj.backImageUrl.trim().length === 0)
    ) {
      return false;
    }
    return true;
  });
};

export async function GET(request: NextRequest): Promise<NextResponse> {
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
    const limitParam = url.searchParams.get("limit");
    const isPublic = url.searchParams.get("public") === "true";
    const limit = parseInt(limitParam !== null ? limitParam : "50", 10);
    const validatedLimit = Math.min(Math.max(limit, 1), 100);

    // Check cache first
    const cacheKey = getApiCacheKey("/api/flashcards:v2", user.uid, {
      limit: validatedLimit.toString(),
      public: isPublic.toString(),
    });
    const cached = await cache.get<{
      flashcards: Record<string, unknown>[];
    }>(cacheKey);
    if (cached !== null && cached !== undefined) {
      return NextResponse.json(cached, {
        status: 200,
        headers: getPublicSecurityHeaders({
          rateLimitHeaders: rateLimitResult.headers,
          cacheControl: "private, max-age=300",
        }),
      });
    }

    if (isPublic) {
      let publicFlashcardsSnapshot;
      try {
        publicFlashcardsSnapshot = await adminDb
          .collection("flashcards")
          .where("isPublic", "==", true)
          .orderBy("createdAt", "desc")
          .limit(validatedLimit)
          .get();
      } catch (error: any) {
        // Fallback for missing index: fetch without sort, then sort in memory
        // This handles the "The query requires an index" error
        if (error?.code === 9 || error?.message?.includes("index")) {
          console.warn(
            "Missing Firestore index for 'isPublic' + 'createdAt'. Falling back to in-memory sort. Please create the index in Firebase Console."
          );
          publicFlashcardsSnapshot = await adminDb
            .collection("flashcards")
            .where("isPublic", "==", true)
            .limit(validatedLimit)
            .get();
        } else {
          throw error;
        }
      }

      let publicFlashcards = publicFlashcardsSnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          title: data.title,
          description: data.description ?? "",
          totalCards: data.totalCards ?? 0,
          isPublic: true,
          coverImageUrl: data.coverImageUrl ?? undefined,
          createdAt:
            data.createdAt?.toDate?.()?.toISOString() ?? data.createdAt,
          updatedAt:
            data.updatedAt?.toDate?.()?.toISOString() ?? data.updatedAt,
          userId: data.userId,
        };
      });

      // Ensure sorted by createdAt desc (needed if fallback was used)
      publicFlashcards.sort((a, b) => {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return dateB - dateA;
      });

      // Fetch owner details
      const ownerIds = new Set(
        publicFlashcards
          .map((fc) => fc.userId)
          .filter(
            (uid): uid is string => typeof uid === "string" && uid.length > 0
          )
      );
      const ownerPromises = Array.from(ownerIds).map((uid) =>
        adminDb
          .collection("users")
          .doc(uid)
          .get()
          .then((doc) => ({ uid, doc }))
          .catch((err) => {
            console.error(`Error fetching user ${uid}:`, err);
            return { uid, doc: { exists: false, data: () => null } as any };
          })
      );

      const ownerResults = await Promise.all(ownerPromises);
      const ownerDetails: Record<string, any> = {};

      ownerResults.forEach(({ uid, doc }) => {
        if (doc.exists) {
          const data = doc.data();
          ownerDetails[uid as string] = {
            displayName:
              data?.displayName ||
              `${data?.firstName ?? ""} ${data?.lastName ?? ""}`.trim() ||
              "",
            email: data?.email ?? "",
            photoUrl: data?.profilePhotoUrl || data?.photoURL || null,
            school: data?.school ?? "",
          };
        }
      });

      const flashcards = publicFlashcards.map((fc) => {
        const owner = ownerDetails[fc.userId] || {
          displayName: "Unknown User",
          email: "",
          photoUrl: null,
          school: "",
        };
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { userId, ...rest } = fc;
        return {
          ...rest,
          isShared: true,
          sharedBy: owner.displayName || owner.email || "Unknown User",
          sharedByPhotoUrl: owner.photoUrl,
          sharedBySchool: owner.school,
          sharedByUserId: fc.userId,
        };
      });

      const result = { flashcards };

      // Cache the result
      await cache.set(cacheKey, result, 300); // 5 minutes

      return NextResponse.json(result, {
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
        description: data.description ?? "",
        totalCards: data.totalCards ?? 0,
        isPublic: data.isPublic ?? false,
        coverImageUrl: data.coverImageUrl ?? undefined,
        createdAt: data.createdAt?.toDate?.()?.toISOString() ?? data.createdAt,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() ?? data.updatedAt,
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
      if (
        data.flashcardId !== undefined &&
        data.flashcardId !== null &&
        data.ownerId !== undefined &&
        data.ownerId !== null
      ) {
        const flashcardId = data.flashcardId as string;
        const ownerId = data.ownerId as string;
        sharedFlashcardIds.push(flashcardId);
        ownerIds.add(ownerId);
        ownerMap[flashcardId] = ownerId;
      }
    });

    const sharedFlashcards: Record<string, unknown>[] = [];
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
        if (doc.exists !== undefined && doc.exists !== null) {
          const data = doc.data();
          ownerDetails[uid] = {
            displayName:
              data?.displayName ||
              `${data?.firstName ?? ""} ${data?.lastName ?? ""}`.trim() ||
              "",
            email: data?.email ?? "",
          };
        }
      });

      // Map shared flashcards
      flashcardResults.forEach(({ id, doc }) => {
        if (doc.exists !== undefined && doc.exists !== null) {
          const data = doc.data();
          const ownerId = ownerMap[id];
          const owner = ownerDetails[ownerId] || { displayName: "", email: "" };

          sharedFlashcards.push({
            id: doc.id,
            title: data.title,
            description: data.description ?? "",
            totalCards: data.totalCards ?? 0,
            isPublic: data.isPublic ?? false,
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
    const flashcardMap = new Map<string, Record<string, unknown>>();
    ownFlashcards.forEach((fc) => {
      flashcardMap.set(fc.id, fc);
    });
    sharedFlashcards.forEach((fc) => {
      const fcId = String(fc.id);
      if (!flashcardMap.has(fcId)) {
        flashcardMap.set(fcId, fc);
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
    // Try to get user for error context, but don't fail if auth fails
    let userId: string | undefined;
    try {
      const user = await verifyAuth(request);
      userId = user?.uid;
    } catch {
      // Ignore auth errors in error handler
    }
    return handleApiError(error, { route: "/api/flashcards", userId });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
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
    if (csrfError !== undefined && csrfError !== null) {
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

    const flashcardSetData: any = {
      userId: user.uid,
      title: sanitizeString(validatedData.title),
      description: validatedData.description
        ? sanitizeString(validatedData.description)
        : "",
      cards: sanitizedCards,
      isPublic: validatedData.isPublic ?? false,
      totalCards: sanitizedCards.length,
      coverImageUrl: validatedData.coverImageUrl
        ? sanitizeString(validatedData.coverImageUrl)
        : "",
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
    // Try to get user for error context, but don't fail if auth fails
    let userId: string | undefined;
    try {
      const user = await verifyAuth(request);
      userId = user?.uid;
    } catch {
      // Ignore auth errors in error handler
    }
    return handleApiError(error, { route: "/api/flashcards", userId });
  }
}
