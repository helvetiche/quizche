/* eslint-disable @typescript-eslint/strict-boolean-expressions, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unnecessary-condition, @typescript-eslint/explicit-function-return-type */
import { type NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import { adminDb } from "@/lib/firebase-admin";
import { verifyCSRF } from "@/lib/csrf";
import {
  getSecurityHeaders,
  getErrorSecurityHeaders,
} from "@/lib/security-headers";
import { FlashcardShareSchema, validateInput } from "@/lib/validation";
import { handleApiError } from "@/lib/error-handler";

export async function POST(
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
        { error: "Forbidden: Student role required" },
        { status: 403, headers: getErrorSecurityHeaders() }
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

    const { id } = await params;
    const body = await request.json();

    // Validate input using Zod
    const validation = validateInput(FlashcardShareSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Invalid input data. Please check all fields.",
          details: validation.error.issues,
        },
        { status: 400, headers: getErrorSecurityHeaders() }
      );
    }

    const { userIds } = validation.data;

    // Verify flashcard exists and user owns it
    const flashcardDoc = await adminDb.collection("flashcards").doc(id).get();

    if (!flashcardDoc.exists) {
      return NextResponse.json(
        { error: "Flashcard set not found" },
        { status: 404, headers: getErrorSecurityHeaders() }
      );
    }

    const flashcardData = flashcardDoc.data();
    if (flashcardData !== undefined && flashcardData.userId !== user.uid) {
      return NextResponse.json(
        { error: "Forbidden: You can only share your own flashcard sets" },
        { status: 403, headers: getErrorSecurityHeaders() }
      );
    }

    // Verify all target users exist and are students
    const userDocs = await Promise.all(
      userIds.map((uid: string) => adminDb.collection("users").doc(uid).get())
    );

    const validUserIds: string[] = [];
    for (const doc of userDocs) {
      if (doc.exists !== undefined && doc.exists !== null) {
        const userData = doc.data();
        if (userData?.role === "student" && doc.id !== user.uid) {
          validUserIds.push(doc.id);
        }
      }
    }

    if (validUserIds.length === 0) {
      return NextResponse.json(
        { error: "No valid users to share with" },
        { status: 400, headers: getErrorSecurityHeaders() }
      );
    }

    // Verify connections exist for all users
    const connectionChecks = await Promise.all(
      validUserIds.map(async (targetUserId) => {
        const [userId1, userId2] =
          user.uid < targetUserId
            ? [user.uid, targetUserId]
            : [targetUserId, user.uid];
        const connectionId = `${userId1}_${userId2}`;
        const connectionDoc = await adminDb
          .collection("connections")
          .doc(connectionId)
          .get();
        return {
          userId: targetUserId,
          isConnected:
            connectionDoc.exists && connectionDoc.data()?.status === "accepted",
        };
      })
    );

    const connectedUserIds = connectionChecks
      .filter((check) => check.isConnected)
      .map((check) => check.userId);

    if (connectedUserIds.length === 0) {
      return NextResponse.json(
        { error: "Can only share with connected users" },
        { status: 400, headers: getErrorSecurityHeaders() }
      );
    }

    // Check existing shares to avoid duplicates
    const existingShares = await adminDb
      .collection("flashcardShares")
      .where("flashcardId", "==", id)
      .get();

    const existingShareUserIds = new Set<string>();
    existingShares.forEach((doc) => {
      const data = doc.data();
      if (data?.sharedWithUserId) {
        existingShareUserIds.add(data.sharedWithUserId);
      }
    });

    // Create share documents for new shares
    const batch = adminDb.batch();
    const newShareUserIds: string[] = [];

    connectedUserIds.forEach((targetUserId) => {
      if (!existingShareUserIds.has(targetUserId)) {
        const shareRef = adminDb.collection("flashcardShares").doc();
        batch.set(shareRef, {
          flashcardId: id,
          ownerId: user.uid,
          sharedWithUserId: targetUserId,
          createdAt: new Date(),
        });
        newShareUserIds.push(targetUserId);
      }
    });

    if (newShareUserIds.length > 0) {
      await batch.commit();
    }

    // Update flashcard sharedWith array (optional optimization)
    const currentSharedWith = flashcardData?.sharedWith ?? ([] as never[]);
    const updatedSharedWith = Array.from(
      new Set([...currentSharedWith, ...newShareUserIds])
    );

    await adminDb.collection("flashcards").doc(id).update({
      sharedWith: updatedSharedWith,
    });

    return NextResponse.json(
      {
        message: `Flashcard shared with ${newShareUserIds.length} user(s)`,
        sharedWith: newShareUserIds,
        alreadyShared: connectedUserIds.filter(
          (id) => !newShareUserIds.includes(id)
        ),
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
    return handleApiError(error, {
      route: "/api/flashcards/[id]/share",
      userId,
    });
  }
}

export async function DELETE(
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
        { error: "Forbidden: Student role required" },
        { status: 403, headers: getErrorSecurityHeaders() }
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

    const { id } = await params;
    const url = new URL(request.url);
    const targetUserId = url.searchParams.get("userId");

    // Verify flashcard exists and user owns it
    const flashcardDoc = await adminDb.collection("flashcards").doc(id).get();

    if (!flashcardDoc.exists) {
      return NextResponse.json(
        { error: "Flashcard set not found" },
        { status: 404, headers: getErrorSecurityHeaders() }
      );
    }

    const flashcardData = flashcardDoc.data();
    if (flashcardData !== undefined && flashcardData.userId !== user.uid) {
      return NextResponse.json(
        {
          error:
            "Forbidden: You can only revoke access to your own flashcard sets",
        },
        { status: 403, headers: getErrorSecurityHeaders() }
      );
    }

    if (targetUserId !== undefined && targetUserId !== null) {
      // Revoke access for specific user
      const shares = await adminDb
        .collection("flashcardShares")
        .where("flashcardId", "==", id)
        .where("sharedWithUserId", "==", targetUserId)
        .get();

      const batch = adminDb.batch();
      shares.forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();

      // Update flashcard sharedWith array
      const currentSharedWith = flashcardData?.sharedWith ?? ([] as never[]);
      const updatedSharedWith = currentSharedWith.filter(
        (uid: string) => uid !== targetUserId
      );

      await adminDb.collection("flashcards").doc(id).update({
        sharedWith: updatedSharedWith,
      });

      return NextResponse.json(
        {
          message: "Access revoked successfully",
        },
        { status: 200, headers: getSecurityHeaders() }
      );
    } else {
      // Revoke access for all users
      const shares = await adminDb
        .collection("flashcardShares")
        .where("flashcardId", "==", id)
        .get();

      const batch = adminDb.batch();
      shares.forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();

      // Update flashcard sharedWith array
      await adminDb.collection("flashcards").doc(id).update({
        sharedWith: [],
      });

      return NextResponse.json(
        {
          message: "Access revoked for all users",
        },
        { status: 200, headers: getSecurityHeaders() }
      );
    }
  } catch (error) {
    // Try to get user for error context, but don't fail if auth fails
    let userId: string | undefined;
    try {
      const user = await verifyAuth(request);
      userId = user?.uid;
    } catch {
      // Ignore auth errors in error handler
    }
    return handleApiError(error, {
      route: "/api/flashcards/[id]/share",
      userId,
    });
  }
}
