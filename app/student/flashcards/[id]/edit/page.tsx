/* eslint-disable @typescript-eslint/strict-boolean-expressions, @typescript-eslint/explicit-function-return-type */
"use client";

import { useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import AuthGuard from "../../../../components/auth/AuthGuard";
import DashboardLayout from "../../../../components/layout/DashboardLayout";
import FlashcardMaker from "../../../../components/create/FlashcardMaker";

type User = {
  email?: string;
  idToken?: string;
};

export default function EditFlashcardPage() {
  const params = useParams();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);

  const handleAuthSuccess = useCallback((userData: User) => {
    setUser(userData);
    if (userData.idToken) {
      setIdToken(userData.idToken);
    }
  }, []);

  const handleSuccess = (): void => {
    router.push("/student?tab=flashcards");
  };

  return (
    <AuthGuard requiredRole="student" onAuthSuccess={handleAuthSuccess}>
      <DashboardLayout
        title="QuizChe - Edit Flashcard Set"
        userEmail={user?.email}
        userRole="student"
      >
        <div className="flex flex-col gap-8">
          <div className="flex items-center justify-between">
            <h2 className="text-3xl font-light text-black">
              Edit Flashcard Set
            </h2>
            <button
              onClick={() => router.back()}
              className="px-4 py-2 bg-gray-200 text-black font-light hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
          </div>
          {!params.id ? (
            <div className="p-4 bg-red-50 border border-red-200 text-red-600 rounded-lg">
              Error: Invalid Flashcard ID. Please go back and try again.
            </div>
          ) : idToken ? (
            <FlashcardMaker
              idToken={idToken}
              flashcardId={params.id as string}
              onSuccess={handleSuccess}
            />
          ) : (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              <span className="ml-3 text-gray-600">Initializing editor...</span>
            </div>
          )}
        </div>
      </DashboardLayout>
    </AuthGuard>
  );
}
