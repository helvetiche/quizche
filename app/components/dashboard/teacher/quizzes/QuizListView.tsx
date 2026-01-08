"use client";

import { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import GenerateQuizButton from "../../../create/GenerateQuizButton";
import { useQuizView } from "./QuizViewContext";

interface Quiz {
  id: string;
  title: string;
  description: string;
  totalQuestions: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function QuizListView() {
  const { goToCreate, goToDetail } = useQuizView();
  const [idToken, setIdToken] = useState<string | null>(null);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleSaveQuiz = async (quiz: any) => {
    if (!idToken) return;

    try {
      const quizData = {
        title: quiz.title.trim(),
        description: quiz.description.trim(),
        isActive: true,
        questions: quiz.questions.map((q: any) => {
          const questionData: any = {
            question: q.question.trim(),
            type: q.type,
            answer: q.answer.trim(),
          };

          if (q.type === "multiple_choice" && q.choices && Array.isArray(q.choices)) {
            const filteredChoices = q.choices
              .filter((c: string) => c.trim().length > 0)
              .map((c: string) => c.trim());
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
    const fetchQuizzes = async () => {
      if (!idToken) return;

      try {
        setLoading(true);
        setError(null);

        const response = await fetch("/api/quizzes", {
          headers: { Authorization: `Bearer ${idToken}` },
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to fetch quizzes");
        }

        setQuizzes(data.quizzes || []);
      } catch (err) {
        console.error("Error fetching quizzes:", err);
        setError(err instanceof Error ? err.message : "Failed to load quizzes");
      } finally {
        setLoading(false);
      }
    };

    fetchQuizzes();
  }, [idToken]);

  const formatDate = (dateString: string) => {
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-cyan-400 rounded-xl flex items-center justify-center border-3 border-gray-900 shadow-[3px_3px_0px_0px_rgba(31,41,55,1)]">
            <span className="material-icons-outlined text-gray-900 text-2xl">assignment</span>
          </div>
          <div>
            <h2 className="text-3xl font-black text-gray-900">My Quizzes</h2>
            <p className="text-sm font-bold text-gray-600">[ create & manage assessments ]</p>
          </div>
        </div>
        <div className="flex gap-3">
          {idToken && (
            <GenerateQuizButton
              idToken={idToken}
              onSave={handleSaveQuiz}
              variant="secondary"
            />
          )}
          <button
            onClick={goToCreate}
            className="px-6 py-3 bg-gray-900 text-amber-100 font-bold border-3 border-gray-900 shadow-[4px_4px_0px_0px_rgba(31,41,55,1)] hover:shadow-[6px_6px_0px_0px_rgba(31,41,55,1)] hover:-translate-x-0.5 hover:-translate-y-0.5 active:shadow-[2px_2px_0px_0px_rgba(31,41,55,1)] active:translate-x-0.5 active:translate-y-0.5 transition-all"
          >
            + Create Quiz
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="bg-white border-4 border-gray-900 p-12 shadow-[4px_4px_0px_0px_rgba(31,41,55,1)] flex items-center justify-center">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 border-3 border-gray-900 border-t-transparent rounded-full animate-spin"></div>
            <span className="font-bold text-gray-900">Loading quizzes...</span>
          </div>
        </div>
      ) : error ? (
        <div className="bg-red-400 border-4 border-gray-900 p-8 shadow-[4px_4px_0px_0px_rgba(31,41,55,1)] flex flex-col items-center justify-center gap-4">
          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center border-3 border-gray-900">
            <span className="material-icons-outlined text-red-500 text-2xl">error</span>
          </div>
          <p className="text-lg font-bold text-gray-900">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-white text-gray-900 font-bold border-3 border-gray-900 shadow-[3px_3px_0px_0px_rgba(31,41,55,1)] hover:shadow-[4px_4px_0px_0px_rgba(31,41,55,1)] transition-all"
          >
            Retry
          </button>
        </div>
      ) : quizzes.length === 0 ? (
        <div className="bg-amber-200 border-4 border-gray-900 p-12 shadow-[4px_4px_0px_0px_rgba(31,41,55,1)] flex flex-col items-center justify-center gap-4">
          <div className="w-16 h-16 bg-cyan-400 rounded-full flex items-center justify-center border-3 border-gray-900">
            <span className="material-icons-outlined text-gray-900 text-3xl">quiz</span>
          </div>
          <p className="text-lg font-bold text-gray-900 text-center">
            No quizzes yet. Create your first quiz to get started!
          </p>
          <button
            onClick={goToCreate}
            className="px-6 py-3 bg-gray-900 text-amber-100 font-bold border-3 border-gray-900 shadow-[4px_4px_0px_0px_rgba(31,41,55,1)] hover:shadow-[5px_5px_0px_0px_rgba(31,41,55,1)] active:shadow-[2px_2px_0px_0px_rgba(31,41,55,1)] transition-all"
          >
            + Create Quiz
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {quizzes.map((quiz, index) => {
            const colors = ["bg-cyan-400", "bg-pink-400", "bg-lime-400", "bg-orange-400", "bg-purple-400"];
            const headerColor = colors[index % colors.length];
            
            return (
              <div
                key={quiz.id}
                className="group bg-white border-4 border-gray-900 shadow-[5px_5px_0px_0px_rgba(31,41,55,1)] hover:shadow-[7px_7px_0px_0px_rgba(31,41,55,1)] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all overflow-hidden"
              >
                {/* Card Header */}
                <div className={`${headerColor} border-b-4 border-gray-900 px-4 py-3`}>
                  <div className="flex items-center justify-between">
                    <div className="flex gap-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full border border-gray-900"></div>
                      <div className="w-3 h-3 bg-yellow-500 rounded-full border border-gray-900"></div>
                      <div className="w-3 h-3 bg-green-500 rounded-full border border-gray-900"></div>
                    </div>
                    <div className={`px-2 py-0.5 text-xs font-bold border-2 border-gray-900 ${
                      quiz.isActive ? "bg-lime-400 text-gray-900" : "bg-gray-300 text-gray-600"
                    }`}>
                      {quiz.isActive ? "ACTIVE" : "INACTIVE"}
                    </div>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-5">
                  <h3 className="text-xl font-black text-gray-900 mb-2 line-clamp-1">{quiz.title}</h3>
                  {quiz.description && (
                    <p className="text-sm font-medium text-gray-600 mb-4 line-clamp-2">
                      {quiz.description}
                    </p>
                  )}

                  {/* Stats */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-100 border-2 border-gray-900 rounded-full">
                      <span className="material-icons-outlined text-gray-900 text-sm">help_outline</span>
                      <span className="font-bold text-gray-900 text-xs">{quiz.totalQuestions} questions</span>
                    </div>
                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-100 border-2 border-gray-900 rounded-full">
                      <span className="material-icons-outlined text-gray-900 text-sm">schedule</span>
                      <span className="font-bold text-gray-900 text-xs">{formatDate(quiz.createdAt)}</span>
                    </div>
                  </div>

                  {/* Action Button */}
                  <button
                    onClick={() => goToDetail(quiz.id)}
                    className="w-full px-4 py-3 bg-gray-900 text-amber-100 font-bold border-3 border-gray-900 shadow-[3px_3px_0px_0px_rgba(31,41,55,1)] hover:shadow-[4px_4px_0px_0px_rgba(31,41,55,1)] active:shadow-[1px_1px_0px_0px_rgba(31,41,55,1)] active:translate-x-0.5 active:translate-y-0.5 transition-all flex items-center justify-center gap-2"
                  >
                    <span>View Quiz</span>
                    <span className="material-icons-outlined text-lg group-hover:translate-x-1 transition-transform">arrow_forward</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
