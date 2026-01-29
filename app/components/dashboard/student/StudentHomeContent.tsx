"use client";

import { useState, useEffect } from "react";
import { getAuth } from "firebase/auth";
import app from "@/lib/firebase";
import { useTabContext } from "../TabContext";

type QuizAttempt = {
  id: string;
  quizTitle: string;
  score: number;
  totalQuestions: number;
  percentage: number;
  completedAt: string;
};

type DashboardStats = {
  totalQuizzes: number;
  averageScore: number;
  recentAttempts: QuizAttempt[];
};

type StudentHomeContentProps = {
  user: any;
};

export default function StudentHomeContent({ user }: StudentHomeContentProps) {
  const { setActiveTab } = useTabContext();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardStats = async () => {
      if (!user) return;

      try {
        const auth = getAuth(app);
        const currentUser = auth.currentUser;
        if (!currentUser) return;

        const idToken = await currentUser.getIdToken();

        const response = await fetch("/api/users/history?limit=5", {
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setStats(data.stats);
        }
      } catch (error) {
        console.error("Error fetching dashboard stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardStats();
  }, [user]);

  const navigationCards = [
    {
      title: "Quizzes",
      description: "View and take assigned quizzes",
      tab: "quizzes" as const,
      icon: (
        <svg
          className="w-12 h-12 text-blue-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      ),
      color: "bg-blue-50 border-blue-200 hover:bg-blue-100",
    },
    {
      title: "Flashcards",
      description: "Create and study flashcard sets",
      tab: "flashcards" as const,
      icon: (
        <svg
          className="w-12 h-12 text-green-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
          />
        </svg>
      ),
      color: "bg-green-50 border-green-200 hover:bg-green-100",
    },
    {
      title: "Quiz History",
      description: "Review all your quiz attempts and track your progress",
      tab: "history" as const,
      icon: (
        <svg
          className="w-12 h-12 text-purple-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
      ),
      color: "bg-purple-50 border-purple-200 hover:bg-purple-100",
    },
  ];

  return (
    <div className="flex flex-col gap-8">
      {/* Welcome Section */}
      <div>
        <h1 className="text-3xl font-light text-black">
          Welcome back, Student
        </h1>
        <p className="text-lg text-gray-600 mt-2">
          Ready to study? Create flashcards or review your quiz performance.
        </p>
      </div>

      {/* Stats Overview */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white border border-gray-200 rounded-lg p-6 animate-pulse"
            >
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-8 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
              Total Quizzes Taken
            </h3>
            <p className="text-3xl font-light text-black mt-2">
              {stats.totalQuizzes}
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
              Recent Attempts
            </h3>
            <p className="text-3xl font-light text-black mt-2">
              {stats.recentAttempts.length}
            </p>
          </div>
        </div>
      ) : null}

      {/* Quick Actions */}
      <div>
        <h2 className="text-2xl font-light text-black mb-6">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {navigationCards.map((card) => (
            <button
              key={card.tab}
              onClick={() => setActiveTab(card.tab)}
              className={`flex items-start gap-4 p-6 border rounded-lg text-left transition-all duration-200 hover:shadow-md ${card.color}`}
            >
              <div className="flex-shrink-0">{card.icon}</div>
              <div>
                <h3 className="text-xl font-medium text-black mb-2">
                  {card.title}
                </h3>
                <p className="text-gray-600">{card.description}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Recent Quiz Results */}
      {stats && stats.recentAttempts.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-light text-black">
              Recent Quiz Results
            </h2>
            <button
              onClick={() => setActiveTab("history")}
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              View All →
            </button>
          </div>
          <div className="space-y-4">
            {stats.recentAttempts.map((attempt) => (
              <div
                key={attempt.id}
                className="bg-white border border-gray-200 rounded-lg p-6"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium text-black">
                      {attempt.quizTitle}
                    </h3>
                    <p className="text-sm text-gray-500">
                      Completed on{" "}
                      {new Date(attempt.completedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-light text-black">
                      {attempt.score}/{attempt.totalQuestions}
                    </p>
                    <p className="text-sm text-gray-500">
                      {attempt.percentage.toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
