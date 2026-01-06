import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import { adminDb } from "@/lib/firebase-admin";
import { verifyCSRF } from "@/lib/csrf";

export async function POST(
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
        { error: "Forbidden: Student role required" },
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
    const body = await request.json();
    const { userIds } = body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      const headers = {
        "Content-Type": "application/json; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "no-store, no-cache, must-revalidate",
      };
      return NextResponse.json(
        { error: "User IDs array is required" },
        { status: 400, headers }
      );
    }

    if (userIds.length > 50) {
      const headers = {
        "Content-Type": "application/json; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "no-store, no-cache, must-revalidate",
      };
      return NextResponse.json(
        { error: "Cannot share with more than 50 users at once" },
        { status: 400, headers }
      );
    }

    // Verify flashcard exists and user owns it
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
    if (flashcardData?.userId !== user.uid) {
      const headers = {
        "Content-Type": "application/json; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "no-store, no-cache, must-revalidate",
      };
      return NextResponse.json(
        { error: "Forbidden: You can only share your own flashcard sets" },
        { status: 403, headers }
      );
    }

    // Verify all target users exist and are students
    const userDocs = await Promise.all(
      userIds.map((uid: string) => adminDb.collection("users").doc(uid).get())
    );

    const validUserIds: string[] = [];
    for (let i = 0; i < userDocs.length; i++) {
      const doc = userDocs[i];
      if (doc.exists) {
        const userData = doc.data();
        if (userData?.role === "student" && doc.id !== user.uid) {
          validUserIds.push(doc.id);
        }
      }
    }

    if (validUserIds.length === 0) {
      const headers = {
        "Content-Type": "application/json; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "no-store, no-cache, must-revalidate",
      };
      return NextResponse.json(
        { error: "No valid users to share with" },
        { status: 400, headers }
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
          isConnected: connectionDoc.exists && connectionDoc.data()?.status === "accepted",
        };
      })
    );

    const connectedUserIds = connectionChecks
      .filter((check) => check.isConnected)
      .map((check) => check.userId);

    if (connectedUserIds.length === 0) {
      const headers = {
        "Content-Type": "application/json; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "no-store, no-cache, must-revalidate",
      };
      return NextResponse.json(
        { error: "Can only share with connected users" },
        { status: 400, headers }
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
    const currentSharedWith = flashcardData?.sharedWith || [];
    const updatedSharedWith = Array.from(
      new Set([...currentSharedWith, ...newShareUserIds])
    );

    await adminDb.collection("flashcards").doc(id).update({
      sharedWith: updatedSharedWith,
    });

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
        message: `Flashcard shared with ${newShareUserIds.length} user(s)`,
        sharedWith: newShareUserIds,
        alreadyShared: connectedUserIds.filter(
          (id) => !newShareUserIds.includes(id)
        ),
      },
      { status: 200, headers }
    );
  } catch (error) {
    console.error("Share flashcard error:", error);

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

export async function DELETE(
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
        { error: "Forbidden: Student role required" },
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
    const url = new URL(request.url);
    const targetUserId = url.searchParams.get("userId");

    // Verify flashcard exists and user owns it
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
    if (flashcardData?.userId !== user.uid) {
      const headers = {
        "Content-Type": "application/json; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "no-store, no-cache, must-revalidate",
      };
      return NextResponse.json(
        { error: "Forbidden: You can only revoke access to your own flashcard sets" },
        { status: 403, headers }
      );
    }

    if (targetUserId) {
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
      const currentSharedWith = flashcardData?.sharedWith || [];
      const updatedSharedWith = currentSharedWith.filter(
        (uid: string) => uid !== targetUserId
      );

      await adminDb.collection("flashcards").doc(id).update({
        sharedWith: updatedSharedWith,
      });

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
          message: "Access revoked successfully",
        },
        { status: 200, headers }
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
          message: "Access revoked for all users",
        },
        { status: 200, headers }
      );
    }
  } catch (error) {
    console.error("Revoke flashcard access error:", error);

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
