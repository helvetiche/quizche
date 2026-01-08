"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getAuth } from "firebase/auth";
import app from "@/lib/firebase";

interface Violation {
  type: string;
  timestamp: string;
  details?: string;
}

interface QuizAttempt {
  id: string;
  quizId: string;
  quizTitle: string;
  teacherId: string;
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

interface HistoryData {
  attempts: QuizAttempt[];
  stats: {
    totalQuizzes: number;
    averageScore: number;
    recentAttempts: QuizAttempt[];
  };
  pagination: {
    page: number;
    limit: number;
    hasMore: boolean;
  };
}

interface StudentHistoryContentProps {
  user: any;
}

export default function StudentHistoryContent({ user }: StudentHistoryContentProps) {
  const router = useRouter();
  const [history, setHistory] = useState<HistoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchHistory = async (page: number = 1) => {
    if (!user) return;

    try {
      const auth = getAuth(app);
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      const idToken = await currentUser.getIdToken();

      const response = await fetch(`/api/users/history?limit=20`, {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setHistory(data);
      }
    } catch (error) {
      console.error("Error fetching quiz history:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory(currentPage);
  }, [user, currentPage]);

  const getScoreColor = (percentage: number) => {
    if (percentage >= 90) return "text-green-600 bg-green-50";
    if (percentage >= 70) return "text-blue-600 bg-blue-50";
    if (percentage >= 50) return "text-yellow-600 bg-yellow-50";
    return "text-red-600 bg-red-50";
  };

  const formatTimeSpent = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${remainingSeconds}s`;
  };

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-light text-black">Quiz History</h1>
        <p className="text-lg font-light text-gray-600 mt-2">
          Review all your quiz attempts and track your progress over time.
        </p>
      </div>

      {/* Stats Cards */}
      {history && !loading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
              Total Quizzes Completed
            </h3>
            <p className="text-3xl font-light text-black mt-2">
              {history.stats.totalQuizzes}
            </p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
              Average Score
            </h3>
            <p className="text-3xl font-light text-black mt-2">
              {history.stats.averageScore.toFixed(1)}%
            </p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
              Best Performance
            </h3>
            <p className="text-3xl font-light text-black mt-2">
              {history.attempts.length > 0
                ? Math.max(
                    ...history.attempts.map((a) => a.percentage)
                  ).toFixed(1)
                : "0.0"}
              %
            </p>
          </div>
        </div>
      )}

      {/* Quiz Attempts List */}
      <div>
        <h2 className="text-2xl font-light text-black mb-6">
          Your Quiz Attempts
        </h2>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="bg-white border border-gray-200 rounded-lg p-6 animate-pulse"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="h-5 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  </div>
                  <div className="h-8 bg-gray-200 rounded w-16"></div>
                </div>
              </div>
            ))}
          </div>
        ) : history && history.attempts.length > 0 ? (
          <div className="space-y-4">
            {history.attempts.map((attempt) => (
              <div
                key={attempt.id}
                className="bg-white border-2 border-black rounded-lg p-6"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-light text-black">
                        {attempt.quizTitle}
                      </h3>
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
                        {new Date(attempt.completedAt).toLocaleDateString(
                          "en-US",
                          {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          }
                        )}
                      </span>
                      <span>•</span>
                      <span>
                        Time spent: {formatTimeSpent(attempt.timeSpent)}
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
                      onClick={() =>
                        router.push(`/student/history/${attempt.id}`)
                      }
                    >
                      View Details
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
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <svg
              className="mx-auto h-24 w-24 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900">
              No quiz attempts yet
            </h3>
            <p className="mt-2 text-gray-500">
              You haven't taken any quizzes yet. Start by scanning a QR code
              to access a quiz!
            </p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {history && history.pagination.hasMore && (
        <div className="flex justify-center">
          <button
            onClick={() => setCurrentPage((prev) => prev + 1)}
            className="px-4 py-2 bg-gray-200 text-black font-light hover:bg-gray-300 transition-colors"
          >
            Load More
          </button>
        </div>
      )}
    </div>
  );
}
