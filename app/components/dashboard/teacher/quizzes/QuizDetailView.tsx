/* eslint-disable @typescript-eslint/strict-boolean-expressions, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unnecessary-condition, @typescript-eslint/explicit-function-return-type, @typescript-eslint/no-floating-promises */
"use client";

import { useState, useEffect } from "react";
import type { ReactElement } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useQuizView } from "./QuizViewContext";
import QuizSettingsModal from "./quiz-detail/modals/QuizSettingsModal";
import EditQuizModal from "./quiz-detail/modals/EditQuizModal";
import QuizResultsView from "./quiz-detail/views/QuizResultsView";
import QuizLiveView from "./quiz-detail/views/QuizLiveView";
import QuizQuestionsView from "./quiz-detail/views/QuizQuestionsView";
import QuizDetailHeader from "./quiz-detail/QuizDetailHeader";
import LeftActionsSidebar from "./quiz-detail/LeftActionsSidebar";
import RightStudentsSidebar from "./quiz-detail/RightStudentsSidebar";
import type { Quiz, QuizAttempt } from "./quiz-detail/types";
import type { Section } from "../sections/types";

type QuizDetailViewProps = {
  quizId: string;
};

export default function QuizDetailView({
  quizId,
}: QuizDetailViewProps): ReactElement | null {
  const router = useRouter();
  const {
    goToList,
    goToSettings: _goToSettings,
    goToResults: _goToResults,
    goToLive: _goToLive,
  } = useQuizView();
  const [idToken, setIdToken] = useState<string | null>(null);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [rightSidebarCollapsed, setRightSidebarCollapsed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [studentFilter, setStudentFilter] = useState<
    "all" | "completed" | "pending"
  >("all");
  const [sections, setSections] = useState<Section[]>([]);
  const [assignedSectionIds, setAssignedSectionIds] = useState<string[]>([]);
  const [excludedStudentIds, setExcludedStudentIds] = useState<string[]>([]);
  const [activeView, setActiveView] = useState<
    "questions" | "results" | "live"
  >("questions");
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser !== null && currentUser !== undefined) {
        void currentUser
          .getIdToken()
          .then((token) => {
            setIdToken(token);
          })
          .catch((error) => {
            console.error("Error getting token:", error);
          });
      } else {
        setIdToken(null);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchQuiz = async (): Promise<void> => {
      if (
        idToken === null ||
        idToken === undefined ||
        quizId === null ||
        quizId === undefined
      )
        return;
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(`/api/quizzes/${quizId}`, {
          headers: { Authorization: `Bearer ${idToken}` },
        });
        const data = (await response.json()) as { error?: string; quiz?: Quiz };
        if (response.ok === false) {
          const errorData = data as { error?: string };
          throw new Error(errorData.error ?? "Failed to fetch quiz");
        }
        const quizData = data as { quiz: Quiz };
        setQuiz(quizData.quiz);
      } catch (err) {
        console.error("Error fetching quiz:", err);
        setError(err instanceof Error ? err.message : "Failed to load quiz");
      } finally {
        setLoading(false);
      }
    };
    void fetchQuiz();
  }, [idToken, quizId]);

  useEffect(() => {
    const fetchAttempts = async (): Promise<void> => {
      if (
        idToken === null ||
        idToken === undefined ||
        quizId === null ||
        quizId === undefined
      )
        return;
      try {
        const response = await fetch(
          `/api/teacher/quizzes/${quizId}/attempts`,
          {
            headers: { Authorization: `Bearer ${idToken}` },
          }
        );
        const data = (await response.json()) as { attempts?: QuizAttempt[] };
        if (response.ok === true) {
          const attemptsData = data as { attempts: QuizAttempt[] };
          setAttempts(attemptsData.attempts ?? ([] as never[]));
        }
      } catch (err) {
        console.error("Error fetching attempts:", err);
      }
    };
    void fetchAttempts();
  }, [idToken, quizId]);

  // Fetch sections
  useEffect(() => {
    const fetchSections = async (): Promise<void> => {
      if (!idToken) return;
      try {
        const response = await fetch("/api/teacher/sections", {
          headers: { Authorization: `Bearer ${idToken}` },
        });
        const data = await response.json();
        if (response.ok) setSections(data.sections ?? ([] as never[]));
      } catch (err) {
        console.error("Error fetching sections:", err);
      }
    };
    fetchSections();
  }, [idToken]);

  // Fetch assigned sections for this quiz
  useEffect(() => {
    const fetchAssignedSections = async (): Promise<void> => {
      if (!idToken || !quizId) return;
      try {
        const response = await fetch(`/api/quizzes/${quizId}/sections`, {
          headers: { Authorization: `Bearer ${idToken}` },
        });
        const data = await response.json();
        if (response.ok !== undefined && response.ok !== null) {
          setAssignedSectionIds(data.sectionIds ?? ([] as never[]));
          setExcludedStudentIds(data.excludedStudentIds ?? ([] as never[]));
        }
      } catch (err) {
        console.error("Error fetching assigned sections:", err);
      }
    };
    fetchAssignedSections();
  }, [idToken, quizId]);

  const handleUpdateAssignments = (
    sectionIds: string[],
    excludedIds: string[]
  ) => {
    setAssignedSectionIds(sectionIds);
    setExcludedStudentIds(excludedIds);
  };

  const copyShareLink = (): void => {
    const link = `${window.location.origin}/student/quiz/${quizId}`;
    void navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Loading State
  if (loading !== undefined && loading !== null) {
    return (
      <div className="fixed inset-0 flex flex-col bg-amber-100">
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-gray-900 border-t-transparent rounded-full animate-spin"></div>
            <p className="font-bold text-gray-900">Loading quiz...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error State
  if (error !== undefined && error !== null) {
    return (
      <div className="fixed inset-0 flex flex-col bg-amber-100">
        <div className="flex-1 flex items-center justify-center">
          <div className="bg-white border-2 border-gray-900 rounded-2xl shadow-[6px_6px_0px_0px_rgba(17,24,39,1)] p-8 max-w-md text-center">
            <div className="w-16 h-16 bg-amber-200 rounded-full border-2 border-gray-900 flex items-center justify-center mx-auto mb-4">
              <span className="material-icons-outlined text-gray-900 text-3xl">
                error_outline
              </span>
            </div>
            <h3 className="text-xl font-black text-gray-900 mb-2">
              Something went wrong
            </h3>
            <p className="text-gray-600 font-medium mb-6">{error}</p>
            <button
              onClick={() => void goToList()}
              className="px-6 py-3 bg-amber-200 text-gray-900 font-bold border-2 border-gray-900 rounded-xl shadow-[2px_2px_0px_0px_rgba(17,24,39,1)] hover:shadow-[3px_3px_0px_0px_rgba(17,24,39,1)] transition-all"
            >
              Back to Quizzes
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!quiz) return null;

  return (
    <div className="fixed inset-0 flex flex-col bg-amber-100">
      <QuizDetailHeader
        quiz={quiz}
        attemptsCount={attempts.length}
        onBack={() => void goToList()}
      />

      {/* MAIN CONTENT */}
      <div className="flex-1 flex overflow-hidden">
        <LeftActionsSidebar
          sidebarCollapsed={sidebarCollapsed}
          activeView={activeView}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          onEdit={() => setShowEditModal(true)}
          onToggleResults={() =>
            setActiveView(activeView === "results" ? "questions" : "results")
          }
          onToggleLive={() =>
            setActiveView(activeView === "live" ? "questions" : "live")
          }
          onOpenSettings={() => setShowSettingsModal(true)}
          copied={copied}
          onCopyLink={() => void copyShareLink()}
          durationLabel={quiz.duration ? `${quiz.duration} min` : "No limit"}
          submissionsCount={attempts.length}
          onNewQuiz={() => router.push("/teacher/composer")}
        />

        {/* MAIN CANVAS */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Questions View */}
          {activeView === "questions" && <QuizQuestionsView quiz={quiz} />}

          {/* Results View */}
          {activeView === "results" && (
            <QuizResultsView
              attempts={attempts}
              onBack={() => setActiveView("questions")}
            />
          )}

          {/* Live Session View */}
          {activeView === "live" && (
            <QuizLiveView
              quizId={quizId}
              attempts={attempts}
              onBack={() => setActiveView("questions")}
            />
          )}
        </main>

        <RightStudentsSidebar
          rightSidebarCollapsed={rightSidebarCollapsed}
          studentFilter={studentFilter}
          attempts={attempts}
          sections={sections}
          assignedSectionIds={assignedSectionIds}
          excludedStudentIds={excludedStudentIds}
          onToggleCollapse={() =>
            setRightSidebarCollapsed(!rightSidebarCollapsed)
          }
          onSetStudentFilter={setStudentFilter}
          onViewResults={() => setActiveView("results")}
        />
      </div>

      {/* EDIT QUIZ MODAL */}
      <EditQuizModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        quizId={quizId}
      />

      {/* SETTINGS MODAL */}
      {quiz && (
        <QuizSettingsModal
          isOpen={showSettingsModal}
          onClose={() => setShowSettingsModal(false)}
          quiz={quiz}
          quizId={quizId}
          sections={sections}
          idToken={idToken}
          onUpdateQuiz={setQuiz}
          setShowEditModal={setShowEditModal}
          assignedSectionIds={assignedSectionIds}
          excludedStudentIds={excludedStudentIds}
          onUpdateAssignments={handleUpdateAssignments}
        />
      )}
    </div>
  );
}
