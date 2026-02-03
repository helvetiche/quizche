import React from "react";
import { motion, AnimatePresence } from "motion/react";

type CommentInputProps = {
  newComment: string;
  setNewComment: (comment: string) => void;
  handlePostComment: (parentId?: string) => Promise<void>;
  submitting: boolean;
  showTemplates: boolean;
  setShowTemplates: (show: boolean) => void;
  commentTemplates: string[];
};

export default function CommentInput({
  newComment,
  setNewComment,
  handlePostComment,
  submitting,
  showTemplates,
  setShowTemplates,
  commentTemplates,
}: CommentInputProps): React.ReactElement {
  return (
    <div className="p-4 bg-amber-50 border-t-2 border-gray-900 shrink-0">
      <div className="flex flex-col gap-2 relative">
        <AnimatePresence>
          {showTemplates && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute bottom-full left-0 mb-2 w-full bg-amber-50 border-2 border-gray-900 rounded-xl shadow-xl p-2 z-50 grid grid-cols-2 gap-2"
            >
              {commentTemplates.map((template) => (
                <button
                  key={template}
                  onClick={() => {
                    setNewComment(template);
                    setShowTemplates(false);
                  }}
                  className="px-3 py-2 bg-amber-100 hover:bg-amber-200 text-gray-900 text-xs font-bold rounded-lg transition-colors text-left"
                >
                  {template}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex gap-2 items-center">
          <button
            onClick={() => setShowTemplates(!showTemplates)}
            className="w-10 h-10 bg-amber-100 border-2 border-gray-900 rounded-xl flex items-center justify-center text-gray-900 hover:bg-amber-200 transition-colors shadow-[2px_2px_0px_0px_rgba(17,24,39,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
            title="Quick Responses"
          >
            <span className="material-icons text-lg">bolt</span>
          </button>
          <div className="flex-1 relative">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              className="w-full pl-4 pr-12 py-2.5 bg-white border-2 border-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-gray-900 transition-all text-sm font-medium placeholder-gray-400 shadow-[2px_2px_0px_0px_rgba(17,24,39,1)]"
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
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-900 rounded-full disabled:opacity-50 transition-colors hover:bg-gray-100"
            >
              <span className="material-icons text-xl">send</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
