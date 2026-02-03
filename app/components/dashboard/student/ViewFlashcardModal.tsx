"use client";

import type { ReactElement } from "react";
import { useState, useEffect } from "react";
import Image from "next/image";
import Modal from "@/components/Modal";
import { getAuth } from "firebase/auth";
import app from "@/lib/firebase";

// Helper for time ago
const timeAgo = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " years ago";

    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " months ago";

    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " days ago";

    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " hours ago";

    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " minutes ago";

    return "just now";
  } catch {
    return "just now";
  }
};

type FlashcardSet = {
  id: string;
  title: string;
  description?: string;
  totalCards: number;
  isPublic: boolean;
  coverImageUrl?: string;
  createdAt: string;
  updatedAt: string;
  isShared?: boolean;
  sharedBy?: string;
  sharedByPhotoUrl?: string;
  sharedBySchool?: string;
  sharedByUserId?: string;
  tags?: string[];
  comments?: Comment[];
  ratings?: Record<string, number>;
  averageRating?: number;
  totalRatings?: number;
  cards?: Card[];
};

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

type ViewFlashcardModalProps = {
  isOpen: boolean;
  onClose: () => void;
  flashcard: FlashcardSet | null;
};

type Card = {
  front: string;
  back: string;
  frontImageUrl?: string;
  backImageUrl?: string;
};

export default function ViewFlashcardModal({
  isOpen,
  onClose,
  flashcard,
}: ViewFlashcardModalProps): ReactElement | null {
  const [cards, setCards] = useState<Card[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [userRating, setUserRating] = useState<number>(0);
  const [averageRating, setAverageRating] = useState<number>(0);
  const [totalRatings, setTotalRatings] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Interaction states
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && flashcard) {
      void fetchData(flashcard.id);
    } else {
      setCards([]);
      setComments([]);
      setUserRating(0);
      setAverageRating(0);
      setTotalRatings(0);
      setError(null);
    }
  }, [isOpen, flashcard]);

  const fetchData = async (id: string): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const auth = getAuth(app);
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      const idToken = await currentUser.getIdToken();
      const response = await fetch(`/api/flashcards/${id}`, {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch flashcards");
      }

      const data = (await response.json()) as { flashcardSet?: FlashcardSet };
      if (data.flashcardSet) {
        setCards(data.flashcardSet.cards ?? []);
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
      setError("Failed to load content. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleRate = async (rating: number): Promise<void> => {
    if (!flashcard) return;
    try {
      const auth = getAuth(app);
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      setUserRating(rating); // Optimistic update
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

      // Refresh data to get new average
      await fetchData(flashcard.id);
    } catch (err) {
      console.error(err);
      // Revert on error? For now just log
    }
  };

  const handlePostComment = async (parentId?: string): Promise<void> => {
    if (!flashcard) return;
    const content = parentId != null ? replyContent : newComment;
    if (!content.trim()) return;

    setSubmitting(true);
    try {
      const auth = getAuth(app);
      const currentUser = auth.currentUser;
      if (!currentUser) return;

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

      // Update state locally or refetch
      // For simplicity and recursive structure, refetching is safer
      await fetchData(flashcard.id);

      if (parentId != null) {
        setReplyingTo(null);
        setReplyContent("");
      } else {
        setNewComment("");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleLikeComment = async (commentId: string): Promise<void> => {
    if (!flashcard) return;
    try {
      const auth = getAuth(app);
      const currentUser = auth.currentUser;
      if (!currentUser) return;

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

      // Optimistic update or refetch
      await fetchData(flashcard.id);
    } catch (err) {
      console.error(err);
    }
  };

  const renderComments = (
    commentsList: Comment[],
    depth = 0
  ): React.ReactNode => {
    const auth = getAuth(app);
    const currentUserId = auth.currentUser?.uid;

    return (
      <div
        className={`flex flex-col gap-4 ${depth > 0 ? "ml-8 mt-4 border-l-2 border-gray-100 pl-4" : ""}`}
      >
        {commentsList.map((comment) => (
          <div key={comment.id} className="flex gap-3">
            <div className="flex-shrink-0">
              {comment.userPhotoUrl != null && comment.userPhotoUrl !== "" ? (
                <Image
                  src={comment.userPhotoUrl}
                  alt={comment.userName}
                  width={32}
                  height={32}
                  className="rounded-full border border-gray-200 object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-500">
                  {comment.userName.charAt(0)}
                </div>
              )}
            </div>
            <div className="flex-1">
              <div className="bg-gray-50 rounded-2xl rounded-tl-none p-3 relative group">
                <div className="flex justify-between items-start mb-1">
                  <span className="text-sm font-bold text-gray-900">
                    {comment.userName}
                  </span>
                  <span className="text-xs text-gray-400">
                    {timeAgo(comment.createdAt)}
                  </span>
                </div>
                <p className="text-sm text-gray-700 whitespace-pre-wrap mb-2">
                  {comment.content}
                </p>

                <div className="flex items-center gap-4">
                  <button
                    onClick={() => void handleLikeComment(comment.id)}
                    className={`flex items-center gap-1 text-xs font-medium transition-colors ${
                      currentUserId != null &&
                      comment.likes.includes(currentUserId)
                        ? "text-amber-600"
                        : "text-gray-500 hover:text-gray-900"
                    }`}
                  >
                    <span
                      className={`material-icons-outlined text-sm ${
                        currentUserId != null &&
                        comment.likes.includes(currentUserId)
                          ? "text-amber-500"
                          : ""
                      }`}
                    >
                      {currentUserId != null &&
                      comment.likes.includes(currentUserId)
                        ? "star"
                        : "star_border"}
                    </span>
                    {comment.likes.length > 0 && comment.likes.length}
                  </button>

                  <button
                    onClick={() =>
                      setReplyingTo(
                        replyingTo === comment.id ? null : comment.id
                      )
                    }
                    className="text-xs font-medium text-gray-500 hover:text-gray-900"
                  >
                    Reply
                  </button>
                </div>
              </div>

              {replyingTo === comment.id && (
                <div className="mt-3 flex gap-2">
                  <input
                    type="text"
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    placeholder="Write a reply..."
                    className="flex-1 px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-amber-500"
                    autoFocus
                  />
                  <button
                    onClick={() => void handlePostComment(comment.id)}
                    disabled={submitting || !replyContent.trim()}
                    className="px-3 py-1 bg-gray-900 text-white text-xs font-bold rounded-lg disabled:opacity-50"
                  >
                    Reply
                  </button>
                </div>
              )}

              {comment.replies.length > 0 &&
                renderComments(comment.replies, depth + 1)}
            </div>
          </div>
        ))}
      </div>
    );
  };

  if (!flashcard) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="w-full max-w-7xl h-[90vh]"
    >
      <div className="bg-white border-3 border-gray-900 rounded-3xl shadow-[8px_8px_0px_0px_rgba(17,24,39,1)] flex flex-col h-full overflow-hidden">
        {/* Header - Fixed */}
        <div className="bg-amber-100 p-4 border-b-3 border-gray-900 shrink-0 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-white border-2 border-gray-900 rounded-full flex items-center justify-center">
              <span className="material-icons-outlined text-gray-900">
                visibility
              </span>
            </div>
            <div>
              <h2 className="text-xl font-black text-gray-900 line-clamp-1">
                {flashcard.title}
              </h2>
              <p className="text-xs font-medium text-gray-600">
                by {flashcard.sharedBy ?? "Unknown"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 bg-white border-2 border-gray-900 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors shrink-0"
          >
            <span className="material-icons-outlined text-gray-900">close</span>
          </button>
        </div>

        {/* Content Area - Flex Row */}
        <div className="flex flex-col md:flex-row h-full overflow-hidden bg-gray-50">
          {/* Left Column: Cards List */}
          <div className="w-full md:w-5/12 border-b md:border-b-0 md:border-r border-gray-200 overflow-y-auto p-6 bg-white">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-bold text-gray-900 text-lg">
                Flashcards ({cards.length})
              </h3>
            </div>

            {error != null && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                {error}
              </div>
            )}

            {loading && cards.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="w-8 h-8 border-4 border-gray-200 border-t-gray-900 rounded-full animate-spin mb-4"></div>
                <p className="text-gray-500 text-sm">Loading cards...</p>
              </div>
            ) : cards.length === 0 ? (
              <p className="text-gray-500 text-sm">No cards available.</p>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {cards.map((card, index) => (
                  <div
                    key={index}
                    className="bg-white border-2 border-gray-100 hover:border-gray-900 rounded-xl p-4 flex gap-4 transition-colors"
                  >
                    <div className="w-6 h-6 bg-amber-100 rounded-full border border-gray-900 flex items-center justify-center shrink-0 font-bold text-gray-900 text-xs">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      {card.frontImageUrl != null &&
                        card.frontImageUrl !== "" && (
                          <div className="mb-2 rounded-lg overflow-hidden border border-gray-200 h-24 w-full bg-gray-50 relative">
                            <Image
                              src={card.frontImageUrl}
                              alt="Card"
                              fill
                              className="object-contain"
                            />
                          </div>
                        )}
                      <p className="text-sm font-medium text-gray-900 whitespace-pre-wrap break-words">
                        {card.front}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Ratings & Comments */}
          <div className="w-full md:w-7/12 flex flex-col h-full overflow-hidden bg-gray-50/50">
            {/* Ratings Header */}
            <div className="bg-white p-6 border-b border-gray-200 shrink-0">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-3xl font-black text-gray-900">
                      {averageRating.toFixed(1)}
                    </span>
                    <div className="flex text-amber-400">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <span key={star} className="material-icons text-xl">
                          {star <= Math.round(averageRating)
                            ? "star"
                            : "star_border"}
                        </span>
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 font-medium">
                    {totalRatings} ratings
                  </p>
                </div>

                <div className="flex flex-col items-end">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                    Rate this set
                  </span>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => void handleRate(star)}
                        className="focus:outline-none transition-transform hover:scale-110"
                      >
                        <span
                          className={`material-icons text-2xl ${
                            star <= userRating
                              ? "text-amber-400"
                              : "text-gray-200 hover:text-amber-200"
                          }`}
                        >
                          star
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {flashcard.tags && flashcard.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {flashcard.tags.map((tag, i) => (
                    <span
                      key={i}
                      className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-bold rounded-lg border border-gray-200"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Comments List */}
            <div className="flex-1 overflow-y-auto p-6">
              <h3 className="font-bold text-gray-900 text-lg mb-4 flex items-center gap-2">
                Comments
                <span className="px-2 py-0.5 bg-gray-200 text-gray-600 text-xs rounded-full">
                  {comments.length}
                </span>
              </h3>

              {comments.length === 0 ? (
                <div className="text-center py-10">
                  <span className="material-icons-outlined text-4xl text-gray-300 mb-2">
                    chat_bubble_outline
                  </span>
                  <p className="text-gray-500 text-sm">
                    No comments yet. Be the first to share your thoughts!
                  </p>
                </div>
              ) : (
                renderComments(comments)
              )}
            </div>

            {/* Comment Input */}
            <div className="p-4 bg-white border-t border-gray-200 shrink-0">
              <div className="flex gap-3">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Add a comment..."
                    className="w-full pl-4 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-gray-900 focus:bg-white transition-all text-sm"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        void handlePostComment();
                      }
                    }}
                  />
                  <button
                    onClick={() => void handlePostComment()}
                    disabled={submitting || !newComment.trim()}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-gray-900 text-white rounded-lg disabled:opacity-50 disabled:bg-gray-300 transition-colors"
                  >
                    <span className="material-icons text-sm">send</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
