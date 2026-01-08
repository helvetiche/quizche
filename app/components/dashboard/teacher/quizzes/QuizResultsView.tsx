"use client";

import { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useQuizView } from "./QuizViewContext";

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

interface QuizResultsViewProps {
  quizId: string;
}

export default function QuizResultsView({ quizId }: QuizResultsViewProps) {
  const { goToDetail } = useQuizView();
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
      if (!idToken || !quizId) return;

      try {
        setLoading(true);
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
  }, [idToken, quizId]);

  const formatTimeSpent = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return minutes > 0 ? `${minutes}m ${remainingSeconds}s` : `${remainingSeconds}s`;
  };

  const getScoreColor = (percentage: number) => {
    if (percentage >= 90) return "bg-lime-400";
    if (percentage >= 70) return "bg-cyan-400";
    if (percentage >= 50) return "bg-orange-400";
    return "bg-red-400";
  };

  const stats = attempts.length > 0 ? {
    totalAttempts: attempts.length,
    averageScore: attempts.reduce((sum, a) => sum + a.percentage, 0) / attempts.length,
    disqualifiedCount: attempts.filter(a => a.disqualified).length,
    averageTimeSpent: attempts.reduce((sum, a) => sum + a.timeSpent, 0) / attempts.length,
  } : null;

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
          onClick={() => goToDetail(quizId)}
          className="px-6 py-3 bg-white text-gray-900 font-bold border-3 border-gray-900 shadow-[3px_3px_0px_0px_rgba(31,41,55,1)] hover:shadow-[4px_4px_0px_0px_rgba(31,41,55,1)] transition-all"
        >
          Back to Quiz
        </button>
      </div>
    );
  }

  if (!quiz) return null;

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-purple-400 rounded-xl flex items-center justify-center border-3 border-gray-900 shadow-[3px_3px_0px_0px_rgba(31,41,55,1)]">
            <span className="material-icons-outlined text-gray-900 text-2xl">analytics</span>
          </div>
          <div>
            <h2 className="text-3xl font-black text-gray-900">Quiz Results</h2>
            <p className="text-sm font-bold text-gray-600">[ {quiz.title} ]</p>
          </div>
        </div>
        <button
          onClick={() => goToDetail(quizId)}
          className="px-4 py-2 bg-amber-200 text-gray-900 font-bold border-3 border-gray-900 shadow-[3px_3px_0px_0px_rgba(31,41,55,1)] hover:shadow-[4px_4px_0px_0px_rgba(31,41,55,1)] active:shadow-[1px_1px_0px_0px_rgba(31,41,55,1)] transition-all flex items-center gap-2"
        >
          <span className="material-icons-outlined text-lg">arrow_back</span>
          <span>Back to Quiz</span>
        </button>
      </div>

      {/* Stats Grid */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-cyan-400 border-4 border-gray-900 p-5 shadow-[4px_4px_0px_0px_rgba(31,41,55,1)]">
            <div className="flex items-center gap-2 mb-2">
              <span className="material-icons-outlined text-gray-900">people</span>
              <span className="text-xs font-bold text-gray-800 uppercase">Total Attempts</span>
            </div>
            <p className="text-4xl font-black text-gray-900">{stats.totalAttempts}</p>
          </div>
          <div className="bg-lime-400 border-4 border-gray-900 p-5 shadow-[4px_4px_0px_0px_rgba(31,41,55,1)]">
            <div className="flex items-center gap-2 mb-2">
              <span className="material-icons-outlined text-gray-900">trending_up</span>
              <span className="text-xs font-bold text-gray-800 uppercase">Average Score</span>
            </div>
            <p className="text-4xl font-black text-gray-900">{stats.averageScore.toFixed(1)}%</p>
          </div>
          <div className="bg-red-400 border-4 border-gray-900 p-5 shadow-[4px_4px_0px_0px_rgba(31,41,55,1)]">
            <div className="flex items-center gap-2 mb-2">
              <span className="material-icons-outlined text-gray-900">gpp_bad</span>
              <span className="text-xs font-bold text-gray-800 uppercase">Disqualified</span>
            </div>
            <p className="text-4xl font-black text-gray-900">{stats.disqualifiedCount}</p>
          </div>
          <div className="bg-orange-400 border-4 border-gray-900 p-5 shadow-[4px_4px_0px_0px_rgba(31,41,55,1)]">
            <div className="flex items-center gap-2 mb-2">
              <span className="material-icons-outlined text-gray-900">schedule</span>
              <span className="text-xs font-bold text-gray-800 uppercase">Avg. Time</span>
            </div>
            <p className="text-4xl font-black text-gray-900">{formatTimeSpent(Math.floor(stats.averageTimeSpent))}</p>
          </div>
        </div>
      )}

      {/* Attempts List */}
      <div>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-gray-900 rounded-lg flex items-center justify-center">
            <span className="material-icons-outlined text-amber-100 text-xl">list_alt</span>
          </div>
          <h3 className="text-2xl font-black text-gray-900">Student Attempts ({attempts.length})</h3>
        </div>

        {loadingAttempts ? (
          <div className="flex flex-col gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white border-4 border-gray-900 p-6 shadow-[4px_4px_0px_0px_rgba(31,41,55,1)] animate-pulse">
                <div className="h-6 bg-gray-200 rounded w-3/4 mb-3"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : attempts.length === 0 ? (
          <div className="bg-amber-200 border-4 border-gray-900 p-12 shadow-[4px_4px_0px_0px_rgba(31,41,55,1)] flex flex-col items-center justify-center gap-4">
            <div className="w-16 h-16 bg-purple-400 rounded-full flex items-center justify-center border-3 border-gray-900">
              <span className="material-icons-outlined text-gray-900 text-3xl">hourglass_empty</span>
            </div>
            <p className="text-lg font-bold text-gray-900 text-center">No attempts yet.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {attempts.map((attempt, index) => {
              const isExpanded = expandedAttempt === attempt.id;
              const colors = ["bg-cyan-400", "bg-pink-400", "bg-lime-400", "bg-orange-400", "bg-purple-400"];
              const headerColor = colors[index % colors.length];

              return (
                <div key={attempt.id} className="bg-white border-4 border-gray-900 shadow-[4px_4px_0px_0px_rgba(31,41,55,1)] overflow-hidden">
                  {/* Attempt Header */}
                  <div
                    className={`${headerColor} border-b-4 border-gray-900 p-5 cursor-pointer hover:brightness-105 transition-all`}
                    onClick={() => setExpandedAttempt(isExpanded ? null : attempt.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                          <h4 className="text-xl font-black text-gray-900">{attempt.studentName}</h4>
                          <span className="text-sm font-bold text-gray-700">({attempt.studentEmail})</span>
                          {(attempt.disqualified || attempt.tabChangeCount || attempt.timeAway || attempt.refreshDetected) && (
                            <span className="px-2 py-1 text-xs font-bold bg-red-500 text-white border-2 border-gray-900">
                              ⚠ INTEGRITY ISSUES
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-sm font-medium text-gray-800 flex-wrap">
                          <span className="flex items-center gap-1">
                            <span className="material-icons-outlined text-sm">calendar_today</span>
                            {new Date(attempt.completedAt).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <span className="material-icons-outlined text-sm">schedule</span>
                            {formatTimeSpent(attempt.timeSpent)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className={`${getScoreColor(attempt.percentage)} px-4 py-2 border-3 border-gray-900`}>
                          <span className="text-2xl font-black text-gray-900">{attempt.percentage.toFixed(0)}%</span>
                        </div>
                        <div className="w-10 h-10 bg-gray-900 rounded-lg flex items-center justify-center">
                          <span className={`material-icons-outlined text-amber-100 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                            expand_more
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-4 bg-white border-2 border-gray-900 h-4 overflow-hidden">
                      <div
                        className={`h-full ${getScoreColor(attempt.percentage)} transition-all`}
                        style={{ width: `${attempt.percentage}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="p-6 bg-amber-50">
                      <div className="flex items-center gap-2 mb-4">
                        <span className="material-icons-outlined text-gray-900">quiz</span>
                        <h4 className="text-lg font-black text-gray-900">Questions and Answers</h4>
                      </div>
                      <div className="flex flex-col gap-4">
                        {quiz.questions.map((question, qIndex) => {
                          const studentAnswer = attempt.answers[qIndex] || "(No answer)";
                          const correctAnswer = question.answer || "";
                          const isCorrect = correctAnswer && studentAnswer.toLowerCase().trim() === correctAnswer.toLowerCase().trim();

                          return (
                            <div key={qIndex} className="bg-white border-3 border-gray-900 overflow-hidden">
                              <div className={`${isCorrect ? 'bg-lime-400' : 'bg-red-400'} border-b-3 border-gray-900 px-4 py-2 flex items-center gap-2`}>
                                <div className="w-7 h-7 bg-white rounded-full flex items-center justify-center border-2 border-gray-900">
                                  <span className="font-black text-gray-900 text-sm">{qIndex + 1}</span>
                                </div>
                                <span className="material-icons-outlined text-gray-900">
                                  {isCorrect ? 'check_circle' : 'cancel'}
                                </span>
                                <span className="font-bold text-gray-900 text-sm">
                                  {isCorrect ? 'CORRECT' : 'INCORRECT'}
                                </span>
                              </div>
                              <div className="p-4">
                                <p className="font-medium text-gray-900 mb-4">{question.question}</p>
                                <div className="flex flex-col gap-3">
                                  <div className={`p-3 border-2 border-gray-900 ${isCorrect ? 'bg-lime-100' : 'bg-red-100'}`}>
                                    <p className="text-xs font-bold text-gray-700 mb-1">STUDENT ANSWER:</p>
                                    <p className="font-medium text-gray-900">{studentAnswer}</p>
                                  </div>
                                  {!isCorrect && correctAnswer && (
                                    <div className="p-3 border-2 border-gray-900 bg-lime-100">
                                      <p className="text-xs font-bold text-gray-700 mb-1">CORRECT ANSWER:</p>
                                      <p className="font-medium text-gray-900">{correctAnswer}</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
