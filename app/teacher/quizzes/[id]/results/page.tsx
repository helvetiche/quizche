"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import AuthGuard from "../../../../components/auth/AuthGuard";
import DashboardLayout from "../../../../components/layout/DashboardLayout";
import Loading from "../../../../components/ui/Loading";
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
  description?: string;
  questions: Question[];
  totalQuestions: number;
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

export default function QuizResultsPage() {
  const params = useParams();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingAttempts, setLoadingAttempts] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedAttempt, setExpandedAttempt] = useState<string | null>(null);

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

  useEffect(() => {
    const fetchAttempts = async () => {
      if (!idToken || !params.id) return;

      try {
        setLoadingAttempts(true);

        const response = await fetch(`/api/teacher/quizzes/${params.id}/attempts`, {
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to fetch attempts");
        }

        setAttempts(data.attempts || []);
      } catch (err) {
        console.error("Error fetching attempts:", err);
        setError(err instanceof Error ? err.message : "Failed to load attempts");
      } finally {
        setLoadingAttempts(false);
      }
    };

    fetchAttempts();
  }, [idToken, params.id]);

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

  const getScoreColor = (percentage: number) => {
    if (percentage >= 90) return "text-green-600 bg-green-50";
    if (percentage >= 70) return "text-blue-600 bg-blue-50";
    if (percentage >= 50) return "text-yellow-600 bg-yellow-50";
    return "text-red-600 bg-red-50";
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

  // Calculate statistics
  const stats = attempts.length > 0 ? {
    totalAttempts: attempts.length,
    averageScore: attempts.reduce((sum, a) => sum + a.percentage, 0) / attempts.length,
    disqualifiedCount: attempts.filter(a => a.disqualified).length,
    averageTimeSpent: attempts.reduce((sum, a) => sum + a.timeSpent, 0) / attempts.length,
  } : null;

  if (loading && !idToken) {
    return <Loading />;
  }

  return (
    <AuthGuard requiredRole="teacher" onAuthSuccess={setUser}>
      <DashboardLayout
        title="QuizChe - Quiz Results"
        userEmail={user?.email}
        userRole="teacher"
      >
        <div className="flex flex-col gap-8">
          {error ? (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <p className="text-lg font-light text-red-600">{error}</p>
              <Link
                href={`/teacher/quizzes/${params.id}`}
                className="px-6 py-3 bg-gray-200 text-black font-light hover:bg-gray-300 transition-colors"
              >
                Back to Quiz
              </Link>
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-black font-light">Loading quiz...</div>
            </div>
          ) : quiz ? (
            <>
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-light text-black">
                    Quiz Results
                  </h1>
                  <h2 className="text-xl font-light text-gray-600 mt-2">
                    {quiz.title}
                  </h2>
                </div>
                <Link
                  href={`/teacher/quizzes/${params.id}`}
                  className="px-4 py-2 bg-gray-200 text-black font-light hover:bg-gray-300 transition-colors"
                >
                  Back to Quiz
                </Link>
              </div>

              {/* Statistics */}
              {stats && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
                      Total Attempts
                    </h3>
                    <p className="text-3xl font-light text-black mt-2">
                      {stats.totalAttempts}
                    </p>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
                      Average Score
                    </h3>
                    <p className="text-3xl font-light text-black mt-2">
                      {stats.averageScore.toFixed(1)}%
                    </p>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
                      Disqualified
                    </h3>
                    <p className="text-3xl font-light text-black mt-2">
                      {stats.disqualifiedCount}
                    </p>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
                      Avg. Time Spent
                    </h3>
                    <p className="text-3xl font-light text-black mt-2">
                      {formatTimeSpent(Math.floor(stats.averageTimeSpent))}
                    </p>
                  </div>
                </div>
              )}

              {/* Student Attempts */}
              <div>
                <h3 className="text-2xl font-light text-black mb-6">
                  Student Attempts ({attempts.length})
                </h3>

                {loadingAttempts ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="bg-white border border-gray-200 rounded-lg p-6 animate-pulse"
                      >
                        <div className="h-5 bg-gray-200 rounded w-3/4 mb-2"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                      </div>
                    ))}
                  </div>
                ) : attempts.length === 0 ? (
                  <div className="text-center py-12 bg-white border border-gray-200 rounded-lg">
                    <p className="text-lg font-light text-gray-600">
                      No attempts yet. Students haven't taken this quiz.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {attempts.map((attempt) => {
                      const isExpanded = expandedAttempt === attempt.id;

                      return (
                        <div
                          key={attempt.id}
                          className="bg-white border-2 border-black rounded-lg overflow-hidden"
                        >
                          <div
                            className="p-6 cursor-pointer hover:bg-gray-50 transition-colors"
                            onClick={() =>
                              setExpandedAttempt(
                                isExpanded ? null : attempt.id
                              )
                            }
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <h4 className="text-lg font-light text-black">
                                    {attempt.studentName}
                                  </h4>
                                  <span className="text-sm font-light text-gray-600">
                                    ({attempt.studentEmail})
                                  </span>
                                  {(attempt.disqualified ||
                                    attempt.tabChangeCount ||
                                    attempt.timeAway ||
                                    attempt.refreshDetected) && (
                                    <span className="px-2 py-1 text-xs font-light bg-red-100 text-red-800 border border-red-600">
                                      Integrity Issues
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-4 text-sm font-light text-gray-600">
                                  <span>
                                    Completed on{" "}
                                    {new Date(
                                      attempt.completedAt
                                    ).toLocaleDateString("en-US", {
                                      year: "numeric",
                                      month: "long",
                                      day: "numeric",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </span>
                                  <span>•</span>
                                  <span>
                                    Time spent:{" "}
                                    {formatTimeSpent(attempt.timeSpent)}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-4">
                                <div
                                  className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-light ${getScoreColor(
                                    attempt.percentage
                                  )}`}
                                >
                                  {attempt.score}/{attempt.totalQuestions} (
                                  {attempt.percentage.toFixed(1)}%)
                                </div>
                                <button
                                  className="px-4 py-2 bg-black text-white font-light hover:bg-gray-800 transition-colors"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setExpandedAttempt(
                                      isExpanded ? null : attempt.id
                                    );
                                  }}
                                >
                                  {isExpanded ? "Hide Details" : "View Details"}
                                </button>
                              </div>
                            </div>

                            {/* Progress Bar */}
                            <div className="mt-4">
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full ${
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
                          </div>

                          {/* Expanded Details */}
                          {isExpanded && quiz && (
                            <div className="border-t-2 border-black p-6 bg-gray-50">
                              {/* Cheating Indicators */}
                              {(attempt.tabChangeCount !== undefined ||
                                attempt.timeAway !== undefined ||
                                attempt.refreshDetected ||
                                attempt.disqualified ||
                                (attempt.violations &&
                                  attempt.violations.length > 0)) && (
                                <div className="p-4 bg-white border-2 border-red-600 mb-6">
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
                                    {attempt.timeAway !== undefined &&
                                      attempt.timeAway > 0 && (
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
                                    {attempt.violations &&
                                      attempt.violations.length > 0 && (
                                        <span className="px-3 py-1 bg-yellow-100 text-yellow-800 border-2 border-yellow-600 text-sm font-light">
                                          {attempt.violations.length} Violation(s)
                                        </span>
                                      )}
                                  </div>
                                  {attempt.violations &&
                                    attempt.violations.length > 0 && (
                                      <div className="mt-3 flex flex-col gap-2">
                                        <h5 className="text-sm font-medium text-black">
                                          Violations:
                                        </h5>
                                        {attempt.violations.map(
                                          (violation, idx) => (
                                            <div
                                              key={idx}
                                              className="text-xs font-light bg-gray-50 p-2 border border-gray-300"
                                            >
                                              <span className="font-medium">
                                                {violation.type}:
                                              </span>{" "}
                                              {violation.details ||
                                                "No details"}
                                              <br />
                                              <span className="text-gray-600">
                                                {formatTime(violation.timestamp)}
                                              </span>
                                            </div>
                                          )
                                        )}
                                      </div>
                                    )}
                                </div>
                              )}

                              {/* Questions and Answers */}
                              <div>
                                <h4 className="text-xl font-light text-black mb-4">
                                  Questions and Answers
                                </h4>
                                <div className="flex flex-col gap-4">
                                  {quiz.questions.map((question, index) => {
                                    const studentAnswer =
                                      attempt.answers[index] || "(No answer)";
                                    const correctAnswer = question.answer || "";
                                    const isCorrect =
                                      correctAnswer &&
                                      studentAnswer
                                        .toLowerCase()
                                        .trim() ===
                                        correctAnswer.toLowerCase().trim();

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
                                                {getQuestionTypeLabel(
                                                  question.type
                                                )}
                                              </span>
                                            </div>

                                            {/* Student Answer */}
                                            <div className="p-3 bg-gray-50 border border-gray-300">
                                              <p className="text-xs font-light text-gray-600 mb-1">
                                                Student Answer:
                                              </p>
                                              <p
                                                className={`text-sm font-light ${
                                                  isCorrect
                                                    ? "text-green-600"
                                                    : "text-red-600"
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
                                            {question.type ===
                                              "multiple_choice" &&
                                              question.choices && (
                                                <div className="flex flex-wrap gap-2 ml-4">
                                                  {question.choices.map(
                                                    (choice, choiceIndex) => {
                                                      const isCorrectAnswer =
                                                        correctAnswer &&
                                                        correctAnswer
                                                          .trim()
                                                          .toLowerCase() ===
                                                          choice
                                                            .trim()
                                                            .toLowerCase();
                                                      const isStudentAnswer =
                                                        studentAnswer &&
                                                        studentAnswer
                                                          .trim()
                                                          .toLowerCase() ===
                                                          choice
                                                            .trim()
                                                            .toLowerCase();

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
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>
      </DashboardLayout>
    </AuthGuard>
  );
}
