import { type NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import { adminDb } from "@/lib/firebase-admin";
import {
  AddCommentSchema,
  validateInput,
  sanitizeString,
} from "@/lib/validation";
import {
  getSecurityHeaders,
  getErrorSecurityHeaders,
} from "@/lib/security-headers";
import { v4 as uuidv4 } from "uuid";
import cache, { getApiCacheKey } from "@/lib/cache";

// Type definition for Comment (matching the schema conceptually)
type Comment = {
  id: string;
  userId: string;
  userName: string;
  userPhotoUrl?: string | null;
  content: string;
  createdAt: string;
  likes: string[];
  replies: Comment[];
};

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
    const validation = validateInput(AddCommentSchema, body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Invalid comment data",
          details: validation.error.issues,
        },
        { status: 400, headers: getErrorSecurityHeaders() }
      );
    }

    const { content, parentId } = validation.data;
    const sanitizedContent = sanitizeString(content);

    // Fetch user profile for name and photo
    const userProfileDoc = await adminDb
      .collection("users")
      .doc(user.uid)
      .get();
    const userData = userProfileDoc.data() as
      | { firstName?: string; lastName?: string; profilePhotoUrl?: string }
      | undefined;
    const userName = userData
      ? `${userData.firstName ?? ""} ${userData.lastName ?? ""}`.trim() ||
        "Unknown User"
      : "Unknown User";
    const userPhotoUrl = userData?.profilePhotoUrl ?? user.picture ?? null;

    const newComment: Comment = {
      id: uuidv4(),
      userId: user.uid,
      userName,
      userPhotoUrl,
      content: sanitizedContent,
      createdAt: new Date().toISOString(),
      likes: [],
      replies: [],
    };

    const flashcardRef = adminDb.collection("flashcards").doc(id);

    await adminDb.runTransaction(async (transaction) => {
      const doc = await transaction.get(flashcardRef);
      if (!doc.exists) {
        throw new Error("Flashcard set not found");
      }

      const data = doc.data() as { comments?: Comment[] } | undefined;
      const comments: Comment[] = data?.comments ?? [];

      if (parentId != null && parentId !== "") {
        // Find parent and add reply
        const addReply = (commentsList: Comment[]): boolean => {
          for (const comment of commentsList) {
            if (comment.id === parentId) {
              comment.replies.push(newComment);
              return true;
            }
            if (comment.replies.length > 0) {
              if (addReply(comment.replies)) return true;
            }
          }
          return false;
        };

        const added = addReply(comments);
        if (!added) {
          throw new Error("Parent comment not found");
        }
      } else {
        // Add to top level
        comments.push(newComment);
      }

      transaction.update(flashcardRef, { comments });
    });

    // Invalidate cache for this flashcard
    const cacheKey = getApiCacheKey(`/api/flashcards/${id}`, user.uid);
    await cache.delete(cacheKey);

    return NextResponse.json(
      { message: "Comment added successfully", comment: newComment },
      { status: 201, headers: getSecurityHeaders() }
    );
  } catch (error) {
    console.error("Error adding comment:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to add comment";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500, headers: getErrorSecurityHeaders() }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const user = await verifyAuth(request);

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401, headers: getErrorSecurityHeaders() }
      );
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const commentId = searchParams.get("commentId");

    if (commentId == null || commentId === "") {
      return NextResponse.json(
        { error: "Comment ID is required" },
        { status: 400, headers: getErrorSecurityHeaders() }
      );
    }

    const flashcardRef = adminDb.collection("flashcards").doc(id);

    await adminDb.runTransaction(async (transaction) => {
      const doc = await transaction.get(flashcardRef);
      if (!doc.exists) {
        throw new Error("Flashcard set not found");
      }

      const flashcardData = doc.data();
      const flashcardOwnerId = flashcardData?.userId as string | undefined;
      const comments: Comment[] =
        (flashcardData?.comments as Comment[] | undefined) ?? [];

      // Helper to find and remove comment
      const deleteComment = (list: Comment[]): boolean => {
        const index = list.findIndex((c) => c.id === commentId);
        if (index !== -1) {
          const comment = list[index];
          // Check permissions
          if (comment.userId !== user.uid && flashcardOwnerId !== user.uid) {
            throw new Error(
              "Forbidden: You are not authorized to delete this comment"
            );
          }
          list.splice(index, 1);
          return true;
        }

        for (const comment of list) {
          if (comment.replies.length > 0) {
            if (deleteComment(comment.replies)) return true;
          }
        }
        return false;
      };

      const deleted = deleteComment(comments);

      if (!deleted) {
        // If not found, maybe it was already deleted, but let's throw to be safe or just return
        // Ideally if we can't find it we might want to say 404, but inside transaction it's tricky.
        // We'll throw so we catch it below.
        // However, if the error is "Forbidden", it is thrown above.
        // If simply not found, we can throw "Comment not found".
        throw new Error("Comment not found");
      }

      transaction.update(flashcardRef, { comments });
    });

    // Invalidate cache for this flashcard
    const cacheKey = getApiCacheKey(`/api/flashcards/${id}`, user.uid);
    await cache.delete(cacheKey);

    return NextResponse.json(
      { message: "Comment deleted successfully" },
      { status: 200, headers: getSecurityHeaders() }
    );
  } catch (error) {
    console.error("Error deleting comment:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to delete comment";

    if (errorMessage.startsWith("Forbidden")) {
      return NextResponse.json(
        { error: errorMessage },
        { status: 403, headers: getErrorSecurityHeaders() }
      );
    }
    if (errorMessage === "Comment not found") {
      return NextResponse.json(
        { error: errorMessage },
        { status: 404, headers: getErrorSecurityHeaders() }
      );
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: 500, headers: getErrorSecurityHeaders() }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const user = await verifyAuth(request);

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401, headers: getErrorSecurityHeaders() }
      );
    }

    const { id } = await params;
    const body = (await request.json()) as { commentId?: string };
    const { commentId } = body;

    if (commentId == null || commentId === "") {
      return NextResponse.json(
        { error: "Comment ID is required" },
        { status: 400, headers: getErrorSecurityHeaders() }
      );
    }

    const flashcardRef = adminDb.collection("flashcards").doc(id);

    await adminDb.runTransaction(async (transaction) => {
      const doc = await transaction.get(flashcardRef);
      if (!doc.exists) {
        throw new Error("Flashcard set not found");
      }

      const data = doc.data() as { comments?: Comment[] } | undefined;
      const comments: Comment[] = data?.comments ?? [];
      const toggleLike = (commentsList: Comment[]): boolean => {
        for (const comment of commentsList) {
          if (comment.id === commentId) {
            const likeIndex = comment.likes.indexOf(user.uid);
            if (likeIndex === -1) {
              comment.likes.push(user.uid);
            } else {
              comment.likes.splice(likeIndex, 1);
            }
            return true;
          }
          if (comment.replies.length > 0) {
            if (toggleLike(comment.replies)) return true;
          }
        }
        return false;
      };

      const found = toggleLike(comments);

      if (!found) {
        throw new Error("Comment not found");
      }

      transaction.update(flashcardRef, { comments });
    });

    // Invalidate cache for this flashcard
    const cacheKey = getApiCacheKey(`/api/flashcards/${id}`, user.uid);
    await cache.delete(cacheKey);

    return NextResponse.json(
      { message: "Comment updated successfully" },
      { status: 200, headers: getSecurityHeaders() }
    );
  } catch (error) {
    console.error("Error updating comment:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to update comment";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500, headers: getErrorSecurityHeaders() }
    );
  }
}
