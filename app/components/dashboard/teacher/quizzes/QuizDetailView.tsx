"use client";

import { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import Image from "next/image";
import { useQuizView } from "./QuizViewContext";

interface Question {
  question: string;
  type: string;
  choices?: string[];
  answer: string;
  imageUrl?: string;
}

interface Quiz {
  id: string;
  title: string;
  description: string;
  questions: Question[];
  totalQuestions: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Violation {
  type: string;
  timestamp: string;
  details?: string;
}

interface QuizAttempt {
  id: string;
  userId: string;
  studentEmail: string;
  studentName: string;
  answers: Record<number, string>;
  score: number;
  totalQuestions: number;
  percentage: number;
  completedAt: string;
  timeSpent: number;
  tabChangeCount?: number;
  timeAway?: number;
  refreshDetected?: boolean;
  violations?: Violation[];
  disqualified?: boolean;
}

interface QuizDetailViewProps {
  quizId: string;
}

export default function QuizDetailView({ quizId }: QuizDetailViewProps) {
  const { goToList, goToEdit, goToSettings, goToResults, goToLive } = useQuizView();
  const [idToken, setIdToken] = useState<string | null>(null);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingAttempts, setLoadingAttempts] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    const fetchQuiz = async () => {
      if (!idToken || !quizId) return;

      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/quizzes/${quizId}`, {
          headers: { Authorization: `Bearer ${idToken}` },
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to fetch quiz");
        }

        setQuiz(data.quiz);
      } catch (err) {
        console.error("Error fetching quiz:", err);
        setError(err instanceof Error ? err.message : "Failed to load quiz");
      } finally {
        setLoading(false);
      }
    };

    fetchQuiz();
  }, [idToken, quizId]);

  useEffect(() => {
    const fetchAttempts = async () => {
      if (!idToken || !quizId) return;

      try {
        setLoadingAttempts(true);

        const response = await fetch(`/api/teacher/quizzes/${quizId}/attempts`, {
          headers: { Authorization: `Bearer ${idToken}` },
        });

        const data = await response.json();

        if (response.ok) {
          setAttempts(data.attempts || []);
        }
      } catch (err) {
        console.error("Error fetching attempts:", err);
      } finally {
        setLoadingAttempts(false);
      }
    };

    fetchAttempts();
  }, [idToken, quizId]);

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "Unknown date";
    }
  };

  const getQuestionTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      multiple_choice: "Multiple Choice",
      identification: "Identification",
      true_or_false: "True or False",
      essay: "Essay",
      enumeration: "Enumeration",
      reflection: "Reflection",
    };
    return labels[type] || type;
  };

  const getQuestionTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      multiple_choice: "bg-cyan-400",
      identification: "bg-purple-400",
      true_or_false: "bg-lime-400",
      essay: "bg-pink-400",
      enumeration: "bg-orange-400",
      reflection: "bg-amber-400",
    };
    return colors[type] || "bg-gray-400";
  };

  if (loading) {
    return (
      <div className="bg-white border-4 border-gray-900 p-12 shadow-[4px_4px_0px_0px_rgba(31,41,55,1)] flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border-3 border-gray-900 border-t-transparent rounded-full animate-spin"></div>
          <span className="font-bold text-gray-900">Loading quiz...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-400 border-4 border-gray-900 p-8 shadow-[4px_4px_0px_0px_rgba(31,41,55,1)] flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center border-3 border-gray-900">
          <span className="material-icons-outlined text-red-500 text-2xl">error</span>
        </div>
        <p className="text-lg font-bold text-gray-900">{error}</p>
        <button
          onClick={goToList}
          className="px-6 py-3 bg-white text-gray-900 font-bold border-3 border-gray-900 shadow-[3px_3px_0px_0px_rgba(31,41,55,1)] hover:shadow-[4px_4px_0px_0px_rgba(31,41,55,1)] transition-all"
        >
          ← Back to Quizzes
        </button>
      </div>
    );
  }

  if (!quiz) return null;

  return (
    <div className="flex flex-col gap-8">
      {/* Navigation & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button
          onClick={goToList}
          className="flex items-center gap-2 px-4 py-2 bg-amber-200 text-gray-900 font-bold border-3 border-gray-900 shadow-[3px_3px_0px_0px_rgba(31,41,55,1)] hover:shadow-[4px_4px_0px_0px_rgba(31,41,55,1)] active:shadow-[1px_1px_0px_0px_rgba(31,41,55,1)] active:translate-x-0.5 active:translate-y-0.5 transition-all w-fit"
        >
          <span className="material-icons-outlined text-lg">arrow_back</span>
          <span>Back</span>
        </button>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => goToResults(quizId)}
            className="px-4 py-2 bg-purple-400 text-gray-900 font-bold border-3 border-gray-900 shadow-[3px_3px_0px_0px_rgba(31,41,55,1)] hover:shadow-[4px_4px_0px_0px_rgba(31,41,55,1)] active:shadow-[1px_1px_0px_0px_rgba(31,41,55,1)] transition-all flex items-center gap-2"
          >
            <span className="material-icons-outlined text-lg">analytics</span>
            <span>Results</span>
          </button>
          <button
            onClick={() => goToLive(quizId)}
            className="px-4 py-2 bg-red-500 text-white font-bold border-3 border-gray-900 shadow-[3px_3px_0px_0px_rgba(31,41,55,1)] hover:shadow-[4px_4px_0px_0px_rgba(31,41,55,1)] active:shadow-[1px_1px_0px_0px_rgba(31,41,55,1)] transition-all flex items-center gap-2"
          >
            <span className="material-icons-outlined text-lg">visibility</span>
            <span>Live</span>
          </button>
          <button
            onClick={() => goToEdit(quizId)}
            className="px-4 py-2 bg-cyan-400 text-gray-900 font-bold border-3 border-gray-900 shadow-[3px_3px_0px_0px_rgba(31,41,55,1)] hover:shadow-[4px_4px_0px_0px_rgba(31,41,55,1)] active:shadow-[1px_1px_0px_0px_rgba(31,41,55,1)] transition-all flex items-center gap-2"
          >
            <span className="material-icons-outlined text-lg">edit</span>
            <span>Edit</span>
          </button>
          <button
            onClick={() => goToSettings(quizId)}
            className="px-4 py-2 bg-amber-200 text-gray-900 font-bold border-3 border-gray-900 shadow-[3px_3px_0px_0px_rgba(31,41,55,1)] hover:shadow-[4px_4px_0px_0px_rgba(31,41,55,1)] active:shadow-[1px_1px_0px_0px_rgba(31,41,55,1)] transition-all flex items-center gap-2"
          >
            <span className="material-icons-outlined text-lg">settings</span>
            <span>Configure</span>
          </button>
        </div>
      </div>

      {/* Quiz Header Card */}
      <div className="bg-white border-4 border-gray-900 shadow-[6px_6px_0px_0px_rgba(31,41,55,1)] overflow-hidden">
        {/* Header Bar */}
        <div className="bg-cyan-400 border-b-4 border-gray-900 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <div className="w-4 h-4 bg-red-500 rounded-full border-2 border-gray-900"></div>
              <div className="w-4 h-4 bg-yellow-500 rounded-full border-2 border-gray-900"></div>
              <div className="w-4 h-4 bg-green-500 rounded-full border-2 border-gray-900"></div>
            </div>
            <div className={`px-3 py-1 text-sm font-bold border-2 border-gray-900 ${
              quiz.isActive ? "bg-lime-400 text-gray-900" : "bg-gray-300 text-gray-600"
            }`}>
              {quiz.isActive ? "ACTIVE" : "INACTIVE"}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <h2 className="text-3xl font-black text-gray-900 mb-2">{quiz.title}</h2>
          {quiz.description && (
            <p className="text-lg font-medium text-gray-600 mb-4">{quiz.description}</p>
          )}
          
          {/* Stats Row */}
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-100 border-2 border-gray-900 rounded-full">
              <span className="material-icons-outlined text-gray-900 text-sm">help_outline</span>
              <span className="font-bold text-gray-900 text-sm">{quiz.totalQuestions} questions</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-100 border-2 border-gray-900 rounded-full">
              <span className="material-icons-outlined text-gray-900 text-sm">calendar_today</span>
              <span className="font-bold text-gray-900 text-sm">{formatDate(quiz.createdAt)}</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-100 border-2 border-gray-900 rounded-full">
              <span className="material-icons-outlined text-gray-900 text-sm">people</span>
              <span className="font-bold text-gray-900 text-sm">{attempts.length} submissions</span>
            </div>
          </div>
        </div>
      </div>

      {/* Questions Section */}
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-900 rounded-lg flex items-center justify-center">
            <span className="material-icons-outlined text-amber-100 text-xl">quiz</span>
          </div>
          <h3 className="text-2xl font-black text-gray-900">Questions</h3>
        </div>

        {quiz.questions.map((question, index) => (
          <div key={index} className="bg-white border-4 border-gray-900 shadow-[4px_4px_0px_0px_rgba(31,41,55,1)] overflow-hidden">
            {/* Question Header */}
            <div className={`${getQuestionTypeColor(question.type)} border-b-4 border-gray-900 px-5 py-3 flex items-center justify-between`}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center border-2 border-gray-900">
                  <span className="font-black text-gray-900">{index + 1}</span>
                </div>
                <span className="font-bold text-gray-900">{getQuestionTypeLabel(question.type)}</span>
              </div>
            </div>

            {/* Question Content */}
            <div className="p-5">
              <p className="text-lg font-medium text-gray-900 mb-4">{question.question}</p>

              {question.imageUrl && (
                <div className="relative w-full max-w-2xl h-64 border-3 border-gray-900 mb-4 bg-gray-100">
                  <Image src={question.imageUrl} alt="Question image" fill className="object-contain" />
                </div>
              )}

              {question.type === "multiple_choice" && question.choices && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {question.choices.map((choice, choiceIndex) => {
                    const isCorrectAnswer = question.answer.trim() === choice.trim();
                    return (
                      <div
                        key={choiceIndex}
                        className={`px-4 py-2 font-bold border-3 border-gray-900 ${
                          isCorrectAnswer
                            ? "bg-lime-400 text-gray-900"
                            : "bg-white text-gray-700"
                        }`}
                      >
                        {choice}
                      </div>
                    );
                  })}
                </div>
              )}

              {question.type === "true_or_false" && (
                <div className="flex gap-3 mb-4">
                  <div
                    className={`px-6 py-2 font-bold border-3 border-gray-900 ${
                      question.answer === "true"
                        ? "bg-lime-400 text-gray-900"
                        : "bg-white text-gray-700"
                    }`}
                  >
                    True
                  </div>
                  <div
                    className={`px-6 py-2 font-bold border-3 border-gray-900 ${
                      question.answer === "false"
                        ? "bg-lime-400 text-gray-900"
                        : "bg-white text-gray-700"
                    }`}
                  >
                    False
                  </div>
                </div>
              )}

              {/* Answer Box */}
              <div className="bg-lime-100 border-3 border-gray-900 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="material-icons-outlined text-gray-900 text-sm">check_circle</span>
                  <span className="text-sm font-bold text-gray-700">CORRECT ANSWER</span>
                </div>
                <p className="font-medium text-gray-900">{question.answer}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Student Results Section */}
      <div className="flex flex-col gap-6 pt-6 border-t-4 border-gray-900">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-400 rounded-lg flex items-center justify-center border-2 border-gray-900">
              <span className="material-icons-outlined text-gray-900 text-xl">leaderboard</span>
            </div>
            <h3 className="text-2xl font-black text-gray-900">Student Results</h3>
          </div>
          <div className="px-3 py-1.5 bg-amber-200 border-2 border-gray-900 rounded-full">
            <span className="font-bold text-gray-900 text-sm">
              {attempts.length} {attempts.length === 1 ? "submission" : "submissions"}
            </span>
          </div>
        </div>

        {loadingAttempts ? (
          <div className="bg-white border-4 border-gray-900 p-8 shadow-[4px_4px_0px_0px_rgba(31,41,55,1)] flex items-center justify-center">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 border-3 border-gray-900 border-t-transparent rounded-full animate-spin"></div>
              <span className="font-bold text-gray-900">Loading results...</span>
            </div>
          </div>
        ) : attempts.length === 0 ? (
          <div className="bg-amber-200 border-4 border-gray-900 p-8 shadow-[4px_4px_0px_0px_rgba(31,41,55,1)] flex flex-col items-center justify-center gap-3">
            <div className="w-12 h-12 bg-purple-400 rounded-full flex items-center justify-center border-3 border-gray-900">
              <span className="material-icons-outlined text-gray-900 text-2xl">hourglass_empty</span>
            </div>
            <p className="text-lg font-bold text-gray-900 text-center">
              No submissions yet. Students will appear here after they take the quiz.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {attempts.slice(0, 5).map((attempt, index) => {
              const scoreColor = attempt.percentage >= 70 
                ? "bg-lime-400" 
                : attempt.percentage >= 50 
                ? "bg-orange-400" 
                : "bg-red-400";
              
              return (
                <div key={attempt.id} className="bg-white border-4 border-gray-900 shadow-[4px_4px_0px_0px_rgba(31,41,55,1)] p-5 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-cyan-400 rounded-full flex items-center justify-center border-2 border-gray-900">
                      <span className="font-black text-gray-900">{index + 1}</span>
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-gray-900">{attempt.studentName}</h4>
                      <p className="text-sm font-medium text-gray-600">{attempt.studentEmail}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className={`${scoreColor} px-4 py-2 border-3 border-gray-900`}>
                      <span className="text-2xl font-black text-gray-900">{attempt.percentage}%</span>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900">{attempt.score}/{attempt.totalQuestions}</p>
                      <p className="text-xs font-medium text-gray-600">correct</p>
                    </div>
                  </div>
                </div>
              );
            })}
            {attempts.length > 5 && (
              <button
                onClick={() => goToResults(quizId)}
                className="w-full px-6 py-4 bg-gray-900 text-amber-100 font-bold border-3 border-gray-900 shadow-[4px_4px_0px_0px_rgba(31,41,55,1)] hover:shadow-[5px_5px_0px_0px_rgba(31,41,55,1)] active:shadow-[2px_2px_0px_0px_rgba(31,41,55,1)] transition-all flex items-center justify-center gap-2"
              >
                <span>View All {attempts.length} Results</span>
                <span className="material-icons-outlined">arrow_forward</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
