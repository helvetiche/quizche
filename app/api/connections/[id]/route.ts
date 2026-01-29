import { type NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import { adminDb } from "@/lib/firebase-admin";
import { verifyCSRF } from "@/lib/csrf";
import {
  getSecurityHeaders,
  getErrorSecurityHeaders,
} from "@/lib/security-headers";
import { ConnectionActionSchema, validateInput } from "@/lib/validation";
import cache, { getApiCacheKey } from "@/lib/cache";
import { handleApiError } from "@/lib/error-handler";

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
        { error: "Forbidden: Student role required" },
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
    const body = await request.json();

    // Validate input using Zod
    const validation = validateInput(ConnectionActionSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Invalid action. Must be 'accept' or 'reject'.",
          details: validation.error.issues,
        },
        { status: 400, headers: getErrorSecurityHeaders() }
      );
    }

    const { action } = validation.data;

    const connectionDoc = await adminDb.collection("connections").doc(id).get();

    if (!connectionDoc.exists) {
      return NextResponse.json(
        { error: "Connection request not found" },
        { status: 404, headers: getErrorSecurityHeaders() }
      );
    }

    const connectionData = connectionDoc.data();
    if (!connectionData) {
      return NextResponse.json(
        { error: "Connection data not found" },
        { status: 404, headers: getErrorSecurityHeaders() }
      );
    }

    // Verify user is part of this connection
    if (
      connectionData.userId1 !== user.uid &&
      connectionData.userId2 !== user.uid
    ) {
      return NextResponse.json(
        { error: "Forbidden: Not authorized to modify this connection" },
        { status: 403, headers: getErrorSecurityHeaders() }
      );
    }

    // Verify user is not the requester (can't accept/reject their own request)
    if (connectionData.requestedBy === user.uid) {
      return NextResponse.json(
        { error: "Cannot accept or reject your own request" },
        { status: 400, headers: getErrorSecurityHeaders() }
      );
    }

    const otherUserId =
      connectionData.userId1 === user.uid
        ? connectionData.userId2
        : connectionData.userId1;

    if (action === "accept") {
      await adminDb.collection("connections").doc(id).update({
        status: "accepted",
        updatedAt: new Date(),
      });

      // Invalidate cache for both users
      await cache.delete(getApiCacheKey("/api/connections", user.uid));
      await cache.delete(getApiCacheKey("/api/connections", otherUserId));

      return NextResponse.json(
        {
          id,
          message: "Connection request accepted",
          status: "accepted",
        },
        { status: 200, headers: getSecurityHeaders() }
      );
    } else {
      // Reject: delete the connection document
      await adminDb.collection("connections").doc(id).delete();

      // Invalidate cache for both users
      await cache.delete(getApiCacheKey("/api/connections", user.uid));
      await cache.delete(getApiCacheKey("/api/connections", otherUserId));

      return NextResponse.json(
        {
          id,
          message: "Connection request rejected",
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
      route: "/api/connections/[id]",
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
    if (csrfError) {
      return NextResponse.json(
        { error: csrfError.error },
        { status: csrfError.status, headers: csrfError.headers }
      );
    }

    const { id } = await params;

    const connectionDoc = await adminDb.collection("connections").doc(id).get();

    if (!connectionDoc.exists) {
      return NextResponse.json(
        { error: "Connection not found" },
        { status: 404, headers: getErrorSecurityHeaders() }
      );
    }

    const connectionData = connectionDoc.data();
    if (!connectionData) {
      return NextResponse.json(
        { error: "Connection data not found" },
        { status: 404, headers: getErrorSecurityHeaders() }
      );
    }

    // Verify user is part of this connection
    if (
      connectionData.userId1 !== user.uid &&
      connectionData.userId2 !== user.uid
    ) {
      return NextResponse.json(
        { error: "Forbidden: Not authorized to delete this connection" },
        { status: 403, headers: getErrorSecurityHeaders() }
      );
    }

    // Optionally revoke all shared flashcards between these users
    const otherUserId =
      connectionData.userId1 === user.uid
        ? connectionData.userId2
        : connectionData.userId1;

    // Find all flashcards shared between these users
    const sharedFlashcards = await adminDb
      .collection("flashcardShares")
      .where("ownerId", "==", user.uid)
      .where("sharedWithUserId", "==", otherUserId)
      .get();

    const batch = adminDb.batch();
    sharedFlashcards.forEach((doc) => {
      batch.delete(doc.ref);
    });

    // Also handle flashcards shared by the other user
    const sharedByOther = await adminDb
      .collection("flashcardShares")
      .where("ownerId", "==", otherUserId)
      .where("sharedWithUserId", "==", user.uid)
      .get();

    sharedByOther.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();

    // Delete connection
    await adminDb.collection("connections").doc(id).delete();

    // Invalidate cache for both users
    await cache.delete(getApiCacheKey("/api/connections", user.uid));
    await cache.delete(getApiCacheKey("/api/connections", otherUserId));

    return NextResponse.json(
      {
        id,
        message: "Connection removed successfully",
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
    return handleApiError(error, { route: "/api/connections/[id]", userId });
  }
}
