/* eslint-disable @typescript-eslint/strict-boolean-expressions, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unnecessary-condition, @typescript-eslint/prefer-nullish-coalescing, @typescript-eslint/explicit-function-return-type, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getAuth } from "firebase/auth";
import app from "@/lib/firebase";

type Violation = {
  type: string;
  timestamp: string;
  details?: string;
};

type QuizAttempt = {
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
};

type HistoryData = {
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
};

type StudentHistoryContentProps = {
  user: any;
};

export default function StudentHistoryContent({
  user,
}: StudentHistoryContentProps) {
  const router = useRouter();
  const [history, setHistory] = useState<HistoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchHistory = useCallback(
    async (page = 1): Promise<void> => {
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

        if (response.ok !== undefined && response.ok !== null) {
          const data = await response.json();
          setHistory(data);
        }
      } catch (error) {
        console.error("Error fetching quiz history:", error);
      } finally {
        setLoading(false);
      }
    },
    [user]
  );

  useEffect(() => {
    void fetchHistory(currentPage);
  }, [fetchHistory, currentPage]);

  const getScoreBadgeStyle = (percentage: number): string => {
    if (percentage >= 90) return "bg-green-400 text-gray-900";
    if (percentage >= 70) return "bg-blue-300 text-gray-900";
    if (percentage >= 50) return "bg-yellow-300 text-gray-900";
    return "bg-red-400 text-gray-900";
  };

  const formatTimeSpent = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${remainingSeconds}s`;
  };

  return (
    <div className="flex flex-col gap-8 max-w-5xl mx-auto">
      {/* Title Section */}
      <div className="flex flex-col gap-3 text-center mb-2">
        <h1 className="text-5xl font-black text-gray-900 tracking-tight">
          Quiz History
        </h1>
        <div className="flex gap-1.5 justify-center mb-1">
          <div className="w-4 h-4 bg-red-500 rounded-full border-2 border-gray-900"></div>
          <div className="w-4 h-4 bg-yellow-400 rounded-full border-2 border-gray-900"></div>
          <div className="w-4 h-4 bg-green-500 rounded-full border-2 border-gray-900"></div>
        </div>
        <p className="text-lg font-medium text-gray-700">
          Review all your quiz attempts, scores, and performance over time.
        </p>
      </div>

      {/* Stats Cards */}
      {history && !loading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-amber-100 border-3 border-gray-900 rounded-3xl p-6 shadow-[6px_6px_0px_0px_rgba(31,41,55,1)] flex items-center justify-between">
            <div>
              <p className="text-xs font-black uppercase text-gray-700 tracking-wider mb-1">
                Completed
              </p>
              <p className="text-4xl font-black text-gray-900">
                {history.stats.totalQuizzes}
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-200 border-2 border-gray-900 flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <span className="material-icons-outlined text-2xl text-gray-900">
                task_alt
              </span>
            </div>
          </div>

          <div className="bg-amber-100 border-3 border-gray-900 rounded-3xl p-6 shadow-[6px_6px_0px_0px_rgba(31,41,55,1)] flex items-center justify-between">
            <div>
              <p className="text-xs font-black uppercase text-gray-700 tracking-wider mb-1">
                Average Score
              </p>
              <p className="text-4xl font-black text-gray-900">
                {history.stats.averageScore.toFixed(1)}%
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-200 border-2 border-gray-900 flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <span className="material-icons-outlined text-2xl text-gray-900">
                insights
              </span>
            </div>
          </div>

          <div className="bg-amber-100 border-3 border-gray-900 rounded-3xl p-6 shadow-[6px_6px_0px_0px_rgba(31,41,55,1)] flex items-center justify-between">
            <div>
              <p className="text-xs font-black uppercase text-gray-700 tracking-wider mb-1">
                Best Score
              </p>
              <p className="text-4xl font-black text-gray-900">
                {history.attempts.length > 0
                  ? Math.max(
                      ...history.attempts.map((a) => a.percentage)
                    ).toFixed(1)
                  : "0.0"}
                %
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-200 border-2 border-gray-900 flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <span className="material-icons-outlined text-2xl text-gray-900">
                emoji_events
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Quiz Attempts List */}
      <div>
        <h2 className="text-2xl font-black text-gray-900 mb-6 flex items-center gap-2">
          <span className="material-icons-outlined text-2xl text-gray-900">
            history
          </span>
          Your Quiz Attempts
        </h2>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-amber-50 border-3 border-gray-900 rounded-3xl p-6 shadow-[4px_4px_0px_0px_rgba(31,41,55,1)] animate-pulse space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div className="h-6 bg-gray-300 rounded-full w-1/3 border border-gray-900"></div>
                  <div className="h-8 bg-gray-300 rounded-full w-24 border border-gray-900"></div>
                </div>
                <div className="h-3 bg-gray-300 rounded-full w-full border border-gray-900"></div>
              </div>
            ))}
          </div>
        ) : history && history.attempts.length > 0 ? (
          <div className="space-y-5">
            {history.attempts.map((attempt) => (
              <div
                key={attempt.id}
                className="bg-amber-50 border-3 border-gray-900 rounded-3xl p-6 shadow-[5px_5px_0px_0px_rgba(31,41,55,1)] hover:shadow-[7px_7px_0px_0px_rgba(31,41,55,1)] hover:-translate-y-0.5 transition-all"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <h3 className="text-xl font-black text-gray-900">
                        {attempt.quizTitle}
                      </h3>
                      {(attempt.disqualified ||
                        attempt.tabChangeCount ||
                        attempt.timeAway ||
                        attempt.refreshDetected) && (
                        <span className="px-3 py-0.5 text-xs font-black bg-red-400 text-gray-900 border-2 border-gray-900 rounded-full shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                          Integrity Flagged
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-xs font-bold text-gray-700 flex-wrap">
                      <span className="flex items-center gap-1">
                        <span className="material-icons-outlined text-sm">
                          event
                        </span>
                        {new Date(attempt.completedAt).toLocaleDateString(
                          "en-US",
                          {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          }
                        )}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <span className="material-icons-outlined text-sm">
                          timer
                        </span>
                        {formatTimeSpent(attempt.timeSpent)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div
                      className={`px-4 py-1.5 border-2 border-gray-900 rounded-full font-black text-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${getScoreBadgeStyle(
                        attempt.percentage
                      )}`}
                    >
                      {attempt.score}/{attempt.totalQuestions} (
                      {attempt.percentage.toFixed(1)}%)
                    </div>
                    <button
                      className="px-5 py-2 bg-gray-900 text-amber-100 font-black text-xs rounded-full border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(251,191,36,1)] hover:bg-gray-800 hover:-translate-y-0.5 transition-all flex items-center gap-1"
                      onClick={() =>
                        router.push(`/student/history/${attempt.id}`)
                      }
                    >
                      <span>View Details</span>
                      <span className="material-icons-outlined text-sm">
                        arrow_forward
                      </span>
                    </button>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mt-4 pt-3 border-t-2 border-gray-900/10">
                  <div className="w-full bg-amber-100 border-2 border-gray-900 rounded-full h-3 overflow-hidden p-0.5">
                    <div
                      className={`h-full rounded-full ${
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
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-amber-100 border-3 border-gray-900 rounded-3xl shadow-[8px_8px_0px_0px_rgba(31,41,55,1)] max-w-2xl mx-auto">
            <div className="w-20 h-20 bg-white rounded-full border-3 border-gray-900 flex items-center justify-center mb-6 shadow-[4px_4px_0px_0px_rgba(31,41,55,1)]">
              <span className="material-icons-outlined text-4xl text-gray-400">
                history_toggle_off
              </span>
            </div>
            <h3 className="text-2xl font-black text-gray-900 mb-2">
              No Quiz Attempts Yet
            </h3>
            <p className="text-gray-700 font-medium max-w-md">
              You haven&apos;t taken any quizzes yet. Complete your assigned quizzes to see your history and stats here!
            </p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {history?.pagination.hasMore !== undefined &&
        history.pagination.hasMore !== null && (
          <div className="flex justify-center mt-4">
            <button
              onClick={() => setCurrentPage((prev) => prev + 1)}
              className="px-8 py-3 bg-amber-100 text-gray-900 font-black border-3 border-gray-900 rounded-full shadow-[4px_4px_0px_0px_rgba(31,41,55,1)] hover:shadow-[5px_5px_0px_0px_rgba(31,41,55,1)] hover:-translate-y-0.5 transition-all flex items-center gap-2"
            >
              <span className="material-icons-outlined text-xl">expand_more</span>
              Load More Attempts
            </button>
          </div>
        )}
    </div>
  );
}
