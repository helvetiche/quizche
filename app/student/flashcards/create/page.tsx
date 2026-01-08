"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import AuthGuard from "../../../components/auth/AuthGuard";
import DashboardLayout from "../../../components/layout/DashboardLayout";
import FlashcardMaker from "../../../components/create/FlashcardMaker";
import GenerateFlashcardButton from "../../../components/create/GenerateFlashcardButton";
import Loading from "../../../components/ui/Loading";

interface GeneratedFlashcardSetData {
  title: string;
  description: string;
  cards: Array<{
    front: string;
    back: string;
  }>;
}

export default function CreateFlashcardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialFlashcardData, setInitialFlashcardData] = useState<GeneratedFlashcardSetData | undefined>(undefined);

  const handleSuccess = () => {
    router.push("/student?tab=flashcards");
  };

  const handleSaveFlashcardSet = async (flashcardSet: GeneratedFlashcardSetData) => {
    if (!idToken) return;

    try {
      const flashcardData = {
        title: flashcardSet.title.trim(),
        description: flashcardSet.description.trim(),
        isPublic: false,
        cards: flashcardSet.cards.map((card) => ({
          front: card.front.trim(),
          back: card.back.trim(),
        })),
      };

      const { apiPost } = await import("../../../lib/api");
      const response = await apiPost("/api/flashcards", {
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(flashcardData),
        idToken,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create flashcard set");
      }

      alert("Flashcard set created successfully!");
      router.push("/student?tab=flashcards");
    } catch (error) {
      console.error("Error creating flashcard set:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Failed to create flashcard set. Please try again."
      );
    }
  };

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
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return <Loading />;
  }

  return (
    <AuthGuard requiredRole="student" onAuthSuccess={setUser}>
      <DashboardLayout
        title="QuizChe - Create Flashcard Set"
        userEmail={user?.email}
        userRole="student"
      >
        <div className="flex flex-col gap-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-light text-black">Create Flashcard Set</h2>
              <p className="text-lg text-gray-600 mt-2">
                Build your own flashcard sets for effective studying
              </p>
            </div>
            {idToken && (
              <GenerateFlashcardButton
                idToken={idToken}
                onSave={handleSaveFlashcardSet}
                onEdit={(flashcardSet) => {
                  setInitialFlashcardData(flashcardSet);
                }}
              />
            )}
          </div>

          {idToken ? (
            <FlashcardMaker onSuccess={handleSuccess} initialData={initialFlashcardData} idToken={idToken} />
          ) : (
            <p className="text-lg text-black">Loading...</p>
          )}
        </div>
      </DashboardLayout>
    </AuthGuard>
  );
}
