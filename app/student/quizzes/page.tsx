"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import AuthGuard from "../../components/auth/AuthGuard";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { getAuth } from "firebase/auth";
import app from "@/lib/firebase";

interface AssignedQuiz {
  id: string;
  title: string;
  description?: string;
  totalQuestions: number;
  duration?: number;
  availableDate?: string;
  dueDate?: string;
  allowRetake: boolean;
  showResults: boolean;
  createdAt: string;
}

export default function StudentQuizzesPage() {
  const [user, setUser] = useState<any>(null);
  const [assignedQuizzes, setAssignedQuizzes] = useState<AssignedQuiz[]>([]);
  const [attemptedQuizIds, setAttemptedQuizIds] = useState<Set<string>>(
    new Set()
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAssignedQuizzes = async () => {
      if (!user) return;

      try {
        const auth = getAuth(app);
        const currentUser = auth.currentUser;
        if (!currentUser) return;

        const idToken = await currentUser.getIdToken();

        const response = await fetch("/api/student/quizzes", {
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setAssignedQuizzes(data.quizzes || []);
        }

        // Fetch quiz history to check which quizzes have been taken
        const historyResponse = await fetch("/api/users/history", {
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        });

        if (historyResponse.ok) {
          const historyData = await historyResponse.json();
          const attemptedIds = new Set<string>(
            (historyData.attempts || []).map((attempt: any) =>
              String(attempt.quizId || "")
            )
          );
          setAttemptedQuizIds(attemptedIds);
        }
      } catch (error) {
        console.error("Error fetching assigned quizzes:", error);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchAssignedQuizzes();
    }
  }, [user]);

  return (
    <AuthGuard requiredRole="student" onAuthSuccess={setUser}>
      <DashboardLayout
        title="QuizChe - My Quizzes"
        userEmail={user?.email}
        userRole="student"
      >
        <div className="flex flex-col gap-8">
          <div>
            <h2 className="text-3xl font-light text-black">Assigned Quizzes</h2>
            <p className="text-lg text-gray-600 mt-2">
              Take quizzes assigned by your teachers
            </p>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="bg-white border border-gray-200 rounded-lg p-6 animate-pulse"
                >
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          ) : assignedQuizzes.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
              <p className="text-gray-600 font-light">
                No quizzes assigned yet. Your teacher will assign quizzes to
                your sections.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {assignedQuizzes.map((quiz) => {
                const now = new Date();
                const availableDate = quiz.availableDate
                  ? new Date(quiz.availableDate)
                  : null;
                const dueDate = quiz.dueDate ? new Date(quiz.dueDate) : null;
                const isAvailable = !availableDate || now >= availableDate;
                const isOverdue = dueDate && now > dueDate;
                const hasTaken = attemptedQuizIds.has(quiz.id);

                return (
                  <div
                    key={quiz.id}
                    className="bg-white border-2 border-black rounded-lg p-6 hover:shadow-lg transition-shadow"
                  >
                    <div className="flex flex-col gap-4">
                      <div>
                        <h3 className="text-xl font-light text-black mb-2">
                          {quiz.title}
                        </h3>
                        {quiz.description && (
                          <p className="text-sm font-light text-gray-600 line-clamp-2">
                            {quiz.description}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-col gap-2 text-sm font-light text-gray-600">
                        <div className="flex items-center justify-between">
                          <span>Questions:</span>
                          <span className="text-black">
                            {quiz.totalQuestions}
                          </span>
                        </div>
                        {quiz.duration && (
                          <div className="flex items-center justify-between">
                            <span>Duration:</span>
                            <span className="text-black">
                              {quiz.duration} min
                            </span>
                          </div>
                        )}
                        {dueDate && (
                          <div className="flex items-center justify-between">
                            <span>Due:</span>
                            <span
                              className={`${
                                isOverdue ? "text-red-600" : "text-black"
                              }`}
                            >
                              {dueDate.toLocaleDateString()}
                            </span>
                          </div>
                        )}
                      </div>

                      {!isAvailable || isOverdue || hasTaken ? (
                        <div
                          className={`px-4 py-2 text-center font-light ${
                            !isAvailable || isOverdue || hasTaken
                              ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                              : ""
                          }`}
                        >
                          {hasTaken
                            ? "Already Taken"
                            : !isAvailable
                            ? "Not Available Yet"
                            : isOverdue
                            ? "Overdue"
                            : "Take Quiz"}
                        </div>
                      ) : (
                        <Link
                          href={`/student/quizzes/${quiz.id}`}
                          className="px-4 py-2 text-center font-light bg-black text-white hover:bg-gray-800 transition-colors"
                          aria-label={`Take quiz: ${quiz.title}`}
                        >
                          Take Quiz
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DashboardLayout>
    </AuthGuard>
  );
}
