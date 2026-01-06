"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import AuthGuard from "../../../../components/auth/AuthGuard";
import DashboardLayout from "../../../../components/layout/DashboardLayout";
import Loading from "../../../../components/ui/Loading";
import FlashcardMaker from "../../../../components/create/FlashcardMaker";

export default function EditFlashcardPage() {
  const params = useParams();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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

  const handleSuccess = () => {
    router.push("/student/flashcards");
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <AuthGuard requiredRole="student" onAuthSuccess={setUser}>
      <DashboardLayout
        title="QuizChe - Edit Flashcard Set"
        userEmail={user?.email}
        userRole="student"
      >
        <div className="flex flex-col gap-8">
          <div className="flex items-center justify-between">
            <h2 className="text-3xl font-light text-black">Edit Flashcard Set</h2>
            <button
              onClick={() => router.back()}
              className="px-4 py-2 bg-gray-200 text-black font-light hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
          </div>
          {idToken && params.id ? (
            <FlashcardMaker
              idToken={idToken}
              flashcardId={params.id as string}
              onSuccess={handleSuccess}
            />
          ) : (
            <p className="text-lg text-black">Loading...</p>
          )}
        </div>
      </DashboardLayout>
    </AuthGuard>
  );
}
