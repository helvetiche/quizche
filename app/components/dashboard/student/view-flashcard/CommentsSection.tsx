import React from "react";
import { AnimatePresence } from "motion/react";
import type { Comment } from "./types";
import CommentItem from "./CommentItem";
import CommentInput from "./CommentInput";

type CommentsSectionProps = {
  comments: Comment[];
  currentUserId?: string;
  flashcardSharedByUserId?: string;
  replyingTo: string | null;
  setReplyingTo: (id: string | null) => void;
  replyContent: string;
  setReplyContent: (content: string) => void;
  handlePostComment: (parentId?: string) => Promise<void>;
  handleDeleteComment: (commentId: string) => Promise<void>;
  handleLikeComment: (commentId: string) => Promise<void>;
  submitting: boolean;
  deleteConfirmation: string | null;
  setDeleteConfirmation: (id: string | null) => void;
  newComment: string;
  setNewComment: (comment: string) => void;
  showTemplates: boolean;
  setShowTemplates: (show: boolean) => void;
  commentTemplates: string[];
};

export default function CommentsSection({
  comments,
  currentUserId,
  flashcardSharedByUserId,
  replyingTo,
  setReplyingTo,
  replyContent,
  setReplyContent,
  handlePostComment,
  handleDeleteComment,
  handleLikeComment,
  submitting,
  deleteConfirmation,
  setDeleteConfirmation,
  newComment,
  setNewComment,
  showTemplates,
  setShowTemplates,
  commentTemplates,
}: CommentsSectionProps): React.ReactElement {
  return (
    <div className="w-full md:w-7/12 flex flex-col h-full overflow-hidden bg-amber-50/50">
      {/* Comments List */}
      <div className="flex-1 overflow-y-auto p-6">
        <h3 className="font-bold text-gray-900 text-lg mb-4 flex items-center gap-2 sticky top-0 bg-amber-50/95 backdrop-blur-sm py-2 z-10">
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
          <div className="flex flex-col gap-4">
            <AnimatePresence mode="popLayout">
              {comments.map((comment) => (
                <CommentItem
                  key={comment.id}
                  comment={comment}
                  currentUserId={currentUserId}
                  flashcardSharedByUserId={flashcardSharedByUserId}
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
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Comment Input */}
      <CommentInput
        newComment={newComment}
        setNewComment={setNewComment}
        handlePostComment={handlePostComment}
        submitting={submitting}
        showTemplates={showTemplates}
        setShowTemplates={setShowTemplates}
        commentTemplates={commentTemplates}
      />
    </div>
  );
}
