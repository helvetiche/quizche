import React from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "motion/react";
import {
  Clock,
  MessageCircle,
  Trash2,
  AlertCircle,
  Check,
  X,
} from "lucide-react";
import type { Comment } from "./types";
import { timeAgo } from "./utils";

type CommentItemProps = {
  comment: Comment;
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
  depth?: number;
};

export default function CommentItem({
  comment,
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
  depth = 0,
}: CommentItemProps): React.ReactElement {
  return (
    <>
      <motion.div
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className="flex gap-3"
      >
        <div className="flex-shrink-0">
          {comment.userPhotoUrl != null && comment.userPhotoUrl !== "" ? (
            <Image
              src={comment.userPhotoUrl}
              alt={comment.userName}
              width={32}
              height={32}
              className="rounded-full border border-gray-900 object-cover"
              quality={75}
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gray-200 border border-gray-900 flex items-center justify-center text-xs font-bold text-gray-500">
              {comment.userName.charAt(0)}
            </div>
          )}
        </div>
        <div className="flex-1">
          <div className="bg-amber-100 border border-gray-900 rounded-2xl rounded-tl-none p-3 relative group">
            <div className="flex justify-between items-start mb-1">
              <span className="text-sm font-bold text-gray-900">
                {comment.userName}
              </span>
              <span className="text-xs text-gray-900 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {timeAgo(comment.createdAt)}
              </span>
            </div>
            <p className="text-sm text-gray-700 whitespace-pre-wrap mb-2">
              {comment.content}
            </p>

            <div className="flex items-center gap-4">
              <button
                onClick={() =>
                  setReplyingTo(replyingTo === comment.id ? null : comment.id)
                }
                className="flex items-center gap-1 text-xs font-medium text-gray-900 hover:text-gray-700"
              >
                <MessageCircle className="w-3 h-3" />
                Reply
              </button>

              {(currentUserId === comment.userId ||
                currentUserId === flashcardSharedByUserId) && (
                <div className="relative">
                  <button
                    onClick={() => setDeleteConfirmation(comment.id)}
                    className="flex items-center gap-1 text-xs font-medium text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="w-3 h-3" />
                    Delete
                  </button>

                  <AnimatePresence>
                    {deleteConfirmation === comment.id && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 10 }}
                        className="absolute top-full left-0 mt-2 bg-amber-50 border-2 border-gray-900 shadow-xl rounded-xl p-3 z-50 w-48 flex flex-col gap-2"
                      >
                        <div className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                          Are you sure?
                        </div>
                        <div className="flex gap-2 mt-1">
                          <button
                            onClick={() => {
                              void handleDeleteComment(comment.id);
                              setDeleteConfirmation(null);
                            }}
                            className="flex-1 bg-red-500 text-white text-xs py-1.5 rounded-lg hover:bg-red-600 flex items-center justify-center gap-1 transition-colors"
                          >
                            <Check className="w-3 h-3" /> Yes
                          </button>
                          <button
                            onClick={() => setDeleteConfirmation(null)}
                            className="flex-1 bg-gray-100 text-gray-700 text-xs py-1.5 rounded-lg hover:bg-gray-200 flex items-center justify-center gap-1 transition-colors"
                          >
                            <X className="w-3 h-3" /> No
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              <button
                onClick={() => void handleLikeComment(comment.id)}
                className={`ml-auto flex items-center gap-1 text-xs font-medium transition-colors ${
                  currentUserId != null && comment.likes.includes(currentUserId)
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
            </div>
          </div>

          {replyingTo === comment.id && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3 flex gap-2"
            >
              <input
                type="text"
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="Write a reply..."
                className="flex-1 px-3 py-2 text-sm bg-amber-50 border border-gray-300 rounded-lg focus:outline-none focus:border-amber-500"
                autoFocus
              />
              <button
                onClick={() => void handlePostComment(comment.id)}
                disabled={submitting || !replyContent.trim()}
                className="px-3 py-1 bg-gray-900 text-white text-xs font-bold rounded-lg disabled:opacity-50"
              >
                Reply
              </button>
            </motion.div>
          )}

          {comment.replies.length > 0 && (
            <div
              className={`flex flex-col gap-4 ${
                depth >= 0 ? "ml-8 mt-4 border-l-2 border-gray-900 pl-4" : ""
              }`}
            >
              <AnimatePresence mode="popLayout">
                {comment.replies.map((reply) => (
                  <CommentItem
                    key={reply.id}
                    comment={reply}
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
                    depth={depth + 1}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </motion.div>
    </>
  );
}
