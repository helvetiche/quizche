"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import AuthGuard from "../../../../components/auth/AuthGuard";
import DashboardLayout from "../../../../components/layout/DashboardLayout";
import Loading from "../../../../components/ui/Loading";
import Image from "next/image";

interface Flashcard {
  front: string;
  back: string;
  frontImageUrl?: string;
  backImageUrl?: string;
}

interface FlashcardSet {
  id: string;
  title: string;
  description?: string;
  cards: Flashcard[];
  totalCards: number;
  coverImageUrl?: string;
}

export default function StudyFlashcardPage() {
  const router = useRouter();
  const params = useParams();
  const [user, setUser] = useState<any>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [flashcardSet, setFlashcardSet] = useState<FlashcardSet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [shuffledCards, setShuffledCards] = useState<Flashcard[]>([]);
  const [isShuffled, setIsShuffled] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        try {
          const token = await currentUser.getIdToken();
          setIdToken(token);
        } catch (error) {
          console.error("Error getting token:", error);
        }
      } else {
        setIdToken(null);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchFlashcardSet = async () => {
      if (!idToken || !params.id) return;

      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/flashcards/${params.id}`, {
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to fetch flashcard set");
        }

        setFlashcardSet(data.flashcardSet);
        setShuffledCards([...data.flashcardSet.cards]);
      } catch (err) {
        console.error("Error fetching flashcard set:", err);
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load flashcard set. Please try again."
        );
      } finally {
        setLoading(false);
      }
    };

    if (idToken) {
      fetchFlashcardSet();
    }
  }, [idToken, params.id]);

  const handleShuffle = useCallback(() => {
    if (!flashcardSet) return;

    const cards = [...flashcardSet.cards];
    for (let i = cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cards[i], cards[j]] = [cards[j], cards[i]];
    }
    setShuffledCards(cards);
    setIsShuffled(true);
    setCurrentIndex(0);
    setIsFlipped(false);
  }, [flashcardSet]);

  const handleReset = useCallback(() => {
    if (!flashcardSet) return;
    setShuffledCards([...flashcardSet.cards]);
    setIsShuffled(false);
    setCurrentIndex(0);
    setIsFlipped(false);
  }, [flashcardSet]);

  const handlePrevious = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setIsFlipped(false);
    }
  }, [currentIndex]);

  const handleNext = useCallback(() => {
    if (flashcardSet && currentIndex < shuffledCards.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setIsFlipped(false);
    }
  }, [currentIndex, shuffledCards.length, flashcardSet]);

  const handleFlip = useCallback(() => {
    setIsFlipped(!isFlipped);
  }, [isFlipped]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        handlePrevious();
      } else if (e.key === "ArrowRight") {
        handleNext();
      } else if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        handleFlip();
      }
    },
    [handlePrevious, handleNext, handleFlip]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  if (loading) {
    return <Loading />;
  }

  if (error || !flashcardSet) {
    return (
      <AuthGuard requiredRole="student" onAuthSuccess={setUser}>
        <DashboardLayout
          title="QuizChe - Study Flashcards"
          userEmail={user?.email}
          userRole="student"
        >
          <div className="flex flex-col gap-6 items-center justify-center min-h-[60vh]">
            <p className="text-lg font-light text-red-600">
              {error || "Flashcard set not found"}
            </p>
            <button
              onClick={() => router.push("/student?tab=flashcards")}
              className="px-6 py-3 bg-black text-white font-light hover:bg-gray-800 transition-colors"
            >
              Back to Flashcards
            </button>
          </div>
        </DashboardLayout>
      </AuthGuard>
    );
  }

  const currentCard = shuffledCards[currentIndex];
  const progress = ((currentIndex + 1) / shuffledCards.length) * 100;

  return (
    <AuthGuard requiredRole="student" onAuthSuccess={setUser}>
      <DashboardLayout
        title={`QuizChe - Study: ${flashcardSet.title}`}
        userEmail={user?.email}
        userRole="student"
      >
        <div className="flex flex-col gap-8">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex-1">
              {flashcardSet.coverImageUrl && (
                <div className="relative w-full max-w-md h-32 mb-4 bg-gray-200 rounded-lg overflow-hidden">
                  <Image
                    src={flashcardSet.coverImageUrl}
                    alt={flashcardSet.title}
                    fill
                    className="object-cover"
                  />
                </div>
              )}
              <h2 className="text-3xl font-light text-black">
                {flashcardSet.title}
              </h2>
              {flashcardSet.description && (
                <p className="text-lg text-gray-600 mt-2">
                  {flashcardSet.description}
                </p>
              )}
            </div>
            <button
              onClick={() => router.push("/student?tab=flashcards")}
              className="px-6 py-3 bg-gray-200 text-black font-light hover:bg-gray-300 transition-colors ml-4"
            >
              Back to Flashcards
            </button>
          </div>

          {/* Progress Bar */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-sm font-light text-gray-600">
              <span>
                Card {currentIndex + 1} of {shuffledCards.length}
              </span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-black transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Flashcard */}
          <div className="flex items-center justify-center min-h-[400px]">
            <div
              className="w-full max-w-2xl"
              style={{ perspective: "1000px" }}
              onClick={handleFlip}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleFlip();
                }
              }}
              aria-label="Flip flashcard"
            >
              <div
                className="relative w-full h-[400px] transition-transform duration-500"
                style={{
                  transformStyle: "preserve-3d",
                  transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
                }}
              >
                {/* Front Side */}
                <div
                  className={`absolute inset-0 w-full h-full border-2 border-black bg-white p-8 flex flex-col items-center justify-center gap-6 cursor-pointer ${
                    isFlipped ? "hidden" : ""
                  }`}
                  style={{
                    backfaceVisibility: "hidden",
                    transform: "rotateY(0deg)",
                  }}
                >
                  <div className="text-sm font-light text-gray-600 mb-4">
                    Front
                  </div>
                  {currentCard.frontImageUrl && (
                    <div className="relative w-full max-w-md h-48 mb-4">
                      <Image
                        src={currentCard.frontImageUrl}
                        alt="Front"
                        fill
                        className="object-contain"
                      />
                    </div>
                  )}
                  <p className="text-2xl font-light text-black text-center">
                    {currentCard.front}
                  </p>
                  <p className="text-sm font-light text-gray-500 mt-4">
                    Click or press Space to flip
                  </p>
                </div>

                {/* Back Side */}
                <div
                  className={`absolute inset-0 w-full h-full border-2 border-black bg-gray-50 p-8 flex flex-col items-center justify-center gap-6 cursor-pointer ${
                    !isFlipped ? "hidden" : ""
                  }`}
                  style={{
                    backfaceVisibility: "hidden",
                    transform: "rotateY(180deg)",
                  }}
                >
                  <div className="text-sm font-light text-gray-600 mb-4">
                    Back
                  </div>
                  {currentCard.backImageUrl && (
                    <div className="relative w-full max-w-md h-48 mb-4">
                      <Image
                        src={currentCard.backImageUrl}
                        alt="Back"
                        fill
                        className="object-contain"
                      />
                    </div>
                  )}
                  <p className="text-2xl font-light text-black text-center">
                    {currentCard.back}
                  </p>
                  <p className="text-sm font-light text-gray-500 mt-4">
                    Click or press Space to flip
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={handlePrevious}
                disabled={currentIndex === 0}
                className="px-6 py-3 bg-gray-200 text-black font-light hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                aria-label="Previous card"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
                Previous
              </button>

              <button
                onClick={handleFlip}
                className="px-8 py-3 bg-black text-white font-light hover:bg-gray-800 transition-colors"
                aria-label="Flip card"
              >
                {isFlipped ? "Show Front" : "Show Answer"}
              </button>

              <button
                onClick={handleNext}
                disabled={currentIndex === shuffledCards.length - 1}
                className="px-6 py-3 bg-gray-200 text-black font-light hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                aria-label="Next card"
              >
                Next
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            </div>

            <div className="flex items-center justify-center gap-4">
              {isShuffled ? (
                <button
                  onClick={handleReset}
                  className="px-6 py-3 bg-gray-200 text-black font-light hover:bg-gray-300 transition-colors"
                >
                  Reset Order
                </button>
              ) : (
                <button
                  onClick={handleShuffle}
                  className="px-6 py-3 bg-gray-200 text-black font-light hover:bg-gray-300 transition-colors"
                >
                  Shuffle Cards
                </button>
              )}
            </div>
          </div>

          {/* Keyboard Shortcuts Help */}
          <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg">
            <p className="text-sm font-light text-gray-600 text-center">
              <span className="font-medium">Keyboard shortcuts:</span> ←
              Previous | → Next | Space/Enter Flip
            </p>
          </div>
        </div>
      </DashboardLayout>
    </AuthGuard>
  );
}
