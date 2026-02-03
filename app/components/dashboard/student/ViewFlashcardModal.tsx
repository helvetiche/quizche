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
  const [hoverRating, setHoverRating] = useState<number>(0);

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

  const fetchData = async (id: string, skipLoading = false): Promise<void> => {
    if (!skipLoading) setLoading(true);
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
        cache: "no-store",
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
        // Deep search for nested replies if needed (though current UI only supports 1 level deep display in renderComments recursive call,
        // logic should match)
        // For simple 1-level or recursive:
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
        {/* Header - Traffic Lights */}
        <div className="bg-amber-100 p-4 border-b-3 border-gray-900 shrink-0 flex justify-between items-center">
          <div className="flex gap-1.5">
            <div className="w-4 h-4 bg-red-500 rounded-full border-2 border-gray-900"></div>
            <div className="w-4 h-4 bg-yellow-400 rounded-full border-2 border-gray-900"></div>
            <div className="w-4 h-4 bg-green-500 rounded-full border-2 border-gray-900"></div>
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
          {/* Left Column: Metadata & Details */}
          <div className="w-full md:w-5/12 border-b md:border-b-0 md:border-r border-gray-200 overflow-y-auto p-6 bg-white">
            {loading ? (
              // Detailed Skeleton
              <div className="animate-pulse space-y-6">
                <div className="aspect-video w-full bg-gray-200 rounded-2xl border-2 border-gray-900"></div>
                <div className="space-y-2">
                  <div className="h-8 bg-gray-200 rounded-full w-3/4 border border-gray-900"></div>
                  <div className="h-4 bg-gray-200 rounded-full w-1/3 border border-gray-900"></div>
                </div>
                <div className="flex gap-2">
                  <div className="h-6 w-16 bg-gray-200 rounded-full border border-gray-900"></div>
                  <div className="h-6 w-20 bg-gray-200 rounded-full border border-gray-900"></div>
                  <div className="h-6 w-14 bg-gray-200 rounded-full border border-gray-900"></div>
                </div>
                <div className="h-32 bg-gray-200 rounded-xl border border-gray-900"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-full border border-gray-900"></div>
                  <div className="h-4 bg-gray-200 rounded w-5/6 border border-gray-900"></div>
                  <div className="h-4 bg-gray-200 rounded w-4/6 border border-gray-900"></div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* 1. Image / 5-card Design */}
                <div className="w-full aspect-video rounded-2xl border-3 border-gray-900 overflow-hidden relative group bg-amber-50 shadow-[4px_4px_0px_0px_rgba(17,24,39,1)]">
                  {flashcard.coverImageUrl ? (
                    <Image
                      src={flashcard.coverImageUrl}
                      alt={flashcard.title}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center overflow-hidden relative">
                      {/* Decorative background pattern */}
                      <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#111827_1px,transparent_1px)] [background-size:12px_12px]"></div>

                      {/* Circular Card Stack Design */}
                      <div className="relative w-48 h-64 transform translate-y-2 group-hover:scale-105 transition-transform duration-500 ease-out">
                        {/* Glow effect behind */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-60 h-60 bg-amber-100/20 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>

                        {/* Far Left Card */}
                        <div className="absolute top-0 left-0 w-full h-full bg-amber-50 border-2 border-gray-900 rounded-xl transform -rotate-[24deg] -translate-x-8 translate-y-4 shadow-sm z-0"></div>

                        {/* Left Card */}
                        <div className="absolute top-0 left-0 w-full h-full bg-amber-50 border-2 border-gray-900 rounded-xl transform -rotate-[12deg] -translate-x-4 translate-y-2 shadow-sm z-10 overflow-hidden">
                          <div className="p-4 space-y-3 opacity-30">
                            <div className="h-2 bg-amber-100 rounded w-full"></div>
                            <div className="h-2 bg-amber-100 rounded w-2/3"></div>
                            <div className="h-2 bg-amber-100 rounded w-3/4"></div>
                          </div>
                        </div>

                        {/* Far Right Card */}
                        <div className="absolute top-0 left-0 w-full h-full bg-amber-50 border-2 border-gray-900 rounded-xl transform rotate-[24deg] translate-x-8 translate-y-4 shadow-sm z-0"></div>

                        {/* Right Card */}
                        <div className="absolute top-0 left-0 w-full h-full bg-amber-50 border-2 border-gray-900 rounded-xl transform rotate-[12deg] translate-x-4 translate-y-2 shadow-sm z-10 overflow-hidden">
                          <div className="p-4 space-y-3 opacity-30">
                            <div className="h-2 bg-amber-100 rounded w-3/4"></div>
                            <div className="h-2 bg-amber-100 rounded w-full"></div>
                            <div className="h-2 bg-amber-100 rounded w-1/2"></div>
                          </div>
                        </div>

                        {/* Center Card */}
                        <div className="absolute top-0 left-0 w-full h-full bg-amber-50 border-2 border-gray-900 rounded-xl transform rotate-0 z-20 flex flex-col items-center justify-center shadow-md overflow-hidden relative">
                          {/* Glimmer/Sheen Effect */}
                          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-amber-100/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none z-30"></div>
                          <div className="absolute -inset-[100%] top-0 block h-[200%] w-[200%] -skew-x-12 bg-gradient-to-r from-transparent via-amber-100/30 to-transparent opacity-0 group-hover:animate-[shine_1s_ease-in-out] z-30"></div>

                          <div className="w-12 h-12 rounded-full border-2 border-gray-900 bg-amber-100 flex items-center justify-center mb-3 relative z-10">
                            <span className="material-icons-outlined text-gray-900 text-2xl group-hover:scale-110 transition-transform duration-300">
                              school
                            </span>
                          </div>
                          <div className="w-16 h-2 bg-amber-100 rounded-full mb-1.5"></div>
                          <div className="w-10 h-2 bg-amber-100 rounded-full"></div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. Title */}
                <div>
                  <h2 className="text-3xl font-black text-gray-900 leading-tight mb-2">
                    {flashcard.title}
                  </h2>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {flashcard.sharedByPhotoUrl ? (
                        <Image
                          src={flashcard.sharedByPhotoUrl}
                          alt={flashcard.sharedBy ?? "User"}
                          width={40}
                          height={40}
                          className="rounded-full border border-gray-900"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-200 border border-gray-900 flex items-center justify-center">
                          <span className="material-icons-outlined text-gray-500 text-sm">
                            person
                          </span>
                        </div>
                      )}
                      <div className="flex flex-col">
                        <p className="text-base font-bold text-gray-900 leading-none">
                          {flashcard.sharedBy ?? "Unknown"}
                        </p>
                        {flashcard.sharedBySchool && (
                          <span className="text-xs font-medium text-gray-500 mt-1">
                            {flashcard.sharedBySchool}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Concise Ratings */}
                    <div className="flex flex-col items-end">
                      <div
                        className="flex"
                        onMouseLeave={() => setHoverRating(0)}
                      >
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            onClick={(e) => {
                              e.stopPropagation();
                              void handleRate(star);
                            }}
                            onMouseEnter={() => setHoverRating(star)}
                            className="focus:outline-none transition-transform hover:scale-110 active:scale-95"
                          >
                            <span
                              style={{ WebkitTextStroke: "1px #1f2937" }}
                              className={`material-icons text-xl ${
                                star <=
                                (hoverRating > 0
                                  ? hoverRating
                                  : userRating > 0
                                    ? userRating
                                    : Math.round(averageRating))
                                  ? "text-amber-400"
                                  : "text-gray-300"
                              }`}
                            >
                              star
                            </span>
                          </button>
                        ))}
                      </div>
                      <p className="text-xs font-bold text-amber-600 mt-0.5">
                        {averageRating.toFixed(1)}/5
                      </p>
                    </div>
                  </div>
                </div>

                {/* 3. Tags */}
                {flashcard.tags && flashcard.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {flashcard.tags.map((tag, i) => (
                      <span
                        key={i}
                        className="px-3 py-1 bg-amber-100 border border-gray-900 rounded-full text-xs font-bold text-gray-900"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* 4. Ratings (Removed) */}

                {/* 5. Description */}
                {flashcard.description && (
                  <div className="prose prose-sm max-w-none">
                    <p className="text-gray-700 font-medium leading-relaxed border-l-4 border-amber-400 pl-4 italic">
                      {flashcard.description}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Column: Comments Only */}
          <div className="w-full md:w-7/12 flex flex-col h-full overflow-hidden bg-gray-50/50">
            {/* Comments List */}
            <div className="flex-1 overflow-y-auto p-6">
              <h3 className="font-bold text-gray-900 text-lg mb-4 flex items-center gap-2 sticky top-0 bg-gray-50/95 backdrop-blur-sm py-2 z-10">
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
