import type { ReactElement } from "react";
import React from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "motion/react";
import { Copy, Play } from "lucide-react";
import type { FlashcardSet } from "./types";

type FlashcardDetailsProps = {
  flashcard: FlashcardSet | null;
  loading: boolean;
  showCloneConfirm: boolean;
  setShowCloneConfirm: (show: boolean) => void;
  showPlayMenu: boolean;
  setShowPlayMenu: (show: boolean) => void;
  averageRating: number;
  userRating: number;
  handleRate: (rating: number) => Promise<void>;
  hoverRating: number;
  setHoverRating: (rating: number) => void;
};

export default function FlashcardDetails({
  flashcard,
  loading,
  showCloneConfirm,
  setShowCloneConfirm,
  showPlayMenu,
  setShowPlayMenu,
  averageRating,
  userRating,
  handleRate,
  hoverRating,
  setHoverRating,
}: FlashcardDetailsProps): ReactElement | null {
  if (loading) {
    return (
      <div className="w-full md:w-5/12 border-b md:border-b-0 md:border-r border-gray-900 flex flex-col h-full bg-amber-50 overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6 animate-pulse space-y-6">
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
      </div>
    );
  }

  if (!flashcard) return null;

  return (
    <div className="w-full md:w-5/12 border-b md:border-b-0 md:border-r border-gray-900 flex flex-col h-full bg-amber-50 overflow-hidden">
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* 1. Image / Placeholder */}
        <div className="w-full aspect-video rounded-2xl border-3 border-gray-900 overflow-hidden relative group bg-amber-50 shadow-[4px_4px_0px_0px_rgba(17,24,39,1)]">
          {flashcard.coverImageUrl != null && flashcard.coverImageUrl !== "" ? (
            <Image
              src={flashcard.coverImageUrl}
              alt={flashcard.title}
              fill
              className="object-cover"
              quality={75}
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center overflow-hidden relative bg-amber-50/50">
              <span className="material-icons-outlined text-6xl text-gray-300">
                style
              </span>
            </div>
          )}
        </div>

        {/* 2. Title & Info */}
        <div>
          <h2 className="text-3xl font-black text-gray-900 leading-tight mb-2">
            {flashcard.title}
          </h2>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {flashcard.sharedByPhotoUrl != null &&
              flashcard.sharedByPhotoUrl !== "" ? (
                <Image
                  src={flashcard.sharedByPhotoUrl}
                  alt={flashcard.sharedBy ?? "User"}
                  width={40}
                  height={40}
                  className="rounded-full border border-gray-900"
                  quality={75}
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
                {flashcard.sharedBySchool != null &&
                  flashcard.sharedBySchool !== "" && (
                    <span className="text-xs font-medium text-gray-500 mt-1">
                      {flashcard.sharedBySchool}
                    </span>
                  )}
              </div>
            </div>

            {/* Concise Ratings */}
            <div className="flex flex-col items-end">
              <div className="flex" onMouseLeave={() => setHoverRating(0)}>
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

        {/* 4. Description */}
        {flashcard.description != null && flashcard.description !== "" && (
          <div className="space-y-4">
            <div className="prose prose-sm max-w-none">
              <p className="text-gray-700 font-mono leading-relaxed">
                {flashcard.description}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Sticky Bottom Buttons */}
      <div className="p-6 bg-amber-50 z-10 shrink-0">
        <div className="flex gap-2 relative">
          {/* Clone Button Wrapper */}
          <div className="flex-1 relative">
            <button
              onClick={() => setShowCloneConfirm(!showCloneConfirm)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-amber-100 border border-gray-900 rounded-xl text-sm font-bold text-gray-900 hover:bg-amber-200 transition-colors shadow-[2px_2px_0px_0px_rgba(17,24,39,1)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px]"
            >
              <Copy className="w-4 h-4" />
              Clone
            </button>
            <AnimatePresence>
              {showCloneConfirm && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 10 }}
                  className="absolute bottom-full left-0 mb-2 w-full bg-amber-50 border-2 border-gray-900 shadow-xl rounded-xl p-3 z-50 flex flex-col gap-2"
                >
                  <div className="text-xs font-semibold text-gray-700 flex items-center justify-center gap-1.5 text-center">
                    Add to your library?
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowCloneConfirm(false)}
                      className="flex-1 bg-gray-900 text-white text-xs py-1.5 rounded-lg hover:bg-gray-800 transition-colors"
                    >
                      Yes
                    </button>
                    <button
                      onClick={() => setShowCloneConfirm(false)}
                      className="flex-1 bg-gray-200 text-gray-700 text-xs py-1.5 rounded-lg hover:bg-gray-300 transition-colors"
                    >
                      No
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Play Button Wrapper */}
          <div className="flex-1 relative">
            <button
              onClick={() => setShowPlayMenu(!showPlayMenu)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-900 border border-gray-900 rounded-xl text-sm font-bold text-white hover:bg-gray-800 transition-colors shadow-[2px_2px_0px_0px_rgba(17,24,39,1)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px]"
            >
              <Play className="w-4 h-4" />
              Play
            </button>
            <AnimatePresence>
              {showPlayMenu && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 10 }}
                  className="absolute bottom-full right-0 mb-2 w-48 bg-amber-50 border-2 border-gray-900 shadow-xl rounded-xl p-2 z-50 flex flex-col gap-1"
                >
                  <button
                    onClick={() => setShowPlayMenu(false)}
                    className="w-full text-left px-3 py-2 hover:bg-amber-100 rounded-lg text-sm font-bold text-gray-900 transition-colors flex items-center gap-2"
                  >
                    <span className="material-icons-outlined text-base">
                      style
                    </span>
                    Flashcards
                  </button>
                  <button
                    onClick={() => setShowPlayMenu(false)}
                    className="w-full text-left px-3 py-2 hover:bg-amber-100 rounded-lg text-sm font-bold text-gray-900 transition-colors flex items-center gap-2"
                  >
                    <span className="material-icons-outlined text-base">
                      quiz
                    </span>
                    Quiz Mode
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
