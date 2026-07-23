/* eslint-disable @typescript-eslint/strict-boolean-expressions, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unnecessary-condition, @typescript-eslint/explicit-function-return-type, @typescript-eslint/no-explicit-any, @typescript-eslint/no-floating-promises */
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getAuth } from "firebase/auth";
import app from "@/lib/firebase";
import TiltedCard from "@/components/TiltedCard";
import Masonry, { type MasonryItem } from "@/components/Masonry";

type AssignedQuiz = {
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
};

type StudentQuizzesContentProps = {
  user: any;
};

export default function StudentQuizzesContent({
  user,
}: StudentQuizzesContentProps) {
  const [assignedQuizzes, setAssignedQuizzes] = useState<AssignedQuiz[]>([]);
  const [attemptedQuizIds, setAttemptedQuizIds] = useState<Set<string>>(
    new Set()
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAssignedQuizzes = async (): Promise<void> => {
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

        if (response.ok !== undefined && response.ok !== null) {
          const data = await response.json();
          setAssignedQuizzes(data.quizzes ?? ([] as never[]));
        }

        // Fetch quiz history to check which quizzes have been taken
        const historyResponse = await fetch("/api/users/history", {
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        });

        if (historyResponse.ok !== undefined && historyResponse.ok !== null) {
          const historyData = await historyResponse.json();
          const attemptedIds = new Set<string>(
            (historyData.attempts ?? ([] as never[])).map((attempt: any) =>
              String(attempt.quizId ?? "")
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

    fetchAssignedQuizzes();
  }, [user]);

  return (
    <div className="flex flex-col items-center min-h-[60vh] relative">
      {/* Title Section */}
      <div className="w-full max-w-2xl px-4 flex flex-col gap-3 text-center mb-8">
        <h1 className="text-5xl font-black text-gray-900 tracking-tight">
          Assigned Quizzes
        </h1>
        <div className="flex gap-1.5 justify-center mb-1">
          <div className="w-4 h-4 bg-red-500 rounded-full border-2 border-gray-900"></div>
          <div className="w-4 h-4 bg-yellow-400 rounded-full border-2 border-gray-900"></div>
          <div className="w-4 h-4 bg-green-500 rounded-full border-2 border-gray-900"></div>
        </div>
        <p className="text-lg font-medium text-gray-700">
          Take tests and assessments assigned to your sections by teachers.
        </p>
      </div>

      {/* Main Content Area */}
      <div className="w-full max-w-6xl px-4 relative">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-amber-50 border-3 border-gray-900 rounded-2xl shadow-[4px_4px_0px_0px_rgba(17,24,39,1)] overflow-hidden animate-pulse h-[280px] p-4 flex flex-col justify-between"
              >
                <div className="flex justify-between items-center">
                  <div className="flex gap-1.5">
                    <div className="w-3.5 h-3.5 bg-gray-300 rounded-full border-2 border-gray-900"></div>
                    <div className="w-3.5 h-3.5 bg-gray-300 rounded-full border-2 border-gray-900"></div>
                    <div className="w-3.5 h-3.5 bg-gray-300 rounded-full border-2 border-gray-900"></div>
                  </div>
                  <div className="w-16 h-6 bg-gray-300 rounded-full border border-gray-900"></div>
                </div>
                <div className="space-y-3 my-4">
                  <div className="h-6 bg-gray-300 rounded-full w-3/4 border border-gray-900"></div>
                  <div className="h-4 bg-gray-300 rounded-full w-full border border-gray-900"></div>
                  <div className="h-4 bg-gray-300 rounded-full w-2/3 border border-gray-900"></div>
                </div>
                <div className="h-10 bg-gray-300 rounded-full border-2 border-gray-900 w-full"></div>
              </div>
            ))}
          </div>
        ) : assignedQuizzes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-amber-100 border-3 border-gray-900 rounded-3xl shadow-[8px_8px_0px_0px_rgba(31,41,55,1)] max-w-2xl mx-auto">
            <div className="w-24 h-24 bg-white rounded-full border-3 border-gray-900 flex items-center justify-center mb-6 shadow-[4px_4px_0px_0px_rgba(31,41,55,1)]">
              <span className="material-icons-outlined text-5xl text-gray-400">
                assignment_turned_in
              </span>
            </div>
            <h3 className="text-2xl font-black text-gray-900 mb-2">
              No Quizzes Assigned Yet
            </h3>
            <p className="text-gray-700 font-medium max-w-md">
              You are all caught up! When your teachers assign quizzes to your
              sections, they will show up here.
            </p>
          </div>
        ) : (
          <Masonry
            items={assignedQuizzes.map((quiz): MasonryItem => {
              const now = new Date();
              const availableDate = quiz.availableDate
                ? new Date(quiz.availableDate)
                : null;
              const dueDate = quiz.dueDate ? new Date(quiz.dueDate) : null;
              const isAvailable = !availableDate || now >= availableDate;
              const isOverdue = dueDate && now > dueDate;
              const hasTaken = attemptedQuizIds.has(quiz.id);

              return {
                id: quiz.id,
                height: 280,
                content: (
                  <div className="h-full group">
                    <TiltedCard
                      altText={quiz.title}
                      captionText={`${quiz.totalQuestions} questions`}
                      containerHeight="100%"
                      containerWidth="100%"
                      imageHeight="100%"
                      imageWidth="100%"
                      scaleOnHover={1.03}
                      rotateAmplitude={10}
                      showMobileWarning={false}
                      showTooltip={false}
                      displayOverlayContent={true}
                      overlayContent={
                        <div className="bg-amber-50 border-3 border-gray-900 rounded-2xl relative w-full h-full overflow-hidden flex flex-col justify-between p-5 shadow-[4px_4px_0px_0px_rgba(17,24,39,1)]">
                          {/* Traffic Lights */}
                          <div className="flex items-center justify-between z-10 mb-2">
                            <div className="flex gap-1.5">
                              <div className="w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-gray-900"></div>
                              <div className="w-3.5 h-3.5 bg-yellow-400 rounded-full border-2 border-gray-900"></div>
                              <div className="w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-gray-900"></div>
                            </div>
                            <div className="flex items-center gap-1.5">
                              {quiz.duration && (
                                <div className="flex items-center gap-1 px-2.5 py-0.5 bg-amber-200 border-2 border-gray-900 rounded-full">
                                  <span className="material-icons-outlined text-xs text-gray-900">
                                    schedule
                                  </span>
                                  <span className="font-bold text-gray-900 text-xs">
                                    {quiz.duration}m
                                  </span>
                                </div>
                              )}
                              <div className="flex items-center gap-1 px-2.5 py-0.5 bg-amber-200 border-2 border-gray-900 rounded-full">
                                <span className="material-icons-outlined text-xs text-gray-900">
                                  help_outline
                                </span>
                                <span className="font-bold text-gray-900 text-xs">
                                  {quiz.totalQuestions} Qs
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Content */}
                          <div className="flex-1 my-2">
                            <h3 className="text-xl font-black text-gray-900 leading-tight mb-2 line-clamp-1">
                              {quiz.title}
                            </h3>
                            {quiz.description && (
                              <p className="text-xs font-mono text-gray-700 line-clamp-2 mb-3">
                                {quiz.description}
                              </p>
                            )}
                            {dueDate && (
                              <div className="flex items-center gap-1 text-xs font-bold text-gray-700">
                                <span className="material-icons-outlined text-sm">
                                  event
                                </span>
                                <span>Due:</span>
                                <span
                                  className={
                                    isOverdue
                                      ? "text-red-600 font-extrabold"
                                      : "text-gray-900"
                                  }
                                >
                                  {dueDate.toLocaleDateString()}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Action Button */}
                          <div className="pt-2 z-20">
                            {!isAvailable || isOverdue || hasTaken ? (
                              <div
                                className={`w-full py-2.5 text-center font-bold text-sm border-2 border-gray-900 rounded-full ${
                                  hasTaken
                                    ? "bg-amber-200 text-gray-800 border-dashed"
                                    : isOverdue
                                      ? "bg-red-100 text-red-800"
                                      : "bg-gray-200 text-gray-600"
                                }`}
                              >
                                {hasTaken
                                  ? "Already Completed"
                                  : !isAvailable
                                    ? "Not Available Yet"
                                    : "Quiz Overdue"}
                              </div>
                            ) : (
                              <Link
                                href={`/student/quizzes/${quiz.id}`}
                                className="w-full py-2.5 px-4 bg-gray-900 text-amber-100 font-bold text-sm rounded-full border-2 border-gray-900 shadow-[3px_3px_0px_0px_rgba(251,191,36,1)] hover:bg-gray-800 hover:shadow-[4px_4px_0px_0px_rgba(251,191,36,1)] hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2"
                                aria-label={`Take quiz: ${quiz.title}`}
                              >
                                <span className="material-icons-outlined text-base">
                                  play_arrow
                                </span>
                                Take Quiz
                              </Link>
                            )}
                          </div>
                        </div>
                      }
                    />
                  </div>
                ),
              };
            })}
          />
        )}
      </div>
    </div>
  );
}
