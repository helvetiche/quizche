"use client";

import type { ReactElement } from "react";
import { useState, useEffect } from "react";
import Modal from "@/components/Modal";
import { getAuth } from "firebase/auth";
import app from "@/lib/firebase";
import type { FlashcardSet, Comment } from "./view-flashcard/types";
import FlashcardHeader from "./view-flashcard/FlashcardHeader";
import FlashcardDetails from "./view-flashcard/FlashcardDetails";
import CommentsSection from "./view-flashcard/CommentsSection";

type ViewFlashcardModalProps = {
  isOpen: boolean;
  onClose: () => void;
  flashcard: FlashcardSet | null;
};

export default function ViewFlashcardModal({
  isOpen,
  onClose,
  flashcard,
}: ViewFlashcardModalProps): ReactElement | null {
  const [comments, setComments] = useState<Comment[]>([]);
  const [userRating, setUserRating] = useState<number>(0);
  const [averageRating, setAverageRating] = useState<number>(0);
  const [totalRatings, setTotalRatings] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | undefined>(
    undefined
  );

  // Interaction states
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [deleteConfirmation, setDeleteConfirmation] = useState<string | null>(
    null
  );
  const [showCloneConfirm, setShowCloneConfirm] = useState(false);
  const [showPlayMenu, setShowPlayMenu] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const commentTemplates = [
    "Great flashcard!",
    "Very helpful!",
    "Thanks for sharing!",
    "Can you explain more?",
    "👍",
    "🔥",
    "❤️",
  ];

  useEffect(() => {
    const auth = getAuth(app);
    if (auth.currentUser) {
      setCurrentUserId(auth.currentUser.uid);
    }
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setCurrentUserId(user?.uid);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (isOpen && flashcard) {
      void fetchData(flashcard.id);
    } else {
      setComments([]);
      setUserRating(0);
      setAverageRating(0);
      setTotalRatings(0);
    }
  }, [isOpen, flashcard]);

  const fetchData = async (id: string, skipLoading = false): Promise<void> => {
    if (!skipLoading) setLoading(true);
    try {
      const auth = getAuth(app);
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      const idToken = await currentUser.getIdToken();
      const response = await fetch(`/api/flashcards/${id}`, {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch flashcards");
      }

      const data = (await response.json()) as { flashcardSet?: FlashcardSet };
      if (data.flashcardSet) {
        setComments(data.flashcardSet.comments ?? []);
        setAverageRating(data.flashcardSet.averageRating ?? 0);
        setTotalRatings(data.flashcardSet.totalRatings ?? 0);

        const ratings = data.flashcardSet.ratings ?? {};
        if (ratings[currentUser.uid]) {
          setUserRating(ratings[currentUser.uid]);
        } else {
          setUserRating(0);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      if (!skipLoading) setLoading(false);
    }
  };

  const handleRate = async (rating: number): Promise<void> => {
    if (!flashcard) return;

    // Store previous state for rollback
    const previousUserRating = userRating;
    const previousAverage = averageRating;
    const previousTotal = totalRatings;

    // Calculate optimistic values
    let newAverage = averageRating;
    let newTotal = totalRatings;

    if (previousUserRating === 0) {
      // New rating
      newTotal = totalRatings + 1;
      newAverage = (averageRating * totalRatings + rating) / newTotal;
    } else {
      // Update existing rating
      const effectiveTotal = totalRatings > 0 ? totalRatings : 1;
      newAverage =
        (averageRating * effectiveTotal - previousUserRating + rating) /
        effectiveTotal;
    }

    // Apply optimistic updates immediately
    setUserRating(rating);
    setAverageRating(newAverage);
    setTotalRatings(newTotal);

    try {
      const auth = getAuth(app);
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      const idToken = await currentUser.getIdToken();

      const response = await fetch(`/api/flashcards/${flashcard.id}/rate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ rating }),
      });

      if (!response.ok) throw new Error("Failed to rate");

      // Silently refresh data to ensure consistency
      await fetchData(flashcard.id, true);
    } catch (err) {
      console.error(err);
      // Revert optimistic updates on error
      setUserRating(previousUserRating);
      setAverageRating(previousAverage);
      setTotalRatings(previousTotal);
    }
  };

  const handlePostComment = async (parentId?: string): Promise<void> => {
    if (!flashcard) return;
    const content = parentId != null ? replyContent : newComment;
    if (!content.trim()) return;

    // Optimistic Update
    const auth = getAuth(app);
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    // Store previous comments for rollback
    const previousComments = [...comments];

    const tempId = `temp-${Date.now()}`;
    const optimisticComment: Comment = {
      id: tempId,
      userId: currentUser.uid,
      userName: currentUser.displayName ?? "You",
      userPhotoUrl: currentUser.photoURL,
      content,
      createdAt: new Date().toISOString(),
      likes: [],
      replies: [],
    };

    if (parentId != null) {
      // Add as reply
      const updatedComments = comments.map((comment) => {
        if (comment.id === parentId) {
          return {
            ...comment,
            replies: [...comment.replies, optimisticComment],
          };
        }
        // Deep search for nested replies
        const addReplyToNested = (c: Comment): Comment => {
          if (c.id === parentId) {
            return { ...c, replies: [...c.replies, optimisticComment] };
          }
          if (c.replies.length > 0) {
            return { ...c, replies: c.replies.map(addReplyToNested) };
          }
          return c;
        };
        return addReplyToNested(comment);
      });
      setComments(updatedComments);
      setReplyingTo(null);
      setReplyContent("");
    } else {
      // Add as new comment
      setComments([...comments, optimisticComment]);
      setNewComment("");
    }

    setSubmitting(true);
    try {
      const idToken = await currentUser.getIdToken();

      const response = await fetch(`/api/flashcards/${flashcard.id}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ content, parentId }),
      });

      if (!response.ok) throw new Error("Failed to post comment");

      // Silently sync with server to get real ID and confirmed state
      await fetchData(flashcard.id, true);
    } catch (err) {
      console.error(err);
      // Revert optimistic update
      setComments(previousComments);
      if (parentId != null) {
        setReplyingTo(parentId);
        setReplyContent(content);
      } else {
        setNewComment(content);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleLikeComment = async (commentId: string): Promise<void> => {
    if (!flashcard) return;

    const auth = getAuth(app);
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    // Store previous comments for rollback
    const previousComments = [...comments];

    // Optimistic Update
    const toggleLikeInTree = (list: Comment[]): Comment[] => {
      return list.map((comment) => {
        if (comment.id === commentId) {
          const hasLiked = comment.likes.includes(currentUser.uid);
          const newLikes = hasLiked
            ? comment.likes.filter((uid) => uid !== currentUser.uid)
            : [...comment.likes, currentUser.uid];
          return { ...comment, likes: newLikes };
        }
        if (comment.replies.length > 0) {
          return { ...comment, replies: toggleLikeInTree(comment.replies) };
        }
        return comment;
      });
    };

    setComments(toggleLikeInTree(comments));

    try {
      const idToken = await currentUser.getIdToken();

      const response = await fetch(`/api/flashcards/${flashcard.id}/comments`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ commentId, action: "like" }),
      });

      if (!response.ok) throw new Error("Failed to like comment");

      // Silently sync
      await fetchData(flashcard.id, true);
    } catch (err) {
      console.error(err);
      // Revert
      setComments(previousComments);
    }
  };

  const handleDeleteComment = async (commentId: string): Promise<void> => {
    if (!flashcard) return;

    const auth = getAuth(app);
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    // Store previous comments for rollback
    const previousComments = [...comments];

    // Optimistic Update
    const deleteCommentInTree = (list: Comment[]): Comment[] => {
      return list
        .filter((c) => c.id !== commentId)
        .map((comment) => {
          if (comment.replies.length > 0) {
            return {
              ...comment,
              replies: deleteCommentInTree(comment.replies),
            };
          }
          return comment;
        });
    };

    setComments(deleteCommentInTree(comments));

    try {
      const idToken = await currentUser.getIdToken();

      const response = await fetch(
        `/api/flashcards/${flashcard.id}/comments?commentId=${commentId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        }
      );

      if (!response.ok) throw new Error("Failed to delete comment");

      // Silently sync
      await fetchData(flashcard.id, true);
    } catch (err) {
      console.error(err);
      // Revert
      setComments(previousComments);
    }
  };

  if (!flashcard) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="w-full max-w-7xl h-[90vh]"
    >
      <div className="bg-amber-50 border-3 border-gray-900 rounded-3xl shadow-[8px_8px_0px_0px_rgba(17,24,39,1)] flex flex-col h-full overflow-hidden">
        <FlashcardHeader title={flashcard.title} onClose={onClose} />

        <div className="flex flex-col md:flex-row h-full overflow-hidden bg-amber-50">
          <FlashcardDetails
            flashcard={flashcard}
            loading={loading}
            showCloneConfirm={showCloneConfirm}
            setShowCloneConfirm={setShowCloneConfirm}
            showPlayMenu={showPlayMenu}
            setShowPlayMenu={setShowPlayMenu}
            averageRating={averageRating}
            userRating={userRating}
            handleRate={handleRate}
            hoverRating={hoverRating}
            setHoverRating={setHoverRating}
          />

          <CommentsSection
            comments={comments}
            currentUserId={currentUserId}
            flashcardSharedByUserId={flashcard.sharedByUserId}
            replyingTo={replyingTo}
            setReplyingTo={setReplyingTo}
            replyContent={replyContent}
            setReplyContent={setReplyContent}
            handlePostComment={handlePostComment}
            handleDeleteComment={handleDeleteComment}
            handleLikeComment={handleLikeComment}
            submitting={submitting}
            deleteConfirmation={deleteConfirmation}
            setDeleteConfirmation={setDeleteConfirmation}
            newComment={newComment}
            setNewComment={setNewComment}
            showTemplates={showTemplates}
            setShowTemplates={setShowTemplates}
            commentTemplates={commentTemplates}
          />
        </div>
      </div>
    </Modal>
  );
}
