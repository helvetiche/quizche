"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import AuthGuard from "../../components/auth/AuthGuard";
import DashboardLayout from "../../components/layout/DashboardLayout";
import GenerateQuizButton from "../../components/create/GenerateQuizButton";
import Loading from "../../components/ui/Loading";
import Link from "next/link";

interface Quiz {
  id: string;
  title: string;
  description: string;
  totalQuestions: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function MyQuizzesPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
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

      const { apiPost } = await import("../../lib/api");
      const response = await apiPost("/api/quizzes", {
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(quizData),
        idToken,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create quiz");
      }

      alert("Quiz created successfully!");
      router.push(`/teacher/quizzes/${data.id}`);
      router.refresh();
    } catch (error) {
      console.error("Error creating quiz:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Failed to create quiz. Please try again."
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
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
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

  if (loading && !idToken) {
    return <Loading />;
  }

  return (
    <AuthGuard requiredRole="teacher" onAuthSuccess={setUser}>
      <DashboardLayout
        title="QuizChe - My Quizzes"
        userEmail={user?.email}
        userRole="teacher"
      >
        <div className="flex flex-col gap-8">
          <div className="flex items-center justify-between">
            <h2 className="text-3xl font-light text-black">My Quizzes</h2>
            <div className="flex gap-4">
              {idToken && (
                <GenerateQuizButton
                  idToken={idToken}
                  onSave={handleSaveQuiz}
                  variant="secondary"
                />
              )}
              <Link
                href="/create/quiz"
                className="px-6 py-3 bg-black text-white font-light hover:bg-gray-800 transition-colors"
              >
                Create New Quiz
              </Link>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-black font-light">Loading quizzes...</div>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <p className="text-lg font-light text-red-600">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-3 bg-gray-200 text-black font-light hover:bg-gray-300 transition-colors"
              >
                Retry
              </button>
            </div>
          ) : quizzes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <p className="text-lg font-light text-gray-600">
                No quizzes yet. Create your first quiz to get started!
              </p>
              <Link
                href="/create/quiz"
                className="px-6 py-3 bg-black text-white font-light hover:bg-gray-800 transition-colors"
              >
                Create Quiz
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {quizzes.map((quiz) => (
                <div
                  key={quiz.id}
                  className="flex flex-col gap-4 p-6 border-2 border-black bg-white hover:bg-gray-50 transition-colors"
                >
                  <div className="flex flex-col gap-2">
                    <h3 className="text-xl font-light text-black">{quiz.title}</h3>
                    {quiz.description && (
                      <p className="text-sm font-light text-gray-600 line-clamp-2">
                        {quiz.description}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 text-sm font-light text-gray-600">
                    <div className="flex items-center gap-2">
                      <span>Questions:</span>
                      <span className="text-black">{quiz.totalQuestions}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span>Status:</span>
                      <span
                        className={`${
                          quiz.isActive ? "text-green-600" : "text-gray-400"
                        }`}
                      >
                        {quiz.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span>Created:</span>
                      <span className="text-black">{formatDate(quiz.createdAt)}</span>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-2">
                    <Link
                      href={`/teacher/quizzes/${quiz.id}`}
                      className="flex-1 px-4 py-2 bg-black text-white font-light hover:bg-gray-800 transition-colors text-center"
                    >
                      View
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DashboardLayout>
    </AuthGuard>
  );
}
