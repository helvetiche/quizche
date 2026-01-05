"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import AuthGuard from "../../../components/auth/AuthGuard";
import DashboardLayout from "../../../components/layout/DashboardLayout";
import Loading from "../../../components/ui/Loading";
import Link from "next/link";

interface Question {
  question: string;
  type: string;
  choices?: string[];
  answer: string;
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

export default function QuizDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
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
      if (!idToken || !params.id) return;

      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/quizzes/${params.id}`, {
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
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
  }, [idToken, params.id]);

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

  if (loading && !idToken) {
    return <Loading />;
  }

  return (
    <AuthGuard requiredRole="teacher" onAuthSuccess={setUser}>
      <DashboardLayout
        title="QuizChe - Quiz Details"
        userEmail={user?.email}
        userRole="teacher"
      >
        <div className="flex flex-col gap-8">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.back()}
              className="px-4 py-2 bg-gray-200 text-black font-light hover:bg-gray-300 transition-colors"
            >
              ← Back
            </button>
            <div className="flex gap-3">
              <Link
                href={`/teacher/quizzes/${params.id}/edit`}
                className="px-6 py-2 bg-black text-white font-light hover:bg-gray-800 transition-colors"
              >
                Edit Quiz
              </Link>
              <Link
                href={`/teacher/quizzes/${params.id}/settings`}
                className="px-6 py-2 bg-gray-200 text-black font-light hover:bg-gray-300 transition-colors"
              >
                Configure
              </Link>
              <Link
                href="/teacher/quizzes"
                className="px-4 py-2 bg-gray-200 text-black font-light hover:bg-gray-300 transition-colors"
              >
                My Quizzes
              </Link>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-black font-light">Loading quiz...</div>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <p className="text-lg font-light text-red-600">{error}</p>
              <button
                onClick={() => router.back()}
                className="px-6 py-3 bg-gray-200 text-black font-light hover:bg-gray-300 transition-colors"
              >
                Go Back
              </button>
            </div>
          ) : quiz ? (
            <>
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-3xl font-light text-black">{quiz.title}</h2>
                  <span
                    className={`px-4 py-2 rounded-full text-sm font-light ${
                      quiz.isActive
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {quiz.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
                {quiz.description && (
                  <p className="text-lg font-light text-gray-600">{quiz.description}</p>
                )}
                <div className="flex gap-4 text-sm font-light text-gray-600">
                  <span>Created: {formatDate(quiz.createdAt)}</span>
                  <span>•</span>
                  <span>{quiz.totalQuestions} questions</span>
                </div>
              </div>

              <div className="flex flex-col gap-6">
                <h3 className="text-2xl font-light text-black">Questions</h3>
                {quiz.questions.map((question, index) => (
                  <div
                    key={index}
                    className="flex flex-col gap-4 p-6 border-2 border-black bg-white"
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-lg font-light text-black min-w-[30px]">
                        {index + 1}.
                      </span>
                      <div className="flex-1 flex flex-col gap-4">
                        <div>
                          <p className="text-base font-light text-black mb-2">
                            {question.question}
                          </p>
                          <span className="text-xs font-light text-gray-500 px-2 py-1 bg-gray-100 rounded">
                            {getQuestionTypeLabel(question.type)}
                          </span>
                        </div>

                        {question.type === "multiple_choice" && question.choices && (
                          <div className="flex flex-wrap gap-3 ml-4">
                            {question.choices.map((choice, choiceIndex) => {
                              const isCorrectAnswer = question.answer.trim() === choice.trim();
                              return (
                                <div
                                  key={choiceIndex}
                                  className={`px-6 py-2 rounded-full border-2 font-light ${
                                    isCorrectAnswer
                                      ? "bg-green-100 text-green-800 border-green-600"
                                      : "bg-white text-black border-gray-300"
                                  }`}
                                >
                                  {choice}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {question.type === "true_or_false" && (
                          <div className="flex gap-3 ml-4">
                            <div
                              className={`px-6 py-2 rounded-full border-2 font-light ${
                                question.answer === "true"
                                  ? "bg-green-100 text-green-800 border-green-600"
                                  : "bg-white text-black border-gray-300"
                              }`}
                            >
                              True
                            </div>
                            <div
                              className={`px-6 py-2 rounded-full border-2 font-light ${
                                question.answer === "false"
                                  ? "bg-green-100 text-green-800 border-green-600"
                                  : "bg-white text-black border-gray-300"
                              }`}
                            >
                              False
                            </div>
                          </div>
                        )}

                        <div className="ml-4 mt-2 p-3 bg-gray-100 border border-gray-300">
                          <p className="text-xs font-light text-gray-600 mb-1">
                            Correct Answer:
                          </p>
                          <p className="text-sm font-light text-black">
                            {question.answer}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : null}
        </div>
      </DashboardLayout>
    </AuthGuard>
  );
}
