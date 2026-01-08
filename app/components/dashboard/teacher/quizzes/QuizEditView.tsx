"use client";

import { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import QuizForm from "../../../create/QuizForm";
import { useQuizView } from "./QuizViewContext";

interface QuizEditViewProps {
  quizId: string;
}

export default function QuizEditView({ quizId }: QuizEditViewProps) {
  const { goToDetail } = useQuizView();
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

  if (loading) {
    return (
      <div className="bg-white border-4 border-gray-900 p-12 shadow-[4px_4px_0px_0px_rgba(31,41,55,1)] flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border-3 border-gray-900 border-t-transparent rounded-full animate-spin"></div>
          <span className="font-bold text-gray-900">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-cyan-400 rounded-xl flex items-center justify-center border-3 border-gray-900 shadow-[3px_3px_0px_0px_rgba(31,41,55,1)]">
            <span className="material-icons-outlined text-gray-900 text-2xl">edit</span>
          </div>
          <div>
            <h2 className="text-3xl font-black text-gray-900">Edit Quiz</h2>
            <p className="text-sm font-bold text-gray-600">[ modify your assessment ]</p>
          </div>
        </div>
        <button
          onClick={() => goToDetail(quizId)}
          className="px-4 py-2 bg-amber-200 text-gray-900 font-bold border-3 border-gray-900 shadow-[3px_3px_0px_0px_rgba(31,41,55,1)] hover:shadow-[4px_4px_0px_0px_rgba(31,41,55,1)] active:shadow-[1px_1px_0px_0px_rgba(31,41,55,1)] transition-all flex items-center gap-2"
        >
          <span className="material-icons-outlined text-lg">close</span>
          <span>Cancel</span>
        </button>
      </div>
      {idToken && quizId ? (
        <QuizForm idToken={idToken} quizId={quizId} />
      ) : (
        <div className="bg-white border-4 border-gray-900 p-12 shadow-[4px_4px_0px_0px_rgba(31,41,55,1)] flex items-center justify-center">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 border-3 border-gray-900 border-t-transparent rounded-full animate-spin"></div>
            <span className="font-bold text-gray-900">Loading...</span>
          </div>
        </div>
      )}
    </div>
  );
}
