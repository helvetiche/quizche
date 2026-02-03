/* eslint-disable @typescript-eslint/strict-boolean-expressions, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unnecessary-condition, @typescript-eslint/explicit-function-return-type, @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { getAuth } from "firebase/auth";
import app from "@/lib/firebase";
import ShareFlashcardModal from "../../flashcards/ShareFlashcardModal";

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

  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return "Unknown date";
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-light text-black">My Flashcards</h2>
          <p className="text-lg text-gray-600 mt-2">
            Create and manage your flashcard sets
          </p>
        </div>
        <Link
          href="/student/flashcards/create"
          className="px-6 py-3 bg-black text-white font-light hover:bg-gray-800 transition-colors"
        >
          Create New Set
        </Link>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white border border-gray-200 rounded-lg p-6 animate-pulse"
            >
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      ) : flashcards.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
          <p className="text-gray-600 font-light mb-4">
            No flashcard sets yet. Create your first set to get started
          </p>
          <Link
            href="/student/flashcards/create"
            className="inline-block px-6 py-3 bg-black text-white font-light hover:bg-gray-800 transition-colors"
          >
            Create Flashcard Set
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {flashcards.map((flashcard) => (
            <div
              key={flashcard.id}
              className="bg-white border-2 border-black rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
            >
              {flashcard.coverImageUrl && (
                <div className="relative w-full h-48 bg-gray-200">
                  <Image
                    src={flashcard.coverImageUrl}
                    alt={flashcard.title}
                    fill
                    className="object-cover"
                  />
                </div>
              )}
              <div className="flex flex-col gap-4 p-6">
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="text-xl font-light text-black flex-1">
                      {flashcard.title}
                    </h3>
                    {flashcard.isShared && (
                      <span className="px-2 py-1 text-xs font-light bg-blue-100 text-blue-700 rounded whitespace-nowrap">
                        Shared
                      </span>
                    )}
                  </div>
                  {flashcard.isShared &&
                    flashcard.sharedBy !== undefined &&
                    flashcard.sharedBy !== null && (
                      <p className="text-xs font-light text-gray-500 mb-2">
                        Shared by {flashcard.sharedBy}
                      </p>
                    )}
                  {flashcard.description && (
                    <p className="text-sm font-light text-gray-600 line-clamp-2">
                      {flashcard.description}
                    </p>
                  )}
                  {flashcard.tags && flashcard.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {flashcard.tags.map((tag, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs font-light rounded-full border border-gray-200"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2 text-sm font-light text-gray-600">
                  <div className="flex items-center justify-between">
                    <span>Cards:</span>
                    <span className="text-black">{flashcard.totalCards}</span>
                  </div>
                  {!flashcard.isShared && (
                    <div className="flex items-center justify-between">
                      <span>Status:</span>
                      <span
                        className={`${
                          flashcard.isPublic
                            ? "text-green-600"
                            : "text-gray-600"
                        }`}
                      >
                        {flashcard.isPublic ? "Public" : "Private"}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span>Created:</span>
                    <span className="text-black">
                      {formatDate(flashcard.createdAt)}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    <Link
                      href={`/student/flashcards/${flashcard.id}/study`}
                      className="flex-1 px-4 py-2 text-center font-light bg-black text-white hover:bg-gray-800 transition-colors"
                    >
                      Study
                    </Link>
                    <Link
                      href={`/student/flashcards/${flashcard.id}/edit`}
                      className="flex-1 px-4 py-2 text-center font-light bg-gray-200 text-black hover:bg-gray-300 transition-colors"
                    >
                      {flashcard.isShared ? "Clone & Edit" : "Edit"}
                    </Link>
                  </div>
                  {!flashcard.isShared && (
                    <button
                      onClick={() => setShareModalFlashcardId(flashcard.id)}
                      className="w-full px-4 py-2 text-center font-light bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                    >
                      Share
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Share Modal */}
      {shareModalFlashcardId && (
        <ShareFlashcardModal
          flashcardId={shareModalFlashcardId}
          isOpen={!!shareModalFlashcardId}
          onClose={() => setShareModalFlashcardId(null)}
          onShareSuccess={() => void fetchFlashcards()}
        />
      )}
    </div>
  );
}
