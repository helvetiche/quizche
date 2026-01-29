"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import AuthGuard from "@/app/components/auth/AuthGuard";
import DashboardLayout from "@/app/components/layout/DashboardLayout";
import Loading from "@/app/components/ui/Loading";

type Question = {
  question: string;
  type: string;
  choices?: string[];
  answer: string;
};

type Quiz = {
  id: string;
  title: string;
  description?: string;
  questions: Question[];
  totalQuestions: number;
  showResults: boolean;
};

type Violation = {
  type: string;
  timestamp: string;
  details?: string;
};

type QuizAttempt = {
  id: string;
  quizId: string;
  quizTitle: string;
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
};

export default function QuizAttemptDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [attempt, setAttempt] = useState<QuizAttempt | null>(null);
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
    const fetchData = async () => {
      if (!idToken || !params.attemptId) return;

      try {
        setLoading(true);
        setError(null);

        // Fetch attempt from history
        const attemptResponse = await fetch(`/api/users/history`, {
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        });

        if (!attemptResponse.ok) {
          throw new Error("Failed to fetch attempt");
        }

        const historyData = await attemptResponse.json();
        const foundAttempt = historyData.attempts?.find(
          (a: QuizAttempt) => a.id === params.attemptId
        );

        if (!foundAttempt) {
          throw new Error("Attempt not found");
        }

        setAttempt(foundAttempt);

        // Fetch quiz with answers (since student has completed it)
        const quizResponse = await fetch(
          `/api/quizzes/${foundAttempt.quizId}`,
          {
            headers: {
              Authorization: `Bearer ${idToken}`,
            },
          }
        );

        if (!quizResponse.ok) {
          throw new Error("Failed to fetch quiz");
        }

        const quizData = await quizResponse.json();
        setQuiz(quizData.quiz);
      } catch (err) {
        console.error("Error fetching attempt details:", err);
        setError(
          err instanceof Error ? err.message : "Failed to load attempt details"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [idToken, params.attemptId]);

  const formatTimeSpent = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${remainingSeconds}s`;
  };

  const formatTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    } catch {
      return "Unknown";
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

  const getScoreColor = (percentage: number) => {
    if (percentage >= 90) return "text-green-600 bg-green-50";
    if (percentage >= 70) return "text-blue-600 bg-blue-50";
    if (percentage >= 50) return "text-yellow-600 bg-yellow-50";
    return "text-red-600 bg-red-50";
  };

  const goToHistory = () => router.push("/student?tab=history");
  if (loading && !idToken) {
    return <Loading />;
  }

  return (
    <AuthGuard requiredRole="student" onAuthSuccess={setUser}>
      <DashboardLayout
        title="QuizChe - Quiz Attempt Details"
        userEmail={user?.email}
        userRole="student"
      >
        <div className="flex flex-col gap-8 max-w-4xl mx-auto">
          {error ? (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <p className="text-lg font-light text-red-600">{error}</p>
              <button
                onClick={goToHistory}
                className="px-6 py-3 bg-gray-200 text-black font-light hover:bg-gray-300 transition-colors"
              >
                Back to History
              </button>
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-black font-light">
                Loading attempt details...
              </div>
            </div>
          ) : quiz && attempt ? (
            <div className="flex flex-col gap-8">
              {/* Header */}
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h1 className="text-3xl font-light text-black">
                    Quiz Attempt Details
                  </h1>
                  <button
                    onClick={goToHistory}
                    className="px-4 py-2 bg-gray-200 text-black font-light hover:bg-gray-300 transition-colors"
                  >
                    Back to History
                  </button>
                </div>
                <div className="flex items-center gap-4">
                  <h2 className="text-xl font-light text-black">
                    {attempt.quizTitle}
                  </h2>
                  <div
                    className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-light ${getScoreColor(
                      attempt.percentage
                    )}`}
                  >
                    {attempt.score}/{attempt.totalQuestions} (
                    {attempt.percentage.toFixed(1)}%)
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm font-light text-gray-600">
                  <span>
                    Completed on{" "}
                    {new Date(attempt.completedAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  <span>•</span>
                  <span>Time spent: {formatTimeSpent(attempt.timeSpent)}</span>
                </div>
              </div>

              {/* Progress Bar */}
              <div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full ${
                      attempt.percentage >= 90
                        ? "bg-green-500"
                        : attempt.percentage >= 70
                          ? "bg-blue-500"
                          : attempt.percentage >= 50
                            ? "bg-yellow-500"
                            : "bg-red-500"
                    }`}
                    style={{ width: `${attempt.percentage}%` }}
                  ></div>
                </div>
              </div>

              {/* Cheating Indicators */}
              {(attempt.tabChangeCount !== undefined ||
                attempt.timeAway !== undefined ||
                attempt.refreshDetected ||
                attempt.disqualified ||
                (attempt.violations && attempt.violations.length > 0)) && (
                <div className="p-4 bg-white border-2 border-red-600">
                  <h4 className="text-base font-medium text-black mb-3">
                    Integrity Status:
                  </h4>
                  <div className="flex flex-wrap gap-3">
                    {attempt.disqualified && (
                      <span className="px-3 py-1 bg-red-100 text-red-800 border-2 border-red-600 text-sm font-light">
                        Disqualified
                      </span>
                    )}
                    {attempt.refreshDetected && (
                      <span className="px-3 py-1 bg-red-100 text-red-800 border-2 border-red-600 text-sm font-light">
                        Page Refresh Detected
                      </span>
                    )}
                    {attempt.tabChangeCount !== undefined &&
                      attempt.tabChangeCount > 0 && (
                        <span
                          className={`px-3 py-1 border-2 text-sm font-light ${
                            attempt.tabChangeCount > 3
                              ? "bg-red-100 text-red-800 border-red-600"
                              : "bg-yellow-100 text-yellow-800 border-yellow-600"
                          }`}
                        >
                          Tab Changes: {attempt.tabChangeCount}
                        </span>
                      )}
                    {attempt.timeAway !== undefined && attempt.timeAway > 0 && (
                      <span
                        className={`px-3 py-1 border-2 text-sm font-light ${
                          attempt.timeAway > 5
                            ? "bg-red-100 text-red-800 border-red-600"
                            : "bg-yellow-100 text-yellow-800 border-yellow-600"
                        }`}
                      >
                        Time Away: {attempt.timeAway}s
                      </span>
                    )}
                    {attempt.violations && attempt.violations.length > 0 && (
                      <span className="px-3 py-1 bg-yellow-100 text-yellow-800 border-2 border-yellow-600 text-sm font-light">
                        {attempt.violations.length} Violation(s)
                      </span>
                    )}
                  </div>
                  {attempt.violations && attempt.violations.length > 0 && (
                    <div className="mt-3 flex flex-col gap-2">
                      <h5 className="text-sm font-medium text-black">
                        Violations:
                      </h5>
                      {attempt.violations.map((violation, idx) => (
                        <div
                          key={idx}
                          className="text-xs font-light bg-gray-50 p-2 border border-gray-300"
                        >
                          <span className="font-medium">{violation.type}:</span>{" "}
                          {violation.details || "No details"}
                          <br />
                          <span className="text-gray-600">
                            {formatTime(violation.timestamp)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Questions and Answers */}
              <div>
                <h3 className="text-2xl font-light text-black mb-6">
                  Questions and Answers
                </h3>
                <div className="flex flex-col gap-4">
                  {quiz.questions.map((question, index) => {
                    const studentAnswer =
                      attempt.answers[index] || "(No answer)";
                    const correctAnswer = question.answer || "";
                    const isCorrect =
                      studentAnswer.toLowerCase().trim() ===
                      correctAnswer?.toLowerCase().trim();

                    return (
                      <div
                        key={index}
                        className="flex flex-col gap-4 p-6 border-2 border-black bg-white"
                      >
                        <div className="flex items-start gap-3">
                          <span className="text-lg font-light text-black min-w-[2rem]">
                            {index + 1}.
                          </span>
                          <div className="flex-1 flex flex-col gap-4">
                            <div>
                              <p className="text-lg font-light text-black mb-2">
                                {question.question}
                              </p>
                              <span className="text-xs font-light text-gray-500 px-2 py-1 bg-gray-100 rounded">
                                {getQuestionTypeLabel(question.type)}
                              </span>
                            </div>

                            {/* Student Answer */}
                            <div className="p-3 bg-gray-50 border border-gray-300">
                              <p className="text-xs font-light text-gray-600 mb-1">
                                Your Answer:
                              </p>
                              <p
                                className={`text-sm font-light ${
                                  isCorrect ? "text-green-600" : "text-red-600"
                                }`}
                              >
                                {studentAnswer}
                              </p>
                            </div>

                            {/* Correct Answer */}
                            {!isCorrect && correctAnswer && (
                              <div className="p-3 bg-green-50 border border-green-300">
                                <p className="text-xs font-light text-gray-600 mb-1">
                                  Correct Answer:
                                </p>
                                <p className="text-sm font-light text-green-600">
                                  {correctAnswer}
                                </p>
                              </div>
                            )}

                            {/* Show choices for multiple choice */}
                            {question.type === "multiple_choice" &&
                              question.choices && (
                                <div className="flex flex-wrap gap-2 ml-4">
                                  {question.choices.map(
                                    (choice, choiceIndex) => {
                                      const isCorrectAnswer =
                                        correctAnswer?.trim().toLowerCase() ===
                                        choice.trim().toLowerCase();
                                      const isStudentAnswer =
                                        studentAnswer?.trim().toLowerCase() ===
                                        choice.trim().toLowerCase();

                                      return (
                                        <div
                                          key={choiceIndex}
                                          className={`px-4 py-2 rounded-full border-2 text-sm font-light ${
                                            isCorrectAnswer
                                              ? "bg-green-100 text-green-800 border-green-600"
                                              : isStudentAnswer
                                                ? "bg-red-100 text-red-800 border-red-600"
                                                : "bg-white text-black border-gray-300"
                                          }`}
                                        >
                                          {choice}
                                        </div>
                                      );
                                    }
                                  )}
                                </div>
                              )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-4 pt-4 border-t-2 border-gray-200">
                <button
                  onClick={goToHistory}
                  className="px-6 py-3 bg-black text-white font-light hover:bg-gray-800 transition-colors"
                >
                  Back to History
                </button>
                <button
                  onClick={() => router.push("/student")}
                  className="px-6 py-3 bg-gray-200 text-black font-light hover:bg-gray-300 transition-colors"
                >
                  Dashboard
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <p className="text-lg font-light text-red-600">
                Attempt details not found
              </p>
              <button
                onClick={goToHistory}
                className="px-6 py-3 bg-gray-200 text-black font-light hover:bg-gray-300 transition-colors"
              >
                Back to History
              </button>
            </div>
          )}
        </div>
      </DashboardLayout>
    </AuthGuard>
  );
}
