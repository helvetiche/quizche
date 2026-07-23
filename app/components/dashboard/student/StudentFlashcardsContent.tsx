/* eslint-disable @typescript-eslint/strict-boolean-expressions, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unnecessary-condition, @typescript-eslint/explicit-function-return-type, @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import NextImage from "next/image";
import { getAuth } from "firebase/auth";
import app from "@/lib/firebase";
import TiltedCard from "@/components/TiltedCard";
import Masonry, { type MasonryItem } from "@/components/Masonry";
import ShareFlashcardModal from "../../flashcards/ShareFlashcardModal";
import ViewFlashcardModal from "./ViewFlashcardModal";

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
  sharedByUserId?: string;
  tags?: string[];
};

type StudentFlashcardsContentProps = {
  user: any;
};

export default function StudentFlashcardsContent({
  user,
}: StudentFlashcardsContentProps) {
  const [flashcards, setFlashcards] = useState<FlashcardSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [shareModalFlashcardId, setShareModalFlashcardId] = useState<
    string | null
  >(null);
  const [viewModalFlashcard, setViewModalFlashcard] =
    useState<FlashcardSet | null>(null);

  const fetchFlashcards = useCallback(async (): Promise<void> => {
    if (!user) return;

    try {
      const auth = getAuth(app);
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      const idToken = await currentUser.getIdToken();

      const response = await fetch("/api/flashcards", {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });

      if (response.ok !== undefined && response.ok !== null) {
        const data = await response.json();
        setFlashcards(data.flashcards ?? ([] as never[]));
      }
    } catch (error) {
      console.error("Error fetching flashcards:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void fetchFlashcards();
  }, [fetchFlashcards]);

  return (
    <div className="flex flex-col items-center min-h-[60vh] relative">
      {/* Title Section */}
      <div className="w-full max-w-4xl px-4 flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-5xl font-black text-gray-900 tracking-tight mb-2">
            My Flashcards
          </h1>
          <div className="flex gap-1.5 mb-2">
            <div className="w-4 h-4 bg-red-500 rounded-full border-2 border-gray-900"></div>
            <div className="w-4 h-4 bg-yellow-400 rounded-full border-2 border-gray-900"></div>
            <div className="w-4 h-4 bg-green-500 rounded-full border-2 border-gray-900"></div>
          </div>
          <p className="text-lg font-medium text-gray-700">
            Create, manage, and study your personal flashcard decks.
          </p>
        </div>

        <Link
          href="/student/flashcards/create"
          className="px-6 py-3 bg-amber-100 text-gray-900 font-black border-3 border-gray-900 rounded-full shadow-[4px_4px_0px_0px_rgba(31,41,55,1)] hover:shadow-[5px_5px_0px_0px_rgba(31,41,55,1)] hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2 shrink-0 self-start md:self-auto"
        >
          <span className="material-icons-outlined text-xl">add_circle</span>
          Create New Set
        </Link>
      </div>

      {/* Main Flashcard Grid */}
      <div className="w-full max-w-6xl px-4 relative">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-amber-50 border-3 border-gray-900 rounded-2xl shadow-[4px_4px_0px_0px_rgba(17,24,39,1)] overflow-hidden animate-pulse h-[360px] flex flex-col"
              >
                <div className="h-32 w-full border-b-3 border-gray-900 bg-amber-100 flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full border-2 border-gray-900 bg-amber-200"></div>
                </div>
                <div className="p-4 flex flex-col flex-1 space-y-3">
                  <div className="h-6 bg-gray-200 rounded-full w-3/4 border border-gray-900"></div>
                  <div className="h-4 bg-gray-200 rounded-full w-full border border-gray-900"></div>
                  <div className="h-4 bg-gray-200 rounded-full w-1/2 border border-gray-900"></div>
                  <div className="h-10 bg-gray-200 rounded-full border-2 border-gray-900 w-full mt-auto"></div>
                </div>
              </div>
            ))}
          </div>
        ) : flashcards.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-amber-100 border-3 border-gray-900 rounded-3xl shadow-[8px_8px_0px_0px_rgba(31,41,55,1)] max-w-2xl mx-auto">
            <div className="w-24 h-24 bg-white rounded-full border-3 border-gray-900 flex items-center justify-center mb-6 shadow-[4px_4px_0px_0px_rgba(31,41,55,1)]">
              <span className="material-icons-outlined text-5xl text-gray-400">
                style
              </span>
            </div>
            <h3 className="text-2xl font-black text-gray-900 mb-2">
              No Flashcards Created Yet
            </h3>
            <p className="text-gray-700 font-medium max-w-md mb-6">
              Create your very first set of flashcards to start studying and
              memorizing concepts efficiently.
            </p>
            <Link
              href="/student/flashcards/create"
              className="px-6 py-3 bg-amber-200 text-gray-900 font-bold border-3 border-gray-900 rounded-full shadow-[4px_4px_0px_0px_rgba(31,41,55,1)] hover:shadow-[5px_5px_0px_0px_rgba(31,41,55,1)] hover:-translate-y-0.5 transition-all flex items-center gap-2"
            >
              <span className="material-icons-outlined">add_circle</span>
              Create Flashcard Set
            </Link>
          </div>
        ) : (
          <Masonry
            items={flashcards.map((flashcard): MasonryItem => {
              return {
                id: flashcard.id,
                height: 380,
                content: (
                  <div className="cursor-pointer h-full group">
                    <TiltedCard
                      altText={flashcard.title}
                      captionText={`${flashcard.totalCards} cards`}
                      containerHeight="100%"
                      containerWidth="100%"
                      imageHeight="100%"
                      imageWidth="100%"
                      scaleOnHover={1.05}
                      rotateAmplitude={12}
                      showMobileWarning={false}
                      showTooltip={true}
                      displayOverlayContent={true}
                      overlayContent={
                        <div className="bg-amber-50 border-3 border-gray-900 rounded-2xl relative w-full h-full overflow-hidden flex flex-col shadow-[4px_4px_0px_0px_rgba(17,24,39,1)]">
                          {/* Traffic Lights */}
                          <div className="absolute top-3 left-3 flex gap-1.5 z-30">
                            <div className="w-4 h-4 bg-red-500 rounded-full border-2 border-gray-900"></div>
                            <div className="w-4 h-4 bg-yellow-400 rounded-full border-2 border-gray-900"></div>
                            <div className="w-4 h-4 bg-green-500 rounded-full border-2 border-gray-900"></div>
                          </div>

                          {/* Top Badges */}
                          <div className="absolute top-3 right-3 z-30 flex items-center gap-1.5">
                            {flashcard.isShared && (
                              <span className="px-2 py-0.5 bg-blue-100 text-blue-900 font-extrabold text-[10px] border-2 border-gray-900 rounded-full shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                                Shared
                              </span>
                            )}
                            <div className="flex items-center gap-1 px-2.5 py-0.5 bg-amber-50 border-2 border-gray-900 rounded-full shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                              <span className="material-icons-outlined text-gray-900 text-xs">
                                style
                              </span>
                              <span className="font-bold text-gray-900 text-xs">
                                {flashcard.totalCards}
                              </span>
                            </div>
                          </div>

                          {/* Cover Area */}
                          <div className="h-32 w-full border-b-3 border-gray-900 relative bg-amber-50 group-hover:bg-amber-100 transition-colors">
                            {flashcard.coverImageUrl ? (
                              <NextImage
                                src={flashcard.coverImageUrl}
                                alt={flashcard.title}
                                fill
                                className="object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center overflow-hidden relative">
                                <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#111827_1px,transparent_1px)] [background-size:12px_12px]"></div>
                                <div className="relative w-24 h-32 transform translate-y-2 group-hover:scale-105 transition-transform duration-500 ease-out">
                                  <div className="absolute top-0 left-0 w-full h-full bg-amber-50 border-2 border-gray-900 rounded-xl transform -rotate-[24deg] -translate-x-6 translate-y-3 shadow-sm z-0"></div>
                                  <div className="absolute top-0 left-0 w-full h-full bg-amber-50 border-2 border-gray-900 rounded-xl transform -rotate-[12deg] -translate-x-3 translate-y-1 shadow-sm z-10"></div>
                                  <div className="absolute top-0 left-0 w-full h-full bg-amber-50 border-2 border-gray-900 rounded-xl transform rotate-[24deg] translate-x-6 translate-y-3 shadow-sm z-0"></div>
                                  <div className="absolute top-0 left-0 w-full h-full bg-amber-50 border-2 border-gray-900 rounded-xl transform rotate-[12deg] translate-x-3 translate-y-1 shadow-sm z-10"></div>
                                  <div className="absolute top-0 left-0 w-full h-full bg-amber-50 border-2 border-gray-900 rounded-xl transform rotate-0 z-20 flex flex-col items-center justify-center shadow-md overflow-hidden relative">
                                    <div className="w-10 h-10 rounded-full border-2 border-gray-900 bg-amber-100 flex items-center justify-center mb-2">
                                      <span className="material-icons-outlined text-gray-900 text-xl">
                                        school
                                      </span>
                                    </div>
                                    <div className="w-12 h-1.5 bg-amber-200 rounded-full mb-1"></div>
                                    <div className="w-8 h-1.5 bg-amber-200 rounded-full"></div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Content */}
                          <div className="p-4 flex flex-col flex-1 min-h-0">
                            <h3 className="text-lg font-black text-gray-900 leading-tight mb-2 line-clamp-1">
                              {flashcard.title}
                            </h3>
                            {flashcard.description && (
                              <p className="text-xs font-mono text-gray-600 line-clamp-2 mb-3">
                                {flashcard.description}
                              </p>
                            )}

                            {flashcard.tags && flashcard.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mb-3">
                                {flashcard.tags.map((tag, i) => (
                                  <span
                                    key={i}
                                    className="px-2 py-0.5 bg-amber-200 border border-gray-900 rounded-full text-[10px] font-bold text-gray-900"
                                  >
                                    #{tag}
                                  </span>
                                ))}
                              </div>
                            )}

                            {/* Action Row */}
                            <div className="mt-auto pt-3 border-t-2 border-gray-900 flex items-center gap-1.5">
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setViewModalFlashcard(flashcard);
                                }}
                                className="flex-1 py-1.5 px-2 bg-amber-100 text-gray-900 border-2 border-gray-900 rounded-full font-extrabold text-xs shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-amber-200 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-1"
                              >
                                <span className="material-icons-outlined text-sm">
                                  visibility
                                </span>
                                View
                              </button>
                              <Link
                                href={`/student/flashcards/${flashcard.id}/study`}
                                onClick={(e) => e.stopPropagation()}
                                className="flex-1 py-1.5 px-2 bg-gray-900 text-amber-100 border-2 border-gray-900 rounded-full font-extrabold text-xs shadow-[2px_2px_0px_0px_rgba(251,191,36,1)] hover:bg-gray-800 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-1"
                              >
                                <span className="material-icons-outlined text-sm">
                                  play_arrow
                                </span>
                                Study
                              </Link>
                              <Link
                                href={`/student/flashcards/${flashcard.id}/edit`}
                                onClick={(e) => e.stopPropagation()}
                                className="py-1.5 px-3 bg-amber-200 text-gray-900 border-2 border-gray-900 rounded-full font-extrabold text-xs shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-amber-300 hover:-translate-y-0.5 transition-all flex items-center justify-center"
                                title={flashcard.isShared ? "Clone" : "Edit"}
                              >
                                <span className="material-icons-outlined text-sm">
                                  {flashcard.isShared ? "content_copy" : "edit"}
                                </span>
                              </Link>
                              {!flashcard.isShared && (
                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setShareModalFlashcardId(flashcard.id);
                                  }}
                                  className="py-1.5 px-3 bg-amber-50 text-gray-900 border-2 border-gray-900 rounded-full font-extrabold text-xs shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-amber-100 hover:-translate-y-0.5 transition-all flex items-center justify-center"
                                  title="Share"
                                >
                                  <span className="material-icons-outlined text-sm">
                                    share
                                  </span>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      }
                    />
                  </div>
                ),
              };
            })}
          />
        )}
      </div>

      {/* Share Modal */}
      {shareModalFlashcardId && (
        <ShareFlashcardModal
          flashcardId={shareModalFlashcardId}
          isOpen={!!shareModalFlashcardId}
          onClose={() => setShareModalFlashcardId(null)}
          onShareSuccess={() => void fetchFlashcards()}
        />
      )}

      {/* View Modal */}
      <ViewFlashcardModal
        isOpen={!!viewModalFlashcard}
        onClose={() => setViewModalFlashcard(null)}
        flashcard={viewModalFlashcard}
      />
    </div>
  );
}
