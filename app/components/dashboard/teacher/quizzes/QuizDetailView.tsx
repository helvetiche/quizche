/* eslint-disable @typescript-eslint/strict-boolean-expressions, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unnecessary-condition, @typescript-eslint/prefer-nullish-coalescing, @typescript-eslint/explicit-function-return-type, @typescript-eslint/no-floating-promises, @typescript-eslint/no-unused-vars */
"use client";

import { useState, useEffect, useRef } from "react";
import type { ReactElement } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import Image from "next/image";
import { useQuizView } from "./QuizViewContext";
import Modal from "@/components/Modal";

type Question = {
  question: string;
  type: string;
  choices?: string[];
  answer: string;
  imageUrl?: string;
  explanation?: string;
  choiceExplanations?: string[];
};

type Quiz = {
  id: string;
  title: string;
  description: string;
  questions: Question[];
  totalQuestions: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  duration?: number;
  deadline?: string;
  allowRetake?: boolean;
  showResults?: boolean;
  shuffleQuestions?: boolean;
  shuffleChoices?: boolean;
  maxAttempts?: number;
  preventCopyPaste?: boolean;
  fullscreenMode?: boolean;
  disableRightClick?: boolean;
  antiCheat?: {
    enabled?: boolean;
    tabChangeLimit?: number;
    autoSubmitOnDisqualification?: boolean;
  };
};

type QuizAttempt = {
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
};

type Student = {
  id: string;
  email: string;
  displayName: string;
};

type Section = {
  id: string;
  name: string;
  description: string;
  students: Student[];
};

type QuizDetailViewProps = {
  quizId: string;
};

const QUESTION_TYPES: Record<string, { label: string; icon: string }> = {
  multiple_choice: { label: "Multiple Choice", icon: "radio_button_checked" },
  identification: { label: "Identification", icon: "text_fields" },
  true_or_false: { label: "True / False", icon: "toggle_on" },
  essay: { label: "Essay", icon: "article" },
  enumeration: { label: "Enumeration", icon: "format_list_numbered" },
  reflection: { label: "Reflection", icon: "psychology" },
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
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [rightSidebarCollapsed, setRightSidebarCollapsed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFilter, setSearchFilter] = useState<
    "all" | "questions" | "answers"
  >("all");
  const [studentFilter, setStudentFilter] = useState<
    "all" | "completed" | "pending"
  >("all");
  const [activeView, setActiveView] = useState<
    "questions" | "results" | "live"
  >("questions");
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [sections, setSections] = useState<Section[]>([]);
  const [assignedSectionIds, setAssignedSectionIds] = useState<string[]>([]);
  const [excludedStudentIds, setExcludedStudentIds] = useState<string[]>([]);
  const [expandedSections, setExpandedSections] = useState<string[]>([]);
  const [savingSections, setSavingSections] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [quizSettings, setQuizSettings] = useState({
    isActive: true,
    duration: 0,
    deadline: "",
    maxAttempts: 1,
    allowRetake: false,
    showResults: true,
    shuffleQuestions: false,
    shuffleChoices: false,
    preventCopyPaste: false,
    fullscreenMode: false,
    disableRightClick: false,
    antiCheatEnabled: true,
    tabChangeLimit: 3,
    autoSubmitOnDisqualification: true,
  });
  const paginationRef = useRef<HTMLDivElement>(null);

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
        // Sync quiz settings
        const quiz = quizData.quiz;
        setQuizSettings({
          isActive: quiz.isActive ?? true,
          duration: quiz.duration ?? 0,
          deadline: quiz.deadline ?? "",
          maxAttempts: quiz.maxAttempts ?? 1,
          allowRetake: quiz.allowRetake ?? false,
          showResults: quiz.showResults ?? true,
          shuffleQuestions: quiz.shuffleQuestions ?? false,
          shuffleChoices: quiz.shuffleChoices ?? false,
          preventCopyPaste: quiz.preventCopyPaste ?? false,
          fullscreenMode: quiz.fullscreenMode ?? false,
          disableRightClick: quiz.disableRightClick ?? false,
          antiCheatEnabled: quiz.antiCheat?.enabled ?? true,
          tabChangeLimit: quiz.antiCheat?.tabChangeLimit ?? 3,
          autoSubmitOnDisqualification:
            quiz.antiCheat?.autoSubmitOnDisqualification ?? true,
        });
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
  // Fetch assigned sections and excluded students for this quiz
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

  const toggleSectionAssignment = (sectionId: string): void => {
    setAssignedSectionIds((prev) =>
      prev.includes(sectionId)
        ? prev.filter((id) => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const toggleSectionExpanded = (sectionId: string): void => {
    setExpandedSections((prev) =>
      prev.includes(sectionId)
        ? prev.filter((id) => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const toggleStudentExclusion = (studentId: string): void => {
    setExcludedStudentIds((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId]
    );
  };

  const saveSectionAssignments = async (): Promise<void> => {
    if (!idToken || !quizId) return;
    setSavingSections(true);
    try {
      const { apiPut } = await import("@/app/lib/api");
      const response = await apiPut(`/api/quizzes/${quizId}/sections`, {
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sectionIds: assignedSectionIds,
          excludedStudentIds: excludedStudentIds,
        }),
        idToken,
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save section assignments");
      }
    } catch (err) {
      console.error("Error saving section assignments:", err);
      console.error(
        err instanceof Error
          ? err.message
          : "Failed to save section assignments"
      );
    } finally {
      setSavingSections(false);
    }
  };

  const saveQuizSettings = async (): Promise<void> => {
    if (!idToken || !quizId) return;
    setSavingSettings(true);
    try {
      const { apiPut } = await import("@/app/lib/api");
      const response = await apiPut(`/api/quizzes/${quizId}/settings`, {
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isActive: quizSettings.isActive,
          duration: quizSettings.duration || null,
          deadline: quizSettings.deadline || null,
          maxAttempts: quizSettings.maxAttempts,
          allowRetake: quizSettings.allowRetake,
          showResults: quizSettings.showResults,
          shuffleQuestions: quizSettings.shuffleQuestions,
          shuffleChoices: quizSettings.shuffleChoices,
          preventCopyPaste: quizSettings.preventCopyPaste,
          fullscreenMode: quizSettings.fullscreenMode,
          disableRightClick: quizSettings.disableRightClick,
          antiCheat: {
            enabled: quizSettings.antiCheatEnabled,
            tabChangeLimit: quizSettings.tabChangeLimit,
            autoSubmitOnDisqualification:
              quizSettings.autoSubmitOnDisqualification,
          },
        }),
        idToken,
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save quiz settings");
      }
      // Update local quiz state
      if (quiz !== undefined && quiz !== null) {
        setQuiz({
          ...quiz,
          isActive: quizSettings.isActive,
          duration: quizSettings.duration || undefined,
          deadline: quizSettings.deadline || undefined,
          maxAttempts: quizSettings.maxAttempts,
          allowRetake: quizSettings.allowRetake,
          showResults: quizSettings.showResults,
          shuffleQuestions: quizSettings.shuffleQuestions,
          shuffleChoices: quizSettings.shuffleChoices,
          preventCopyPaste: quizSettings.preventCopyPaste,
          fullscreenMode: quizSettings.fullscreenMode,
          disableRightClick: quizSettings.disableRightClick,
          antiCheat: {
            enabled: quizSettings.antiCheatEnabled,
            tabChangeLimit: quizSettings.tabChangeLimit,
            autoSubmitOnDisqualification:
              quizSettings.autoSubmitOnDisqualification,
          },
        });
      }
      // Close modal on success
      setShowSettingsModal(false);
    } catch (err) {
      console.error("Error saving quiz settings:", err);
      console.error(
        err instanceof Error ? err.message : "Failed to save settings"
      );
    } finally {
      setSavingSettings(false);
    }
  };

  const saveAllSettings = async (): Promise<void> => {
    await Promise.all([saveSectionAssignments(), saveQuizSettings()]);
  };

  const copyShareLink = (): void => {
    const link = `${window.location.origin}/student/quiz/${quizId}`;
    void navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getTypeInfo = (type: string) =>
    QUESTION_TYPES[type] || QUESTION_TYPES.multiple_choice;
  const currentQuestion = quiz?.questions[currentQuestionIndex];
  const typeInfo = currentQuestion
    ? getTypeInfo(currentQuestion.type)
    : QUESTION_TYPES.multiple_choice;

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
      {/* TOP HEADER */}
      <header className="flex items-center justify-between px-4 py-3 bg-amber-100 border-b-2 border-gray-900">
        <div className="flex items-center gap-4">
          <button
            onClick={() => void goToList()}
            className="w-10 h-10 bg-amber-200 text-gray-900 rounded-xl flex items-center justify-center border-2 border-gray-900 hover:bg-amber-300 transition-colors shadow-[2px_2px_0px_0px_rgba(17,24,39,1)]"
          >
            <span className="material-icons-outlined">arrow_back</span>
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span
                className={`text-xs font-bold px-2 py-0.5 border-2 border-gray-900 rounded-full ${quiz.isActive ? "bg-amber-300" : "bg-gray-300"}`}
              >
                {quiz.isActive ? "ACTIVE" : "INACTIVE"}
              </span>
              <h1 className="text-lg font-black text-gray-900">{quiz.title}</h1>
            </div>
            <p className="text-xs text-gray-600 font-medium">
              {quiz.description || "No description"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-600 font-bold px-3 py-1.5 bg-amber-200 border-2 border-gray-900 rounded-full">
            {quiz.totalQuestions} questions
          </span>
          <span className="text-xs text-gray-600 font-bold px-3 py-1.5 bg-amber-200 border-2 border-gray-900 rounded-full">
            {attempts.length} submissions
          </span>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT SIDEBAR */}
        <aside
          className={`flex flex-col bg-amber-100 border-r-2 border-gray-900 transition-all duration-200 ${sidebarCollapsed ? "w-16" : "w-56"}`}
        >
          {/* Sidebar Header */}
          <div className="flex items-center justify-between p-3 border-b-2 border-gray-900">
            {!sidebarCollapsed && (
              <span className="text-gray-900 font-black text-xs uppercase tracking-wider">
                Actions
              </span>
            )}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="w-8 h-8 rounded-lg bg-amber-200 border-2 border-gray-900 hover:bg-amber-300 flex items-center justify-center transition-colors ml-auto"
            >
              <span className="material-icons-outlined text-gray-900 text-sm">
                {sidebarCollapsed ? "chevron_right" : "chevron_left"}
              </span>
            </button>
          </div>

          {/* Quick Actions */}
          <div className="p-2 border-b-2 border-gray-900">
            {!sidebarCollapsed && (
              <p className="text-[10px] font-black text-gray-700 uppercase tracking-wider mb-2 px-2">
                Quick Actions
              </p>
            )}
            <div className="flex flex-col gap-1">
              <button
                onClick={() => setShowEditModal(true)}
                className={`group flex items-center gap-2 p-2 rounded-xl hover:bg-amber-200 border-2 border-transparent hover:border-gray-900 transition-all ${sidebarCollapsed ? "justify-center" : ""}`}
                title="Edit Quiz"
              >
                <div className="w-8 h-8 bg-amber-200 rounded-lg flex items-center justify-center flex-shrink-0 border-2 border-gray-900 group-hover:bg-amber-300">
                  <span className="material-icons-outlined text-gray-900 text-sm">
                    edit
                  </span>
                </div>
                {!sidebarCollapsed && (
                  <div className="flex flex-col items-start min-w-0 text-left">
                    <span className="text-gray-900 font-bold text-xs">
                      Edit Quiz
                    </span>
                    <span className="text-gray-500 text-[9px] leading-tight">
                      Modify questions and answers
                    </span>
                  </div>
                )}
              </button>
              <button
                onClick={() =>
                  setActiveView(
                    activeView === "results" ? "questions" : "results"
                  )
                }
                className={`group flex items-center gap-2 p-2 rounded-xl hover:bg-amber-200 border-2 ${activeView === "results" ? "border-gray-900 bg-amber-200" : "border-transparent"} hover:border-gray-900 transition-all ${sidebarCollapsed ? "justify-center" : ""}`}
                title="View Results"
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 border-2 border-gray-900 ${activeView === "results" ? "bg-amber-400" : "bg-amber-200 group-hover:bg-amber-300"}`}
                >
                  <span className="material-icons-outlined text-gray-900 text-sm">
                    analytics
                  </span>
                </div>
                {!sidebarCollapsed && (
                  <div className="flex flex-col items-start min-w-0 text-left">
                    <span className="text-gray-900 font-bold text-xs">
                      View Results
                    </span>
                    <span className="text-gray-500 text-[9px] leading-tight">
                      See student submissions
                    </span>
                  </div>
                )}
              </button>
              <button
                onClick={() =>
                  setActiveView(activeView === "live" ? "questions" : "live")
                }
                className={`group flex items-center gap-2 p-2 rounded-xl hover:bg-amber-200 border-2 ${activeView === "live" ? "border-gray-900 bg-amber-200" : "border-transparent"} hover:border-gray-900 transition-all ${sidebarCollapsed ? "justify-center" : ""}`}
                title="Live Session"
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 border-2 border-gray-900 ${activeView === "live" ? "bg-amber-400" : "bg-amber-200 group-hover:bg-amber-300"}`}
                >
                  <span className="material-icons-outlined text-gray-900 text-sm">
                    play_circle
                  </span>
                </div>
                {!sidebarCollapsed && (
                  <div className="flex flex-col items-start min-w-0 text-left">
                    <span className="text-gray-900 font-bold text-xs">
                      Live Session
                    </span>
                    <span className="text-gray-500 text-[9px] leading-tight">
                      Monitor quiz in real-time
                    </span>
                  </div>
                )}
              </button>
              <button
                onClick={() => setShowSettingsModal(true)}
                className={`group flex items-center gap-2 p-2 rounded-xl hover:bg-amber-200 border-2 border-transparent hover:border-gray-900 transition-all ${sidebarCollapsed ? "justify-center" : ""}`}
                title="Settings"
              >
                <div className="w-8 h-8 bg-amber-200 rounded-lg flex items-center justify-center flex-shrink-0 border-2 border-gray-900 group-hover:bg-amber-300">
                  <span className="material-icons-outlined text-gray-900 text-sm">
                    settings
                  </span>
                </div>
                {!sidebarCollapsed && (
                  <div className="flex flex-col items-start min-w-0 text-left">
                    <span className="text-gray-900 font-bold text-xs">
                      Settings
                    </span>
                    <span className="text-gray-500 text-[9px] leading-tight">
                      Configure quiz options
                    </span>
                  </div>
                )}
              </button>
            </div>
          </div>

          {/* Share Section */}
          <div className="p-2 border-b-2 border-gray-900">
            {!sidebarCollapsed && (
              <p className="text-[10px] font-black text-gray-700 uppercase tracking-wider mb-2 px-2">
                Share
              </p>
            )}
            <button
              onClick={() => void copyShareLink()}
              className={`group flex items-center gap-2 p-2 rounded-xl hover:bg-amber-200 border-2 border-transparent hover:border-gray-900 transition-all w-full ${sidebarCollapsed ? "justify-center" : ""}`}
              title="Copy Link"
            >
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 border-2 border-gray-900 ${copied ? "bg-amber-400" : "bg-amber-200 group-hover:bg-amber-300"}`}
              >
                <span className="material-icons-outlined text-gray-900 text-sm">
                  {copied ? "check" : "link"}
                </span>
              </div>
              {!sidebarCollapsed && (
                <div className="flex flex-col items-start min-w-0 text-left">
                  <span className="text-gray-900 font-bold text-xs">
                    {copied ? "Copied" : "Copy Link"}
                  </span>
                  <span className="text-gray-500 text-[9px] leading-tight">
                    Share with students
                  </span>
                </div>
              )}
            </button>
          </div>

          {/* Stats */}
          <div className="p-2 flex-1">
            {!sidebarCollapsed && (
              <p className="text-[10px] font-black text-gray-700 uppercase tracking-wider mb-2 px-2">
                Stats
              </p>
            )}
            <div className="flex flex-col gap-2 px-2">
              <div
                className={`flex items-center gap-2 ${sidebarCollapsed ? "justify-center" : ""}`}
              >
                <div className="w-8 h-8 bg-amber-200 rounded-lg flex items-center justify-center border-2 border-gray-900">
                  <span className="material-icons-outlined text-gray-900 text-sm">
                    schedule
                  </span>
                </div>
                {!sidebarCollapsed && (
                  <div>
                    <p className="text-xs font-bold text-gray-900">
                      {quiz.duration ? `${quiz.duration} min` : "No limit"}
                    </p>
                    <p className="text-[9px] text-gray-500">Duration</p>
                  </div>
                )}
              </div>
              <div
                className={`flex items-center gap-2 ${sidebarCollapsed ? "justify-center" : ""}`}
              >
                <div className="w-8 h-8 bg-amber-200 rounded-lg flex items-center justify-center border-2 border-gray-900">
                  <span className="material-icons-outlined text-gray-900 text-sm">
                    people
                  </span>
                </div>
                {!sidebarCollapsed && (
                  <div>
                    <p className="text-xs font-bold text-gray-900">
                      {attempts.length}
                    </p>
                    <p className="text-[9px] text-gray-500">Submissions</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bottom Actions */}
          <div className="mt-auto p-3 flex flex-col gap-2">
            <button
              onClick={() => router.push("/teacher/composer")}
              className="w-full flex items-center justify-center gap-2 p-2.5 bg-amber-200 hover:bg-amber-300 text-gray-900 font-bold rounded-xl border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(17,24,39,1)] hover:shadow-[3px_3px_0px_0px_rgba(17,24,39,1)] transition-all"
            >
              <span className="material-icons-outlined text-sm">add</span>
              {!sidebarCollapsed && <span className="text-xs">New Quiz</span>}
            </button>
          </div>
        </aside>

        {/* MAIN CANVAS */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Questions View */}
          {activeView === "questions" && (
            <>
              {/* Canvas Area */}
              <div className="flex-1 overflow-y-auto p-8 bg-amber-50">
                <div className="mx-auto">
                  {currentQuestion && (
                    <div className="bg-white rounded-2xl border-2 border-gray-900 shadow-[6px_6px_0px_0px_rgba(17,24,39,1)] overflow-hidden">
                      {/* Card Header */}
                      <div className="bg-amber-200 px-6 py-4 flex items-center justify-between border-b-2 border-gray-900">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(17,24,39,1)]">
                            <span className="text-2xl font-black text-gray-900">
                              {currentQuestionIndex + 1}
                            </span>
                          </div>
                          <div>
                            <p className="text-gray-900 font-black text-lg">
                              {typeInfo.label}
                            </p>
                            <p className="text-gray-700 text-sm font-medium">
                              Question {currentQuestionIndex + 1} of{" "}
                              {quiz.questions.length}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="material-icons-outlined text-gray-700">
                            {typeInfo.icon}
                          </span>
                          <span className="px-3 py-1.5 bg-white border-2 border-gray-900 rounded-lg font-bold text-gray-900 text-sm shadow-[2px_2px_0px_0px_rgba(17,24,39,1)]">
                            {typeInfo.label}
                          </span>
                        </div>
                      </div>

                      {/* Card Body */}
                      <div className="p-6 flex flex-col gap-6 bg-amber-50">
                        {/* Question + Image Row */}
                        <div className="flex gap-6">
                          {/* Question Text - Left Side */}
                          <div className="flex-1">
                            <label className="text-sm font-black text-gray-900 mb-2 block">
                              Question
                            </label>
                            <div className="w-full min-h-[120px] px-4 py-4 bg-white border-2 border-gray-900 rounded-xl text-gray-900 font-medium text-lg shadow-[2px_2px_0px_0px_rgba(17,24,39,1)]">
                              {currentQuestion.question || (
                                <span className="text-gray-400 italic">
                                  No question text
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Image - Right Side */}
                          {currentQuestion.imageUrl && (
                            <div className="w-64 flex-shrink-0">
                              <label className="text-sm font-black text-gray-900 mb-2 block">
                                Image
                              </label>
                              <div className="relative h-40 border-2 border-gray-900 rounded-xl overflow-hidden bg-white shadow-[2px_2px_0px_0px_rgba(17,24,39,1)]">
                                <Image
                                  src={currentQuestion.imageUrl}
                                  alt="Question"
                                  fill
                                  className="object-contain"
                                  unoptimized
                                />
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Multiple Choice Display */}
                        {currentQuestion.type === "multiple_choice" &&
                          currentQuestion.choices && (
                            <div>
                              <label className="text-sm font-black text-gray-900 mb-3 block">
                                Choices
                              </label>
                              <div className="flex flex-col gap-3">
                                {currentQuestion.choices.map((choice, idx) => {
                                  const isCorrect =
                                    currentQuestion.answer.trim() ===
                                    choice.trim();
                                  const explanation =
                                    currentQuestion.choiceExplanations?.[idx];
                                  return (
                                    <div
                                      key={idx}
                                      className="flex flex-col gap-2"
                                    >
                                      <div className="flex items-center gap-2">
                                        <div
                                          className={`w-9 h-9 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${isCorrect ? "bg-amber-400 border-gray-900 shadow-[2px_2px_0px_0px_rgba(17,24,39,1)]" : "bg-white border-gray-400"}`}
                                        >
                                          {isCorrect && (
                                            <span className="material-icons-outlined text-gray-900 text-sm">
                                              check
                                            </span>
                                          )}
                                        </div>
                                        <div
                                          className={`flex-1 px-3 py-2.5 bg-white border-2 rounded-xl font-medium text-sm ${isCorrect ? "border-amber-500 bg-amber-50" : "border-gray-300"}`}
                                        >
                                          {choice || (
                                            <span className="text-gray-400 italic">
                                              Empty choice
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                      {/* Choice Explanation */}
                                      {explanation?.trim() && (
                                        <div
                                          className={`ml-11 p-3 rounded-xl border-2 ${isCorrect ? "bg-green-50 border-green-300" : "bg-red-50 border-red-300"}`}
                                        >
                                          <div className="flex items-start gap-2">
                                            <span
                                              className={`material-icons-outlined text-sm mt-0.5 ${isCorrect ? "text-green-600" : "text-red-600"}`}
                                            >
                                              {isCorrect
                                                ? "check_circle"
                                                : "cancel"}
                                            </span>
                                            <div>
                                              <p
                                                className={`text-xs font-bold mb-1 ${isCorrect ? "text-green-700" : "text-red-700"}`}
                                              >
                                                {isCorrect
                                                  ? "Why this is correct:"
                                                  : "Why this is wrong:"}
                                              </p>
                                              <p
                                                className={`text-sm ${isCorrect ? "text-green-800" : "text-red-800"}`}
                                              >
                                                {explanation}
                                              </p>
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                        {/* True/False Display */}
                        {currentQuestion.type === "true_or_false" && (
                          <div>
                            <label className="text-sm font-black text-gray-900 mb-3 block">
                              Correct Answer
                            </label>
                            <div className="flex gap-4">
                              <div
                                className={`flex-1 py-4 rounded-xl border-2 font-bold text-lg text-center ${currentQuestion.answer === "true" ? "bg-amber-400 border-gray-900 text-gray-900 shadow-[3px_3px_0px_0px_rgba(17,24,39,1)]" : "bg-white border-gray-300 text-gray-400"}`}
                              >
                                <span className="flex items-center justify-center gap-2">
                                  <span className="material-icons-outlined">
                                    check
                                  </span>{" "}
                                  True
                                </span>
                              </div>
                              <div
                                className={`flex-1 py-4 rounded-xl border-2 font-bold text-lg text-center ${currentQuestion.answer === "false" ? "bg-amber-400 border-gray-900 text-gray-900 shadow-[3px_3px_0px_0px_rgba(17,24,39,1)]" : "bg-white border-gray-300 text-gray-400"}`}
                              >
                                <span className="flex items-center justify-center gap-2">
                                  <span className="material-icons-outlined">
                                    close
                                  </span>{" "}
                                  False
                                </span>
                              </div>
                            </div>
                            {/* Explanation for True/False */}
                            {currentQuestion.explanation?.trim() && (
                              <div className="mt-4 p-4 bg-green-50 border-2 border-green-300 rounded-xl">
                                <div className="flex items-start gap-2">
                                  <span className="material-icons-outlined text-green-600 text-sm mt-0.5">
                                    lightbulb
                                  </span>
                                  <div>
                                    <p className="text-xs font-bold text-green-700 mb-1">
                                      Explanation
                                    </p>
                                    <p className="text-sm text-green-800">
                                      {currentQuestion.explanation}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Text Answer Types Display */}
                        {(currentQuestion.type === "identification" ||
                          currentQuestion.type === "enumeration" ||
                          currentQuestion.type === "essay" ||
                          currentQuestion.type === "reflection") && (
                          <div>
                            <label className="text-sm font-black text-gray-900 mb-2 block">
                              {currentQuestion.type === "enumeration"
                                ? "Answers"
                                : currentQuestion.type === "essay" ||
                                    currentQuestion.type === "reflection"
                                  ? "Sample Answer / Rubric"
                                  : "Correct Answer"}
                            </label>
                            <div className="w-full px-4 py-3 bg-white border-2 border-gray-900 rounded-xl font-medium shadow-[2px_2px_0px_0px_rgba(17,24,39,1)] min-h-[60px]">
                              {currentQuestion.answer || (
                                <span className="text-gray-400 italic">
                                  No answer provided
                                </span>
                              )}
                            </div>
                            {/* Explanation for Identification */}
                            {currentQuestion.type === "identification" &&
                              currentQuestion.explanation?.trim() && (
                                <div className="mt-4 p-4 bg-green-50 border-2 border-green-300 rounded-xl">
                                  <div className="flex items-start gap-2">
                                    <span className="material-icons-outlined text-green-600 text-sm mt-0.5">
                                      lightbulb
                                    </span>
                                    <div>
                                      <p className="text-xs font-bold text-green-700 mb-1">
                                        Explanation
                                      </p>
                                      <p className="text-sm text-green-800">
                                        {currentQuestion.explanation}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* BOTTOM PAGINATION */}
              <nav className="flex flex-col gap-2 px-4 py-3 bg-amber-100 border-t-2 border-gray-900">
                {/* Search Bar & Filters */}
                <div className="flex items-center gap-2">
                  {/* Filter Buttons */}
                  <div className="flex items-center bg-white border-2 border-gray-900 rounded-xl overflow-hidden shadow-[2px_2px_0px_0px_rgba(17,24,39,1)] h-[42px]">
                    <button
                      onClick={() => setSearchFilter("all")}
                      className={`px-3 h-full text-xs font-bold transition-colors ${searchFilter === "all" ? "bg-amber-300 text-gray-900" : "bg-white text-gray-600 hover:bg-amber-100"}`}
                    >
                      All
                    </button>
                    <button
                      onClick={() => setSearchFilter("questions")}
                      className={`px-3 h-full text-xs font-bold border-l-2 border-gray-900 transition-colors ${searchFilter === "questions" ? "bg-amber-300 text-gray-900" : "bg-white text-gray-600 hover:bg-amber-100"}`}
                    >
                      Questions
                    </button>
                    <button
                      onClick={() => setSearchFilter("answers")}
                      className={`px-3 h-full text-xs font-bold border-l-2 border-gray-900 transition-colors ${searchFilter === "answers" ? "bg-amber-300 text-gray-900" : "bg-white text-gray-600 hover:bg-amber-100"}`}
                    >
                      Answers
                    </button>
                  </div>

                  {/* Search Input */}
                  <div className="relative flex-1 max-w-xs h-[42px]">
                    <span className="material-icons-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                      search
                    </span>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={`Search ${searchFilter === "all" ? "all" : searchFilter}...`}
                      className="w-full h-full pl-9 pr-8 bg-white border-2 border-gray-900 rounded-xl text-sm font-medium placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400 shadow-[2px_2px_0px_0px_rgba(17,24,39,1)]"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery("")}
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 bg-gray-200 rounded-full flex items-center justify-center hover:bg-gray-300 transition-colors"
                      >
                        <span className="material-icons-outlined text-gray-600 text-xs">
                          close
                        </span>
                      </button>
                    )}
                  </div>

                  {/* Results Count */}
                  {searchQuery && (
                    <span className="text-xs font-bold text-gray-600 px-2 py-1.5 bg-amber-200 border-2 border-gray-900 rounded-lg">
                      {
                        quiz.questions.filter((q) => {
                          const query = searchQuery.toLowerCase();
                          if (searchFilter === "questions") {
                            return q.question.toLowerCase().includes(query);
                          } else if (searchFilter === "answers") {
                            return (
                              q.answer.toLowerCase().includes(query) ||
                              q.choices?.some((c) =>
                                c.toLowerCase().includes(query)
                              )
                            );
                          } else {
                            return (
                              q.question.toLowerCase().includes(query) ||
                              q.answer.toLowerCase().includes(query) ||
                              q.choices?.some((c) =>
                                c.toLowerCase().includes(query)
                              )
                            );
                          }
                        }).length
                      }{" "}
                      found
                    </span>
                  )}

                  {/* Spacer */}
                  <div className="flex-1"></div>

                  {/* Page Indicator - Right Side */}
                  <div className="flex items-center gap-1 px-2 py-1 bg-white border-2 border-gray-900 rounded-lg shadow-[2px_2px_0px_0px_rgba(17,24,39,1)]">
                    <span className="text-gray-900 font-bold text-xs">
                      {currentQuestionIndex + 1}
                    </span>
                    <span className="text-gray-400 text-xs">/</span>
                    <span className="text-gray-600 font-medium text-xs">
                      {quiz.questions.length}
                    </span>
                  </div>
                </div>

                {/* Pagination Row */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={() =>
                      setCurrentQuestionIndex(
                        Math.max(0, currentQuestionIndex - 1)
                      )
                    }
                    disabled={currentQuestionIndex === 0}
                    className="w-10 h-full rounded-xl bg-amber-200 border-2 border-gray-900 hover:bg-amber-300 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed transition-colors shadow-[2px_2px_0px_0px_rgba(17,24,39,1)] flex-shrink-0"
                  >
                    <span className="material-icons-outlined text-gray-900">
                      chevron_left
                    </span>
                  </button>

                  <div
                    ref={paginationRef}
                    className="flex-1 flex items-center gap-3 overflow-x-auto py-1 px-1"
                  >
                    {quiz.questions.map((q, index) => {
                      const qTypeInfo = getTypeInfo(q.type);
                      const isActive = currentQuestionIndex === index;
                      const hasContent = q.question.trim().length > 0;
                      const questionPreview =
                        q.question.trim() || "Empty question...";

                      // Check if question matches search based on filter
                      const matchesSearch = searchQuery
                        ? (() => {
                            const query = searchQuery.toLowerCase();
                            if (searchFilter === "questions") {
                              return q.question.toLowerCase().includes(query);
                            } else if (searchFilter === "answers") {
                              return (
                                q.answer.toLowerCase().includes(query) ||
                                q.choices?.some((c) =>
                                  c.toLowerCase().includes(query)
                                )
                              );
                            } else {
                              return (
                                q.question.toLowerCase().includes(query) ||
                                q.answer.toLowerCase().includes(query) ||
                                q.choices?.some((c) =>
                                  c.toLowerCase().includes(query)
                                )
                              );
                            }
                          })()
                        : true;

                      // Dim non-matching questions when searching
                      const dimmed = searchQuery && !matchesSearch;

                      return (
                        <div
                          key={index}
                          onClick={() => setCurrentQuestionIndex(index)}
                          className={`flex-shrink-0 rounded-xl border-2 overflow-hidden transition-all flex flex-col cursor-pointer ${
                            dimmed ? "opacity-30" : ""
                          } ${
                            matchesSearch && searchQuery
                              ? "ring-2 ring-amber-500"
                              : ""
                          } ${
                            isActive
                              ? "border-gray-900 shadow-[3px_3px_0px_0px_rgba(17,24,39,1)] ring-2 ring-amber-400"
                              : hasContent
                                ? "border-gray-900 hover:shadow-[2px_2px_0px_0px_rgba(17,24,39,1)] hover:-translate-y-0.5"
                                : "border-gray-400 border-dashed hover:border-gray-900"
                          }`}
                          style={{ width: "240px", height: "152px" }}
                        >
                          {/* Card Header with Type Icon */}
                          <div
                            className={`${isActive ? "bg-amber-300" : "bg-amber-200"} px-2 py-1.5 flex items-center justify-between border-b-2 ${isActive ? "border-gray-900" : "border-gray-300"}`}
                          >
                            <div className="flex items-center gap-1.5">
                              <span className="material-icons-outlined text-xs text-gray-900">
                                {qTypeInfo.icon}
                              </span>
                              <span
                                className={`text-xs font-black truncate ${isActive ? "text-gray-900" : "text-gray-700"}`}
                              >
                                {index + 1}. {qTypeInfo.label.split(" ")[0]}
                              </span>
                            </div>
                            {matchesSearch &&
                              searchQuery !== undefined &&
                              searchQuery !== null && (
                                <span className="material-icons-outlined text-xs text-amber-600">
                                  search
                                </span>
                              )}
                          </div>

                          {/* Card Body with Question Preview */}
                          <div
                            className={`flex-1 p-2 ${isActive ? "bg-white" : "bg-amber-50"}`}
                          >
                            <p
                              className={`text-[10px] leading-tight font-medium line-clamp-3 ${hasContent ? (isActive ? "text-gray-900" : "text-gray-700") : "text-gray-400 italic"}`}
                            >
                              {questionPreview}
                            </p>
                          </div>

                          {/* Card Footer with Answer Preview */}
                          <div
                            className={`px-2 py-1 ${isActive ? "bg-amber-100" : "bg-amber-100/50"} border-t ${isActive ? "border-gray-300" : "border-gray-200"}`}
                          >
                            <p
                              className={`text-[9px] leading-tight font-medium line-clamp-2 ${q.answer.trim() ? (isActive ? "text-gray-700" : "text-gray-500") : "text-gray-400 italic"}`}
                            >
                              {q.answer.trim() || "No answer"}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <button
                    onClick={() =>
                      setCurrentQuestionIndex(
                        Math.min(
                          quiz.questions.length - 1,
                          currentQuestionIndex + 1
                        )
                      )
                    }
                    disabled={
                      currentQuestionIndex === quiz.questions.length - 1
                    }
                    className="w-10 h-full rounded-xl bg-amber-200 border-2 border-gray-900 hover:bg-amber-300 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed transition-colors shadow-[2px_2px_0px_0px_rgba(17,24,39,1)] flex-shrink-0"
                  >
                    <span className="material-icons-outlined text-gray-900">
                      chevron_right
                    </span>
                  </button>
                </div>
              </nav>
            </>
          )}

          {/* Results View */}
          {activeView === "results" && (
            <div className="flex-1 overflow-y-auto p-6 bg-amber-50">
              <div className="w-full">
                {/* Results Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-amber-200 rounded-xl flex items-center justify-center border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(17,24,39,1)]">
                      <span className="material-icons-outlined text-gray-900 text-xl">
                        analytics
                      </span>
                    </div>
                    <div>
                      <h2 className="text-xl font-black text-gray-900">
                        Quiz Results
                      </h2>
                      <p className="text-gray-600 font-medium text-sm">
                        {attempts.length} submissions
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveView("questions")}
                    className="flex items-center gap-2 px-4 py-2 bg-amber-200 text-gray-900 font-bold rounded-xl border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(17,24,39,1)] hover:shadow-[3px_3px_0px_0px_rgba(17,24,39,1)] transition-all"
                  >
                    <span className="material-icons-outlined text-sm">
                      arrow_back
                    </span>
                    Back to Questions
                  </button>
                </div>

                {/* Results Table */}
                <div className="bg-white border-2 border-gray-900 rounded-xl shadow-[4px_4px_0px_0px_rgba(17,24,39,1)] overflow-hidden">
                  <div className="bg-amber-200 px-4 py-3 border-b-2 border-gray-900">
                    <h3 className="font-black text-gray-900">
                      Student Submissions
                    </h3>
                  </div>
                  {attempts.length === 0 ? (
                    <div className="p-8 text-center">
                      <div className="w-16 h-16 bg-amber-200 rounded-full border-2 border-gray-900 flex items-center justify-center mx-auto mb-4">
                        <span className="material-icons-outlined text-gray-700 text-3xl">
                          inbox
                        </span>
                      </div>
                      <p className="text-lg font-bold text-gray-900">
                        No submissions yet
                      </p>
                      <p className="text-gray-600">
                        Students who complete the quiz will appear here
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y-2 divide-gray-200">
                      {attempts.map((attempt, index) => (
                        <div
                          key={attempt.id || index}
                          className="flex items-center gap-4 p-4 hover:bg-amber-50 transition-colors"
                        >
                          <div className="w-10 h-10 rounded-full border-2 border-gray-900 flex items-center justify-center bg-amber-200">
                            <span className="font-black text-gray-900">
                              {attempt.studentName?.charAt(0).toUpperCase() ||
                                attempt.studentEmail?.charAt(0).toUpperCase() ||
                                "?"}
                            </span>
                          </div>
                          <div className="flex-1">
                            <p className="font-bold text-gray-900">
                              {attempt.studentName || "Unknown Student"}
                            </p>
                            <p className="text-sm text-gray-600">
                              {attempt.studentEmail}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xl font-black text-gray-900">
                              {attempt.percentage}%
                            </p>
                            <p className="text-sm text-gray-600">
                              {attempt.score}/{attempt.totalQuestions} correct
                            </p>
                          </div>
                          <div className="text-sm text-gray-500">
                            {new Date(attempt.completedAt).toLocaleDateString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Live Session View */}
          {activeView === "live" && (
            <div className="flex-1 overflow-y-auto p-6 bg-amber-50">
              <div className="w-full">
                {/* Live Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-amber-200 rounded-xl flex items-center justify-center border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(17,24,39,1)]">
                      <span className="material-icons-outlined text-gray-900 text-xl">
                        play_circle
                      </span>
                    </div>
                    <div>
                      <h2 className="text-xl font-black text-gray-900">
                        Live Session
                      </h2>
                      <p className="text-gray-600 font-medium text-sm">
                        Monitor quiz in real-time
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveView("questions")}
                    className="flex items-center gap-2 px-4 py-2 bg-amber-200 text-gray-900 font-bold rounded-xl border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(17,24,39,1)] hover:shadow-[3px_3px_0px_0px_rgba(17,24,39,1)] transition-all"
                  >
                    <span className="material-icons-outlined text-sm">
                      arrow_back
                    </span>
                    Back to Questions
                  </button>
                </div>

                {/* Quiz Link */}
                <div className="bg-white border-2 border-gray-900 rounded-xl p-4 shadow-[3px_3px_0px_0px_rgba(17,24,39,1)] mb-6">
                  <h3 className="font-black text-gray-900 mb-3">
                    Share Quiz Link
                  </h3>
                  <div className="flex gap-3">
                    <input
                      type="text"
                      readOnly
                      value={`${typeof window !== "undefined" ? window.location.origin : ""}/student/quiz/${quizId}`}
                      className="flex-1 px-4 py-3 bg-amber-50 border-2 border-gray-900 rounded-xl font-medium text-gray-700"
                    />
                    <button
                      onClick={() => void copyShareLink()}
                      className={`px-6 py-3 font-bold rounded-xl border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(17,24,39,1)] transition-all ${copied ? "bg-amber-400" : "bg-amber-200 hover:bg-amber-300"}`}
                    >
                      {copied ? "Copied" : "Copy"}
                    </button>
                  </div>
                </div>

                {/* Recent Activity */}
                <div className="bg-white border-2 border-gray-900 rounded-xl shadow-[3px_3px_0px_0px_rgba(17,24,39,1)] overflow-hidden">
                  <div className="bg-amber-200 px-4 py-3 border-b-2 border-gray-900 flex items-center gap-2">
                    <div className="w-3 h-3 bg-amber-500 rounded-full animate-pulse"></div>
                    <h3 className="font-black text-gray-900">
                      Recent Activity
                    </h3>
                  </div>
                  {attempts.length === 0 ? (
                    <div className="p-8 text-center">
                      <div className="w-16 h-16 bg-amber-200 rounded-full border-2 border-gray-900 flex items-center justify-center mx-auto mb-4">
                        <span className="material-icons-outlined text-gray-700 text-3xl">
                          hourglass_empty
                        </span>
                      </div>
                      <p className="text-lg font-bold text-gray-900">
                        Waiting for students...
                      </p>
                      <p className="text-gray-600">
                        Share the quiz link to get started
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y-2 divide-gray-200">
                      {attempts.slice(0, 10).map((attempt, index) => (
                        <div
                          key={attempt.id || index}
                          className="flex items-center gap-3 p-4"
                        >
                          <div className="w-10 h-10 bg-amber-200 rounded-full border-2 border-gray-900 flex items-center justify-center">
                            <span className="text-sm font-black text-gray-900">
                              {attempt.studentName?.charAt(0).toUpperCase() ||
                                "?"}
                            </span>
                          </div>
                          <div className="flex-1">
                            <p className="font-bold text-gray-900">
                              {attempt.studentName || "Student"}
                            </p>
                            <p className="text-sm text-gray-500">
                              Completed with {attempt.percentage}%
                            </p>
                          </div>
                          <span className="text-sm text-gray-500">
                            {new Date(attempt.completedAt).toLocaleTimeString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </main>

        {/* RIGHT SIDEBAR - Students */}
        <aside
          className={`flex flex-col bg-amber-100 border-l-2 border-gray-900 transition-all duration-200 ${rightSidebarCollapsed ? "w-16" : "w-64"}`}
        >
          {/* Sidebar Header */}
          <div className="flex items-center justify-between p-3 border-b-2 border-gray-900">
            <button
              onClick={() => setRightSidebarCollapsed(!rightSidebarCollapsed)}
              className="w-8 h-8 rounded-lg bg-amber-200 border-2 border-gray-900 hover:bg-amber-300 flex items-center justify-center transition-colors"
            >
              <span className="material-icons-outlined text-gray-900 text-sm">
                {rightSidebarCollapsed ? "chevron_left" : "chevron_right"}
              </span>
            </button>
            {!rightSidebarCollapsed && (
              <span className="text-gray-900 font-black text-xs uppercase tracking-wider">
                Students
              </span>
            )}
          </div>

          {(() => {
            // Get all assigned students from sections (excluding excluded ones)
            const assignedStudents = sections
              .filter((s) => assignedSectionIds.includes(s.id))
              .flatMap((s) => s.students)
              .filter((s) => !excludedStudentIds.includes(s.id))
              .filter(
                (student, index, self) =>
                  index === self.findIndex((s) => s.id === student.id)
              );

            // Get completed student IDs
            const completedStudentIds = attempts.map((a) => a.userId);

            // Pending students = assigned but not completed
            const pendingStudents = assignedStudents.filter(
              (s) => !completedStudentIds.includes(s.id)
            );

            // Filter based on current filter
            const filteredStudents =
              studentFilter === "completed"
                ? attempts
                : studentFilter === "pending"
                  ? pendingStudents
                  : [
                      ...attempts,
                      ...pendingStudents.map((s) => ({
                        ...s,
                        isPending: true,
                      })),
                    ];

            return (
              <>
                {/* Filter Tabs */}
                {!rightSidebarCollapsed && (
                  <div className="p-2 border-b-2 border-gray-900">
                    <div className="flex bg-white border-2 border-gray-900 rounded-lg overflow-hidden">
                      <button
                        onClick={() => setStudentFilter("all")}
                        className={`flex-1 px-2 py-1.5 text-[10px] font-bold transition-colors ${studentFilter === "all" ? "bg-amber-300 text-gray-900" : "bg-white text-gray-600 hover:bg-amber-100"}`}
                      >
                        All
                      </button>
                      <button
                        onClick={() => setStudentFilter("completed")}
                        className={`flex-1 px-2 py-1.5 text-[10px] font-bold border-l-2 border-gray-900 transition-colors ${studentFilter === "completed" ? "bg-amber-300 text-gray-900" : "bg-white text-gray-600 hover:bg-amber-100"}`}
                      >
                        Done
                      </button>
                      <button
                        onClick={() => setStudentFilter("pending")}
                        className={`flex-1 px-2 py-1.5 text-[10px] font-bold border-l-2 border-gray-900 transition-colors ${studentFilter === "pending" ? "bg-amber-300 text-gray-900" : "bg-white text-gray-600 hover:bg-amber-100"}`}
                      >
                        Pending
                      </button>
                    </div>
                  </div>
                )}

                {/* Stats Summary */}
                {!rightSidebarCollapsed && (
                  <div className="p-2 border-b-2 border-gray-900">
                    <div className="flex gap-2">
                      <div className="flex-1 bg-amber-200 border-2 border-gray-900 rounded-lg p-2 text-center">
                        <p className="text-lg font-black text-gray-900">
                          {attempts.length}
                        </p>
                        <p className="text-[9px] font-bold text-gray-700">
                          Completed
                        </p>
                      </div>
                      <div className="flex-1 bg-amber-100 border-2 border-gray-900 rounded-lg p-2 text-center">
                        <p className="text-lg font-black text-gray-900">
                          {pendingStudents.length}
                        </p>
                        <p className="text-[9px] font-bold text-gray-700">
                          Pending
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Collapsed Stats */}
                {rightSidebarCollapsed && (
                  <div className="p-2 flex flex-col gap-2 items-center">
                    <div
                      className="w-10 h-10 bg-amber-200 border-2 border-gray-900 rounded-lg flex items-center justify-center"
                      title="Completed"
                    >
                      <span className="text-sm font-black text-gray-900">
                        {attempts.length}
                      </span>
                    </div>
                    <div
                      className="w-10 h-10 bg-amber-100 border-2 border-gray-900 rounded-lg flex items-center justify-center"
                      title="Pending"
                    >
                      <span className="text-sm font-black text-gray-900">
                        {pendingStudents.length}
                      </span>
                    </div>
                  </div>
                )}

                {/* Student List */}
                <div className="flex-1 overflow-y-auto p-2">
                  {!rightSidebarCollapsed ? (
                    <div className="flex flex-col gap-2">
                      {assignedStudents.length === 0 &&
                      attempts.length === 0 ? (
                        <div className="text-center py-8">
                          <div className="w-12 h-12 bg-amber-200 rounded-full border-2 border-gray-900 flex items-center justify-center mx-auto mb-3">
                            <span className="material-icons-outlined text-gray-700">
                              person_off
                            </span>
                          </div>
                          <p className="text-xs font-bold text-gray-700">
                            No students assigned
                          </p>
                          <p className="text-[10px] text-gray-500 mt-1">
                            Assign sections in Settings
                          </p>
                        </div>
                      ) : studentFilter === "pending" ? (
                        pendingStudents.length === 0 ? (
                          <div className="text-center py-8">
                            <div className="w-12 h-12 bg-amber-200 rounded-full border-2 border-gray-900 flex items-center justify-center mx-auto mb-3">
                              <span className="material-icons-outlined text-gray-700">
                                check_circle
                              </span>
                            </div>
                            <p className="text-xs font-bold text-gray-700">
                              All done
                            </p>
                            <p className="text-[10px] text-gray-500 mt-1">
                              No pending students
                            </p>
                          </div>
                        ) : (
                          pendingStudents.map((student) => (
                            <div
                              key={student.id}
                              className="bg-white border-2 border-gray-900 rounded-xl p-2 hover:bg-amber-50 transition-colors"
                            >
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-amber-100 rounded-full border-2 border-gray-900 flex items-center justify-center flex-shrink-0">
                                  <span className="text-xs font-black text-gray-900">
                                    {student.displayName
                                      ?.charAt(0)
                                      .toUpperCase() ||
                                      student.email?.charAt(0).toUpperCase() ||
                                      "?"}
                                  </span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-bold text-gray-900 truncate">
                                    {student.displayName || "Unknown Student"}
                                  </p>
                                  <p className="text-[9px] text-gray-500 truncate">
                                    {student.email || "No email"}
                                  </p>
                                </div>
                                <span className="text-[9px] font-bold text-amber-600 px-1.5 py-0.5 bg-amber-100 border border-amber-300 rounded">
                                  Pending
                                </span>
                              </div>
                            </div>
                          ))
                        )
                      ) : studentFilter === "completed" ? (
                        attempts.length === 0 ? (
                          <div className="text-center py-8">
                            <div className="w-12 h-12 bg-amber-200 rounded-full border-2 border-gray-900 flex items-center justify-center mx-auto mb-3">
                              <span className="material-icons-outlined text-gray-700">
                                hourglass_empty
                              </span>
                            </div>
                            <p className="text-xs font-bold text-gray-700">
                              No submissions yet
                            </p>
                            <p className="text-[10px] text-gray-500 mt-1">
                              Waiting for students
                            </p>
                          </div>
                        ) : (
                          attempts.map((attempt, index) => (
                            <div
                              key={attempt.id || index}
                              className="bg-white border-2 border-gray-900 rounded-xl p-2 hover:bg-amber-50 transition-colors cursor-pointer"
                              onClick={() => setActiveView("results")}
                            >
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-amber-200 rounded-full border-2 border-gray-900 flex items-center justify-center flex-shrink-0">
                                  <span className="text-xs font-black text-gray-900">
                                    {attempt.studentName
                                      ?.charAt(0)
                                      .toUpperCase() ||
                                      attempt.studentEmail
                                        ?.charAt(0)
                                        .toUpperCase() ||
                                      "?"}
                                  </span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-bold text-gray-900 truncate">
                                    {attempt.studentName || "Unknown Student"}
                                  </p>
                                  <p className="text-[9px] text-gray-500 truncate">
                                    {attempt.studentEmail || "No email"}
                                  </p>
                                </div>
                                <div className="flex flex-col items-end">
                                  <span className="text-xs font-black text-gray-900">
                                    {attempt.percentage}%
                                  </span>
                                  <span className="text-[9px] text-gray-500">
                                    {attempt.score}/{attempt.totalQuestions}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))
                        )
                      ) : (
                        // All - show both completed and pending
                        <>
                          {attempts.map((attempt, index) => (
                            <div
                              key={attempt.id || index}
                              className="bg-white border-2 border-gray-900 rounded-xl p-2 hover:bg-amber-50 transition-colors cursor-pointer"
                              onClick={() => setActiveView("results")}
                            >
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-amber-200 rounded-full border-2 border-gray-900 flex items-center justify-center flex-shrink-0">
                                  <span className="text-xs font-black text-gray-900">
                                    {attempt.studentName
                                      ?.charAt(0)
                                      .toUpperCase() ||
                                      attempt.studentEmail
                                        ?.charAt(0)
                                        .toUpperCase() ||
                                      "?"}
                                  </span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-bold text-gray-900 truncate">
                                    {attempt.studentName || "Unknown Student"}
                                  </p>
                                  <p className="text-[9px] text-gray-500 truncate">
                                    {attempt.studentEmail || "No email"}
                                  </p>
                                </div>
                                <div className="flex flex-col items-end">
                                  <span className="text-xs font-black text-gray-900">
                                    {attempt.percentage}%
                                  </span>
                                  <span className="text-[9px] text-gray-500">
                                    {attempt.score}/{attempt.totalQuestions}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                          {pendingStudents.map((student) => (
                            <div
                              key={student.id}
                              className="bg-white border-2 border-gray-900 rounded-xl p-2 hover:bg-amber-50 transition-colors"
                            >
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-amber-100 rounded-full border-2 border-gray-900 flex items-center justify-center flex-shrink-0">
                                  <span className="text-xs font-black text-gray-900">
                                    {student.displayName
                                      ?.charAt(0)
                                      .toUpperCase() ||
                                      student.email?.charAt(0).toUpperCase() ||
                                      "?"}
                                  </span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-bold text-gray-900 truncate">
                                    {student.displayName || "Unknown Student"}
                                  </p>
                                  <p className="text-[9px] text-gray-500 truncate">
                                    {student.email || "No email"}
                                  </p>
                                </div>
                                <span className="text-[9px] font-bold text-amber-600 px-1.5 py-0.5 bg-amber-100 border border-amber-300 rounded">
                                  Pending
                                </span>
                              </div>
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2 items-center">
                      {attempts.slice(0, 3).map((attempt, index) => (
                        <div
                          key={attempt.id || index}
                          className="w-10 h-10 rounded-full border-2 border-gray-900 flex items-center justify-center cursor-pointer hover:scale-110 transition-transform bg-amber-200"
                          title={`${attempt.studentName || attempt.studentEmail}: ${attempt.percentage}%`}
                          onClick={() => setActiveView("results")}
                        >
                          <span className="text-xs font-black text-gray-900">
                            {attempt.studentName?.charAt(0).toUpperCase() ||
                              attempt.studentEmail?.charAt(0).toUpperCase() ||
                              "?"}
                          </span>
                        </div>
                      ))}
                      {pendingStudents.slice(0, 2).map((student) => (
                        <div
                          key={student.id}
                          className="w-10 h-10 rounded-full border-2 border-gray-900 flex items-center justify-center bg-amber-100"
                          title={`${student.displayName || student.email}: Pending`}
                        >
                          <span className="text-xs font-black text-gray-900">
                            {student.displayName?.charAt(0).toUpperCase() ||
                              student.email?.charAt(0).toUpperCase() ||
                              "?"}
                          </span>
                        </div>
                      ))}
                      {attempts.length + pendingStudents.length > 5 && (
                        <div className="w-10 h-10 bg-amber-200 rounded-full border-2 border-gray-900 flex items-center justify-center">
                          <span className="text-[10px] font-black text-gray-900">
                            +{attempts.length + pendingStudents.length - 5}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* View All Button */}
                {!rightSidebarCollapsed &&
                  (attempts.length > 0 || pendingStudents.length > 0) && (
                    <div className="p-3 border-t-2 border-gray-900">
                      <button
                        onClick={() => setActiveView("results")}
                        className="w-full flex items-center justify-center gap-2 p-2.5 bg-amber-200 hover:bg-amber-300 text-gray-900 font-bold rounded-xl border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(17,24,39,1)] hover:shadow-[3px_3px_0px_0px_rgba(17,24,39,1)] transition-all"
                      >
                        <span className="material-icons-outlined text-sm">
                          analytics
                        </span>
                        <span className="text-xs">View All Results</span>
                      </button>
                    </div>
                  )}
              </>
            );
          })()}
        </aside>
      </div>

      {/* EDIT CONFIRMATION MODAL */}
      {showEditModal && (
        <Modal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          className="w-full max-w-md"
        >
          <div className="bg-amber-50 border-2 border-gray-900 rounded-2xl shadow-[8px_8px_0px_0px_rgba(17,24,39,1)] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b-2 border-gray-900 bg-amber-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-400 rounded-xl flex items-center justify-center border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(17,24,39,1)]">
                  <span className="material-icons-outlined text-gray-900">
                    edit
                  </span>
                </div>
                <h3 className="text-xl font-black text-gray-900">Edit Quiz</h3>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                className="w-10 h-10 bg-amber-300 rounded-xl flex items-center justify-center border-2 border-gray-900 hover:bg-amber-400 transition-colors shadow-[2px_2px_0px_0px_rgba(17,24,39,1)]"
              >
                <span className="material-icons-outlined text-gray-900">
                  close
                </span>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-12 h-12 bg-amber-200 rounded-xl flex items-center justify-center border-2 border-gray-900 flex-shrink-0">
                  <span className="material-icons-outlined text-gray-900 text-2xl">
                    warning
                  </span>
                </div>
                <div>
                  <p className="text-gray-900 font-bold mb-2">
                    Are you sure you want to edit this quiz?
                  </p>
                  <p className="text-gray-600 text-sm">
                    Editing this quiz will open it in the composer. Any changes
                    you make will affect students who haven&apos;t taken the
                    quiz yet.
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 px-4 py-3 bg-white text-gray-900 font-bold rounded-xl border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(17,24,39,1)] hover:shadow-[3px_3px_0px_0px_rgba(17,24,39,1)] hover:-translate-y-0.5 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    router.push(`/teacher/composer?edit=${quizId}`);
                  }}
                  className="flex-1 px-4 py-3 bg-amber-400 text-gray-900 font-bold rounded-xl border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(17,24,39,1)] hover:shadow-[3px_3px_0px_0px_rgba(17,24,39,1)] hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
                >
                  <span className="material-icons-outlined text-sm">edit</span>
                  Edit Quiz
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* SETTINGS MODAL */}
      {showSettingsModal && (
        <Modal
          isOpen={showSettingsModal}
          onClose={() => setShowSettingsModal(false)}
          className="w-full max-w-3xl max-h-[90vh]"
        >
          <div className="bg-amber-50 border-2 border-gray-900 rounded-2xl shadow-[8px_8px_0px_0px_rgba(17,24,39,1)] w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b-2 border-gray-900 bg-amber-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-400 rounded-xl flex items-center justify-center border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(17,24,39,1)]">
                  <span className="material-icons-outlined text-gray-900">
                    settings
                  </span>
                </div>
                <h3 className="text-xl font-black text-gray-900">
                  Quiz Settings
                </h3>
              </div>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="w-10 h-10 bg-amber-300 rounded-xl flex items-center justify-center border-2 border-gray-900 hover:bg-amber-400 transition-colors shadow-[2px_2px_0px_0px_rgba(17,24,39,1)]"
              >
                <span className="material-icons-outlined text-gray-900">
                  close
                </span>
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* Basic Info */}
              <div className="mb-6">
                <h4 className="text-sm font-black text-gray-900 uppercase tracking-wider mb-4">
                  Basic Information
                </h4>
                <div className="bg-white border-2 border-gray-900 rounded-xl p-4 shadow-[2px_2px_0px_0px_rgba(17,24,39,1)]">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-bold text-gray-500 mb-1">
                        Title
                      </p>
                      <p className="font-bold text-gray-900">{quiz.title}</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-500 mb-2">
                        Status
                      </p>
                      <button
                        onClick={() =>
                          setQuizSettings((prev) => ({
                            ...prev,
                            isActive: !prev.isActive,
                          }))
                        }
                        className={`flex items-center gap-2 px-3 py-1.5 text-sm font-bold rounded-lg border-2 border-gray-900 transition-colors ${quizSettings.isActive ? "bg-amber-300" : "bg-gray-300"}`}
                      >
                        <span className="material-icons-outlined text-sm">
                          {quizSettings.isActive ? "toggle_on" : "toggle_off"}
                        </span>
                        {quizSettings.isActive ? "Active" : "Inactive"}
                      </button>
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs font-bold text-gray-500 mb-1">
                        Description
                      </p>
                      <p className="text-gray-700">
                        {quiz.description || "No description"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Time & Attempts */}
              <div className="mb-6">
                <h4 className="text-sm font-black text-gray-900 uppercase tracking-wider mb-4">
                  Time & Attempts
                </h4>
                <div className="bg-white border-2 border-gray-900 rounded-xl p-4 shadow-[2px_2px_0px_0px_rgba(17,24,39,1)]">
                  <div className="flex flex-col gap-4">
                    {/* Duration */}
                    <div>
                      <label className="text-xs font-bold text-gray-500 mb-2 block">
                        Duration (minutes)
                      </label>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {[15, 30, 45, 60, 90].map((mins) => (
                          <button
                            key={mins}
                            onClick={() =>
                              setQuizSettings((prev) => ({
                                ...prev,
                                duration: mins,
                              }))
                            }
                            className={`px-3 py-1.5 rounded-full border-2 font-bold text-xs transition-all ${
                              quizSettings.duration === mins
                                ? "bg-amber-200 border-gray-900 shadow-[2px_2px_0px_0px_rgba(17,24,39,1)]"
                                : "bg-white border-gray-300 hover:border-gray-900"
                            }`}
                          >
                            {mins}m
                          </button>
                        ))}
                        <button
                          onClick={() =>
                            setQuizSettings((prev) => ({
                              ...prev,
                              duration: 0,
                            }))
                          }
                          className={`px-3 py-1.5 rounded-full border-2 font-bold text-xs transition-all ${
                            !quizSettings.duration
                              ? "bg-amber-200 border-gray-900 shadow-[2px_2px_0px_0px_rgba(17,24,39,1)]"
                              : "bg-white border-gray-300 hover:border-gray-900"
                          }`}
                        >
                          No limit
                        </button>
                      </div>
                      <input
                        type="number"
                        min="0"
                        value={quizSettings.duration ?? ""}
                        onChange={(e) =>
                          setQuizSettings((prev) => ({
                            ...prev,
                            duration: parseInt(e.target.value) ?? 0,
                          }))
                        }
                        placeholder="Custom duration..."
                        className="w-full px-3 py-2 bg-amber-50 border-2 border-gray-900 rounded-lg font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
                      />
                    </div>

                    {/* Max Attempts */}
                    <div>
                      <label className="text-xs font-bold text-gray-500 mb-2 block">
                        Max Attempts
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={quizSettings.maxAttempts}
                        onChange={(e) =>
                          setQuizSettings((prev) => ({
                            ...prev,
                            maxAttempts: parseInt(e.target.value) || 1,
                          }))
                        }
                        className="w-full px-3 py-2 bg-amber-50 border-2 border-gray-900 rounded-lg font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
                      />
                    </div>

                    {/* Deadline */}
                    <div>
                      <label className="text-xs font-bold text-gray-500 mb-2 block">
                        Deadline
                      </label>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {[
                          { label: "1 Day", days: 1 },
                          { label: "3 Days", days: 3 },
                          { label: "1 Week", days: 7 },
                        ].map((preset) => {
                          const presetDate = new Date();
                          presetDate.setDate(
                            presetDate.getDate() + preset.days
                          );
                          presetDate.setHours(23, 59, 0, 0);
                          const presetValue = presetDate
                            .toISOString()
                            .slice(0, 16);
                          const isSelected =
                            quizSettings.deadline?.slice(0, 10) ===
                            presetValue.slice(0, 10);
                          return (
                            <button
                              key={preset.days}
                              onClick={() =>
                                setQuizSettings((prev) => ({
                                  ...prev,
                                  deadline: presetValue,
                                }))
                              }
                              className={`px-3 py-1.5 rounded-full border-2 font-bold text-xs transition-all ${
                                isSelected
                                  ? "bg-amber-200 border-gray-900 shadow-[2px_2px_0px_0px_rgba(17,24,39,1)]"
                                  : "bg-white border-gray-300 hover:border-gray-900"
                              }`}
                            >
                              {preset.label}
                            </button>
                          );
                        })}
                        <button
                          onClick={() =>
                            setQuizSettings((prev) => ({
                              ...prev,
                              deadline: "",
                            }))
                          }
                          className={`px-3 py-1.5 rounded-full border-2 font-bold text-xs transition-all ${
                            !quizSettings.deadline
                              ? "bg-amber-200 border-gray-900 shadow-[2px_2px_0px_0px_rgba(17,24,39,1)]"
                              : "bg-white border-gray-300 hover:border-gray-900"
                          }`}
                        >
                          No deadline
                        </button>
                      </div>
                      <input
                        type="datetime-local"
                        value={quizSettings.deadline}
                        onChange={(e) =>
                          setQuizSettings((prev) => ({
                            ...prev,
                            deadline: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-2 bg-amber-50 border-2 border-gray-900 rounded-lg font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Quiz Options */}
              <div className="mb-6">
                <h4 className="text-sm font-black text-gray-900 uppercase tracking-wider mb-4">
                  Quiz Options
                </h4>
                <div className="bg-white border-2 border-gray-900 rounded-xl p-4 shadow-[2px_2px_0px_0px_rgba(17,24,39,1)]">
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() =>
                        setQuizSettings((prev) => ({
                          ...prev,
                          shuffleQuestions: !prev.shuffleQuestions,
                        }))
                      }
                      className={`flex items-center justify-between p-3 rounded-lg border-2 transition-all ${quizSettings.shuffleQuestions ? "bg-amber-200 border-gray-900 shadow-[2px_2px_0px_0px_rgba(17,24,39,1)]" : "bg-white border-gray-300 hover:border-gray-900"}`}
                    >
                      <span className="font-bold text-sm text-gray-900">
                        Shuffle Questions
                      </span>
                      <div
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center ${quizSettings.shuffleQuestions ? "bg-amber-400 border-gray-900" : "bg-white border-gray-400"}`}
                      >
                        {quizSettings.shuffleQuestions && (
                          <span className="material-icons-outlined text-gray-900 text-xs">
                            check
                          </span>
                        )}
                      </div>
                    </button>
                    <button
                      onClick={() =>
                        setQuizSettings((prev) => ({
                          ...prev,
                          shuffleChoices: !prev.shuffleChoices,
                        }))
                      }
                      className={`flex items-center justify-between p-3 rounded-lg border-2 transition-all ${quizSettings.shuffleChoices ? "bg-amber-200 border-gray-900 shadow-[2px_2px_0px_0px_rgba(17,24,39,1)]" : "bg-white border-gray-300 hover:border-gray-900"}`}
                    >
                      <span className="font-bold text-sm text-gray-900">
                        Shuffle Choices
                      </span>
                      <div
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center ${quizSettings.shuffleChoices ? "bg-amber-400 border-gray-900" : "bg-white border-gray-400"}`}
                      >
                        {quizSettings.shuffleChoices && (
                          <span className="material-icons-outlined text-gray-900 text-xs">
                            check
                          </span>
                        )}
                      </div>
                    </button>
                    <button
                      onClick={() =>
                        setQuizSettings((prev) => ({
                          ...prev,
                          showResults: !prev.showResults,
                        }))
                      }
                      className={`flex items-center justify-between p-3 rounded-lg border-2 transition-all ${quizSettings.showResults ? "bg-amber-200 border-gray-900 shadow-[2px_2px_0px_0px_rgba(17,24,39,1)]" : "bg-white border-gray-300 hover:border-gray-900"}`}
                    >
                      <span className="font-bold text-sm text-gray-900">
                        Show Results
                      </span>
                      <div
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center ${quizSettings.showResults ? "bg-amber-400 border-gray-900" : "bg-white border-gray-400"}`}
                      >
                        {quizSettings.showResults && (
                          <span className="material-icons-outlined text-gray-900 text-xs">
                            check
                          </span>
                        )}
                      </div>
                    </button>
                    <button
                      onClick={() =>
                        setQuizSettings((prev) => ({
                          ...prev,
                          allowRetake: !prev.allowRetake,
                        }))
                      }
                      className={`flex items-center justify-between p-3 rounded-lg border-2 transition-all ${quizSettings.allowRetake ? "bg-amber-200 border-gray-900 shadow-[2px_2px_0px_0px_rgba(17,24,39,1)]" : "bg-white border-gray-300 hover:border-gray-900"}`}
                    >
                      <span className="font-bold text-sm text-gray-900">
                        Allow Retake
                      </span>
                      <div
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center ${quizSettings.allowRetake ? "bg-amber-400 border-gray-900" : "bg-white border-gray-400"}`}
                      >
                        {quizSettings.allowRetake && (
                          <span className="material-icons-outlined text-gray-900 text-xs">
                            check
                          </span>
                        )}
                      </div>
                    </button>
                  </div>
                </div>
              </div>

              {/* Anti-Cheat Settings */}
              <div className="mb-6">
                <h4 className="text-sm font-black text-gray-900 uppercase tracking-wider mb-4">
                  Anti-Cheat Measures
                </h4>
                <div className="bg-white border-2 border-gray-900 rounded-xl p-4 shadow-[2px_2px_0px_0px_rgba(17,24,39,1)]">
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <button
                      onClick={() =>
                        setQuizSettings((prev) => ({
                          ...prev,
                          antiCheatEnabled: !prev.antiCheatEnabled,
                        }))
                      }
                      className={`flex items-center justify-between p-3 rounded-lg border-2 transition-all ${quizSettings.antiCheatEnabled ? "bg-amber-200 border-gray-900 shadow-[2px_2px_0px_0px_rgba(17,24,39,1)]" : "bg-white border-gray-300 hover:border-gray-900"}`}
                    >
                      <span className="font-bold text-sm text-gray-900">
                        Prevent Tab Switch
                      </span>
                      <div
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center ${quizSettings.antiCheatEnabled ? "bg-amber-400 border-gray-900" : "bg-white border-gray-400"}`}
                      >
                        {quizSettings.antiCheatEnabled && (
                          <span className="material-icons-outlined text-gray-900 text-xs">
                            check
                          </span>
                        )}
                      </div>
                    </button>
                    <button
                      onClick={() =>
                        setQuizSettings((prev) => ({
                          ...prev,
                          preventCopyPaste: !prev.preventCopyPaste,
                        }))
                      }
                      className={`flex items-center justify-between p-3 rounded-lg border-2 transition-all ${quizSettings.preventCopyPaste ? "bg-amber-200 border-gray-900 shadow-[2px_2px_0px_0px_rgba(17,24,39,1)]" : "bg-white border-gray-300 hover:border-gray-900"}`}
                    >
                      <span className="font-bold text-sm text-gray-900">
                        Prevent Copy/Paste
                      </span>
                      <div
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center ${quizSettings.preventCopyPaste ? "bg-amber-400 border-gray-900" : "bg-white border-gray-400"}`}
                      >
                        {quizSettings.preventCopyPaste && (
                          <span className="material-icons-outlined text-gray-900 text-xs">
                            check
                          </span>
                        )}
                      </div>
                    </button>
                    <button
                      onClick={() =>
                        setQuizSettings((prev) => ({
                          ...prev,
                          fullscreenMode: !prev.fullscreenMode,
                        }))
                      }
                      className={`flex items-center justify-between p-3 rounded-lg border-2 transition-all ${quizSettings.fullscreenMode ? "bg-amber-200 border-gray-900 shadow-[2px_2px_0px_0px_rgba(17,24,39,1)]" : "bg-white border-gray-300 hover:border-gray-900"}`}
                    >
                      <span className="font-bold text-sm text-gray-900">
                        Fullscreen Mode
                      </span>
                      <div
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center ${quizSettings.fullscreenMode ? "bg-amber-400 border-gray-900" : "bg-white border-gray-400"}`}
                      >
                        {quizSettings.fullscreenMode && (
                          <span className="material-icons-outlined text-gray-900 text-xs">
                            check
                          </span>
                        )}
                      </div>
                    </button>
                    <button
                      onClick={() =>
                        setQuizSettings((prev) => ({
                          ...prev,
                          disableRightClick: !prev.disableRightClick,
                        }))
                      }
                      className={`flex items-center justify-between p-3 rounded-lg border-2 transition-all ${quizSettings.disableRightClick ? "bg-amber-200 border-gray-900 shadow-[2px_2px_0px_0px_rgba(17,24,39,1)]" : "bg-white border-gray-300 hover:border-gray-900"}`}
                    >
                      <span className="font-bold text-sm text-gray-900">
                        Disable Right Click
                      </span>
                      <div
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center ${quizSettings.disableRightClick ? "bg-amber-400 border-gray-900" : "bg-white border-gray-400"}`}
                      >
                        {quizSettings.disableRightClick && (
                          <span className="material-icons-outlined text-gray-900 text-xs">
                            check
                          </span>
                        )}
                      </div>
                    </button>
                  </div>
                  {quizSettings.antiCheatEnabled && (
                    <div className="pl-4 border-l-4 border-amber-300 flex items-center gap-3">
                      <label className="text-xs font-bold text-gray-500">
                        Max tab switches:
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={quizSettings.tabChangeLimit}
                        onChange={(e) =>
                          setQuizSettings((prev) => ({
                            ...prev,
                            tabChangeLimit: Math.max(
                              1,
                              Math.min(10, parseInt(e.target.value) || 3)
                            ),
                          }))
                        }
                        className="w-16 px-2 py-1 bg-amber-50 border-2 border-gray-900 rounded-lg font-bold text-center text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Section Assignment */}
              <div className="mb-6">
                <h4 className="text-sm font-black text-gray-900 uppercase tracking-wider mb-4">
                  Assign to Sections
                </h4>
                <div className="bg-white border-2 border-gray-900 rounded-xl shadow-[2px_2px_0px_0px_rgba(17,24,39,1)] overflow-hidden">
                  {sections.length === 0 ? (
                    <div className="p-6 text-center">
                      <div className="w-12 h-12 bg-amber-200 rounded-full border-2 border-gray-900 flex items-center justify-center mx-auto mb-3">
                        <span className="material-icons-outlined text-gray-700">
                          groups
                        </span>
                      </div>
                      <p className="font-bold text-gray-900">No sections yet</p>
                      <p className="text-sm text-gray-600">
                        Create sections to assign this quiz to students
                      </p>
                    </div>
                  ) : (
                    <div className="max-h-80 overflow-y-auto">
                      {sections.map((section) => {
                        const isAssigned = assignedSectionIds.includes(
                          section.id
                        );
                        const isExpanded = expandedSections.includes(
                          section.id
                        );
                        const activeStudents = section.students.filter(
                          (s) => !excludedStudentIds.includes(s.id)
                        );
                        return (
                          <div
                            key={section.id}
                            className="border-b-2 border-gray-200 last:border-b-0"
                          >
                            {/* Section Header */}
                            <div
                              className={`flex items-center gap-3 p-4 transition-colors ${isAssigned ? "bg-amber-100" : "bg-white"}`}
                            >
                              <div
                                onClick={() =>
                                  toggleSectionAssignment(section.id)
                                }
                                className={`w-6 h-6 rounded-lg border-2 border-gray-900 flex items-center justify-center flex-shrink-0 cursor-pointer ${isAssigned ? "bg-amber-400" : "bg-white hover:bg-amber-100"}`}
                              >
                                {isAssigned && (
                                  <span className="material-icons-outlined text-gray-900 text-sm">
                                    check
                                  </span>
                                )}
                              </div>
                              <div
                                className="flex-1 min-w-0 cursor-pointer"
                                onClick={() =>
                                  toggleSectionAssignment(section.id)
                                }
                              >
                                <p className="font-bold text-gray-900">
                                  {section.name}
                                </p>
                                <p className="text-sm text-gray-600 truncate">
                                  {section.description || "No description"}
                                </p>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <div className="w-8 h-8 bg-amber-200 rounded-lg border-2 border-gray-900 flex items-center justify-center">
                                  <span className="text-xs font-black text-gray-900">
                                    {activeStudents.length}/
                                    {section.students.length}
                                  </span>
                                </div>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleSectionExpanded(section.id);
                                  }}
                                  className="w-8 h-8 bg-amber-200 rounded-lg border-2 border-gray-900 flex items-center justify-center hover:bg-amber-300 transition-colors"
                                >
                                  <span className="material-icons-outlined text-gray-900 text-sm">
                                    {isExpanded ? "expand_less" : "expand_more"}
                                  </span>
                                </button>
                              </div>
                            </div>

                            {/* Student List (Expandable) */}
                            {isExpanded && section.students.length > 0 && (
                              <div className="bg-amber-50 border-t-2 border-gray-200 px-4 py-2">
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                                  Students
                                </p>
                                <div className="flex flex-col gap-1">
                                  {section.students.map((student) => {
                                    const isExcluded =
                                      excludedStudentIds.includes(student.id);
                                    return (
                                      <div
                                        key={student.id}
                                        onClick={() =>
                                          toggleStudentExclusion(student.id)
                                        }
                                        className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${isExcluded ? "bg-gray-200 opacity-60" : "bg-white hover:bg-amber-100"} border border-gray-300`}
                                      >
                                        <div
                                          className={`w-5 h-5 rounded border-2 border-gray-900 flex items-center justify-center flex-shrink-0 ${isExcluded ? "bg-white" : "bg-amber-400"}`}
                                        >
                                          {!isExcluded && (
                                            <span className="material-icons-outlined text-gray-900 text-xs">
                                              check
                                            </span>
                                          )}
                                        </div>
                                        <div className="w-7 h-7 bg-amber-200 rounded-full border border-gray-900 flex items-center justify-center flex-shrink-0">
                                          <span className="text-xs font-bold text-gray-900">
                                            {student.displayName
                                              ?.charAt(0)
                                              .toUpperCase() ||
                                              student.email
                                                ?.charAt(0)
                                                .toUpperCase() ||
                                              "?"}
                                          </span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <p
                                            className={`text-sm font-bold ${isExcluded ? "text-gray-500 line-through" : "text-gray-900"}`}
                                          >
                                            {student.displayName || "Unknown"}
                                          </p>
                                          <p
                                            className={`text-xs ${isExcluded ? "text-gray-400" : "text-gray-600"} truncate`}
                                          >
                                            {student.email}
                                          </p>
                                        </div>
                                        {isExcluded && (
                                          <span className="text-xs font-bold text-gray-500 px-2 py-0.5 bg-gray-300 rounded">
                                            Excluded
                                          </span>
                                        )}
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
                {assignedSectionIds.length > 0 && (
                  <p className="mt-2 text-sm text-gray-600">
                    <span className="font-bold">
                      {assignedSectionIds.length}
                    </span>{" "}
                    section{assignedSectionIds.length !== 1 ? "s" : ""} •
                    <span className="font-bold">
                      {" "}
                      {sections
                        .filter((s) => assignedSectionIds.includes(s.id))
                        .reduce(
                          (acc, s) =>
                            acc +
                            s.students.filter(
                              (st) => !excludedStudentIds.includes(st.id)
                            ).length,
                          0
                        )}
                    </span>{" "}
                    students
                    {excludedStudentIds.length > 0 && (
                      <span className="text-gray-500">
                        {" "}
                        ({excludedStudentIds.length} excluded)
                      </span>
                    )}
                  </p>
                )}
              </div>

              {/* Quick Actions */}
              <div>
                <h4 className="text-sm font-black text-gray-900 uppercase tracking-wider mb-4">
                  Quick Actions
                </h4>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => {
                      setShowSettingsModal(false);
                      setShowEditModal(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-amber-200 text-gray-900 font-bold rounded-xl border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(17,24,39,1)] hover:shadow-[3px_3px_0px_0px_rgba(17,24,39,1)] transition-all"
                  >
                    <span className="material-icons-outlined text-sm">
                      edit
                    </span>
                    Edit Questions
                  </button>
                  <button
                    onClick={() => void copyShareLink()}
                    className={`flex items-center gap-2 px-4 py-2 font-bold rounded-xl border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(17,24,39,1)] hover:shadow-[3px_3px_0px_0px_rgba(17,24,39,1)] transition-all ${copied ? "bg-amber-400" : "bg-amber-200"}`}
                  >
                    <span className="material-icons-outlined text-sm">
                      {copied ? "check" : "link"}
                    </span>
                    {copied ? "Copied" : "Copy Link"}
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t-2 border-gray-900 bg-amber-100 flex gap-3">
              <button
                onClick={() => setShowSettingsModal(false)}
                className="flex-1 px-4 py-3 bg-white text-gray-900 font-bold rounded-xl border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(17,24,39,1)] hover:shadow-[3px_3px_0px_0px_rgba(17,24,39,1)] transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => void saveAllSettings()}
                disabled={savingSections || savingSettings}
                className="flex-1 px-4 py-3 bg-amber-400 text-gray-900 font-bold rounded-xl border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(17,24,39,1)] hover:shadow-[3px_3px_0px_0px_rgba(17,24,39,1)] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <span className="material-icons-outlined text-sm">
                  {savingSections || savingSettings ? "sync" : "save"}
                </span>
                {savingSections || savingSettings
                  ? "Saving..."
                  : "Save Changes"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
