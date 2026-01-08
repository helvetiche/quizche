"use client";

import { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import QuizForm, { GeneratedQuizData } from "../../../create/QuizForm";
import GenerateQuizButton from "../../../create/GenerateQuizButton";
import { useQuizView } from "./QuizViewContext";

export default function QuizCreateView() {
  const { goToList, goToDetail } = useQuizView();
  const [idToken, setIdToken] = useState<string | null>(null);
  const [initialQuizData, setInitialQuizData] = useState<GeneratedQuizData | undefined>(undefined);

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

  const handleSaveQuiz = async (quiz: GeneratedQuizData) => {
    if (!idToken) return;

    try {
      const quizData = {
        title: quiz.title.trim(),
        description: quiz.description.trim(),
        isActive: true,
        questions: quiz.questions.map((q) => {
          const questionData: any = {
            question: q.question.trim(),
            type: q.type,
            answer: q.answer.trim(),
          };

          if (q.type === "multiple_choice" && q.choices && Array.isArray(q.choices)) {
            const filteredChoices = q.choices
              .filter((c) => c.trim().length > 0)
              .map((c) => c.trim());
            if (filteredChoices.length > 0) {
              questionData.choices = filteredChoices;
            }
          }

          return questionData;
        }),
      };

      const { apiPost } = await import("../../../../lib/api");
      const response = await apiPost("/api/quizzes", {
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(quizData),
        idToken,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create quiz");
      }

      alert("Quiz created successfully!");
      goToDetail(data.id);
    } catch (error) {
      console.error("Error creating quiz:", error);
      alert(error instanceof Error ? error.message : "Failed to create quiz. Please try again.");
    }
  };

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-lime-400 rounded-xl flex items-center justify-center border-3 border-gray-900 shadow-[3px_3px_0px_0px_rgba(31,41,55,1)]">
            <span className="material-icons-outlined text-gray-900 text-2xl">add_circle</span>
          </div>
          <div>
            <h2 className="text-3xl font-black text-gray-900">Create Quiz</h2>
            <p className="text-sm font-bold text-gray-600">[ build your assessment ]</p>
          </div>
        </div>
        <div className="flex gap-3">
          {idToken && (
            <GenerateQuizButton
              idToken={idToken}
              onSave={handleSaveQuiz}
              onEdit={(quiz) => setInitialQuizData(quiz)}
            />
          )}
          <button
            onClick={goToList}
            className="px-4 py-2 bg-amber-200 text-gray-900 font-bold border-3 border-gray-900 shadow-[3px_3px_0px_0px_rgba(31,41,55,1)] hover:shadow-[4px_4px_0px_0px_rgba(31,41,55,1)] active:shadow-[1px_1px_0px_0px_rgba(31,41,55,1)] transition-all flex items-center gap-2"
          >
            <span className="material-icons-outlined text-lg">close</span>
            <span>Cancel</span>
          </button>
        </div>
      </div>
      {idToken ? (
        <QuizForm idToken={idToken} initialData={initialQuizData} />
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
