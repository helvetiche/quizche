"use client";

import { useState, useEffect } from "react";
import Modal from "@/components/Modal";
import { getAuth } from "firebase/auth";
import app from "@/lib/firebase";

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
}: ViewFlashcardModalProps) {
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && flashcard) {
      fetchCards(flashcard.id);
    } else {
      setCards([]);
      setError(null);
    }
  }, [isOpen, flashcard]);

  const fetchCards = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const auth = getAuth(app);
      const currentUser = auth.currentUser;
      if (!currentUser) {
        // If no user, maybe we can still fetch if it's public? 
        // But API requires token usually. Let's assume auth is required.
        return;
      }

      const idToken = await currentUser.getIdToken();
      const response = await fetch(`/api/flashcards/${id}`, {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch flashcards");
      }

      const data = await response.json();
      if (data.flashcardSet && data.flashcardSet.cards) {
        setCards(data.flashcardSet.cards);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to load cards. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!flashcard) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="w-full max-w-4xl max-h-[90vh]"
    >
      <div className="bg-white border-3 border-gray-900 rounded-3xl shadow-[8px_8px_0px_0px_rgba(17,24,39,1)] flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-amber-100 p-6 border-b-3 border-gray-900 shrink-0">
          <div className="flex justify-between items-start gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                {flashcard.tags && flashcard.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {flashcard.tags.map((tag, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 bg-white border border-gray-900 rounded-full text-[10px] font-bold text-gray-900"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <h2 className="text-2xl font-black text-gray-900 mb-2">
                {flashcard.title}
              </h2>
              {flashcard.description && (
                <p className="text-gray-700 font-medium mb-4">
                  {flashcard.description}
                </p>
              )}
              
              <div className="flex items-center gap-3 mt-4">
                {flashcard.sharedByPhotoUrl ? (
                  <img
                    src={flashcard.sharedByPhotoUrl}
                    alt={flashcard.sharedBy || "User"}
                    className="w-8 h-8 rounded-full border-2 border-gray-900 object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gray-200 border-2 border-gray-900 flex items-center justify-center">
                    <span className="material-icons-outlined text-gray-500 text-sm">
                      person
                    </span>
                  </div>
                )}
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-gray-900">
                    {flashcard.sharedBy || "Unknown User"}
                  </span>
                  {flashcard.sharedBySchool && (
                    <span className="text-[10px] font-medium text-gray-500">
                      {flashcard.sharedBySchool}
                    </span>
                  )}
                </div>
                <div className="w-1 h-1 bg-gray-300 rounded-full mx-1"></div>
                <span className="text-xs font-medium text-gray-500">
                  {flashcard.totalCards} cards
                </span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-10 h-10 bg-white border-2 border-gray-900 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors shrink-0"
            >
              <span className="material-icons-outlined text-gray-900">close</span>
            </button>
          </div>
        </div>

        {/* Content - Scrollable List of Cards */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-12 h-12 border-4 border-gray-200 border-t-gray-900 rounded-full animate-spin mb-4"></div>
              <p className="text-gray-500 font-medium">Loading cards...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <span className="material-icons-outlined text-4xl text-red-400 mb-2">
                error_outline
              </span>
              <p className="text-gray-900 font-bold mb-1">Oops!</p>
              <p className="text-gray-500">{error}</p>
              <button
                onClick={() => fetchCards(flashcard.id)}
                className="mt-4 px-4 py-2 bg-gray-900 text-white rounded-xl font-bold hover:bg-gray-800 transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : cards.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <span className="material-icons-outlined text-4xl text-gray-300 mb-2">
                style
              </span>
              <p className="text-gray-500 font-medium">No cards in this set.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {cards.map((card, index) => (
                <div
                  key={index}
                  className="bg-white border-2 border-gray-200 rounded-xl p-4 flex gap-4 hover:border-gray-900 transition-colors"
                >
                  <div className="w-8 h-8 bg-amber-100 rounded-full border-2 border-gray-900 flex items-center justify-center shrink-0 font-bold text-gray-900 text-sm">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    {card.frontImageUrl && (
                      <div className="mb-3 rounded-lg overflow-hidden border border-gray-200 max-w-xs">
                        <img 
                          src={card.frontImageUrl} 
                          alt="Card image" 
                          className="w-full h-auto object-cover"
                        />
                      </div>
                    )}
                    <p className="text-lg font-medium text-gray-900 whitespace-pre-wrap">
                      {card.front}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
