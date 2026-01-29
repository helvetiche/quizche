/* eslint-disable @typescript-eslint/no-misused-promises */
/* eslint-disable @typescript-eslint/strict-boolean-expressions, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unnecessary-condition, @typescript-eslint/prefer-nullish-coalescing, @typescript-eslint/explicit-function-return-type */
"use client";

import { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useQuizView } from "./QuizViewContext";

type Quiz = {
  id: string;
  title: string;
  isActive: boolean;
  duration?: number;
  availableDate?: string;
  dueDate?: string;
  allowRetake?: boolean;
  showResults?: boolean;
  sectionIds?: string[];
  antiCheat?: {
    enabled?: boolean;
    tabChangeLimit?: number;
    timeAwayThreshold?: number;
    autoDisqualifyOnRefresh?: boolean;
    autoSubmitOnDisqualification?: boolean;
  };
};

type Section = {
  id: string;
  name: string;
  description?: string;
};

type QuizSettingsViewProps = {
  quizId: string;
};

export default function QuizSettingsView({ quizId }: QuizSettingsViewProps) {
  const { goToDetail } = useQuizView();
  const [idToken, setIdToken] = useState<string | null>(null);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(true);
  const [duration, setDuration] = useState<number | null>(null);
  const [availableDate, setAvailableDate] = useState<string>("");
  const [availableTime, setAvailableTime] = useState<string>("");
  const [dueDate, setDueDate] = useState<string>("");
  const [dueTime, setDueTime] = useState<string>("");
  const [allowRetake, setAllowRetake] = useState(false);
  const [showResults, setShowResults] = useState(true);
  const [sections, setSections] = useState<Section[]>([]);
  const [selectedSectionIds, setSelectedSectionIds] = useState<string[]>([]);
  const [loadingSections, setLoadingSections] = useState(false);
  const [antiCheatEnabled, setAntiCheatEnabled] = useState(true);
  const [tabChangeLimit, setTabChangeLimit] = useState(3);
  const [timeAwayThreshold, setTimeAwayThreshold] = useState(5);
  const [autoDisqualifyOnRefresh, setAutoDisqualifyOnRefresh] = useState(true);
  const [autoSubmitOnDisqualification, setAutoSubmitOnDisqualification] =
    useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser !== undefined && currentUser !== null) {
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
    const fetchQuiz = async (): Promise<void> => {
      if (!idToken || !quizId) return;

      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/quizzes/${quizId}`, {
          headers: { Authorization: `Bearer ${idToken}` },
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to fetch quiz");
        }

        setQuiz(data.quiz);
        setIsActive(
          data.quiz.isActive !== undefined ? data.quiz.isActive : true
        );
        setDuration(data.quiz.duration || null);

        if (
          data.quiz.availableDate !== undefined &&
          data.quiz.availableDate !== null
        ) {
          const date = new Date(data.quiz.availableDate);
          setAvailableDate(date.toISOString().slice(0, 10));
          setAvailableTime(date.toTimeString().slice(0, 5));
        }

        if (data.quiz.dueDate !== undefined && data.quiz.dueDate !== null) {
          const date = new Date(data.quiz.dueDate);
          setDueDate(date.toISOString().slice(0, 10));
          setDueTime(date.toTimeString().slice(0, 5));
        }

        setAllowRetake(
          data.quiz.allowRetake !== undefined ? data.quiz.allowRetake : false
        );
        setShowResults(
          data.quiz.showResults !== undefined ? data.quiz.showResults : true
        );
        setSelectedSectionIds(data.quiz.sectionIds ?? ([] as never[]));

        const antiCheat = data.quiz.antiCheat ?? {};
        setAntiCheatEnabled(
          antiCheat.enabled !== undefined ? antiCheat.enabled : true
        );
        setTabChangeLimit(antiCheat.tabChangeLimit || 3);
        setTimeAwayThreshold(antiCheat.timeAwayThreshold || 5);
        setAutoDisqualifyOnRefresh(
          antiCheat.autoDisqualifyOnRefresh !== undefined
            ? antiCheat.autoDisqualifyOnRefresh
            : true
        );
        setAutoSubmitOnDisqualification(
          antiCheat.autoSubmitOnDisqualification !== undefined
            ? antiCheat.autoSubmitOnDisqualification
            : true
        );
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
    const fetchSections = async (): Promise<void> => {
      if (!idToken) return;

      try {
        setLoadingSections(true);
        const response = await fetch("/api/teacher/sections", {
          headers: { Authorization: `Bearer ${idToken}` },
        });

        const data = await response.json();

        if (response.ok !== undefined && response.ok !== null) {
          setSections(data.sections ?? ([] as never[]));
        }
      } catch (err) {
        console.error("Error fetching sections:", err);
      } finally {
        setLoadingSections(false);
      }
    };

    void fetchSections();
  }, [idToken]);

  const handleSave = async (): Promise<void> => {
    if (!idToken || !quizId || !quiz) return;

    try {
      setSaving(true);
      setError(null);

      const quizResponse = await fetch(`/api/quizzes/${quizId}`, {
        headers: { Authorization: `Bearer ${idToken}` },
      });

      const quizData = await quizResponse.json();

      if (!quizResponse.ok) {
        throw new Error(quizData.error || "Failed to fetch quiz data");
      }

      const availableDateTime =
        availableDate && availableTime
          ? new Date(`${availableDate}T${availableTime}`).toISOString()
          : null;

      const dueDateTime =
        dueDate && dueTime
          ? new Date(`${dueDate}T${dueTime}`).toISOString()
          : null;

      const { apiPut } = await import("../../../../lib/api");
      const response = await apiPut(`/api/quizzes/${quizId}`, {
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: quizData.quiz.title,
          description: quizData.quiz.description ?? "",
          questions: quizData.quiz.questions,
          isActive,
          duration: duration || null,
          availableDate: availableDateTime,
          dueDate: dueDateTime,
          allowRetake,
          showResults,
          sectionIds: selectedSectionIds,
          antiCheat: {
            enabled: antiCheatEnabled,
            tabChangeLimit,
            timeAwayThreshold,
            autoDisqualifyOnRefresh,
            autoSubmitOnDisqualification,
          },
        }),
        idToken,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update quiz settings");
      }

      console.error("Quiz settings updated successfully");
      goToDetail(quizId);
    } catch (err) {
      console.error("Error updating quiz:", err);
      setError(
        err instanceof Error ? err.message : "Failed to update settings"
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading !== undefined && loading !== null) {
    return (
      <div className="bg-white border-4 border-gray-900 p-12 shadow-[4px_4px_0px_0px_rgba(31,41,55,1)] flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border-3 border-gray-900 border-t-transparent rounded-full animate-spin"></div>
          <span className="font-bold text-gray-900">Loading settings...</span>
        </div>
      </div>
    );
  }

  if (error !== undefined && error !== null) {
    return (
      <div className="bg-red-400 border-4 border-gray-900 p-8 shadow-[4px_4px_0px_0px_rgba(31,41,55,1)] flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center border-3 border-gray-900">
          <span className="material-icons-outlined text-red-500 text-2xl">
            error
          </span>
        </div>
        <p className="text-lg font-bold text-gray-900">{error}</p>
        <button
          onClick={() => goToDetail(quizId)}
          className="px-6 py-3 bg-white text-gray-900 font-bold border-3 border-gray-900 shadow-[3px_3px_0px_0px_rgba(31,41,55,1)] hover:shadow-[4px_4px_0px_0px_rgba(31,41,55,1)] transition-all"
        >
          Go Back
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
          <div className="w-12 h-12 bg-orange-400 rounded-xl flex items-center justify-center border-3 border-gray-900 shadow-[3px_3px_0px_0px_rgba(31,41,55,1)]">
            <span className="material-icons-outlined text-gray-900 text-2xl">
              settings
            </span>
          </div>
          <div>
            <h2 className="text-3xl font-black text-gray-900">Quiz Settings</h2>
            <p className="text-sm font-bold text-gray-600">
              [ configure your assessment ]
            </p>
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

      <div className="flex flex-col gap-6 max-w-2xl">
        {/* Quiz Title Card */}
        <div className="bg-white border-4 border-gray-900 shadow-[4px_4px_0px_0px_rgba(31,41,55,1)] overflow-hidden">
          <div className="bg-cyan-400 border-b-4 border-gray-900 px-5 py-3">
            <div className="flex items-center gap-2">
              <span className="material-icons-outlined text-gray-900">
                quiz
              </span>
              <span className="font-bold text-gray-900">{quiz.title}</span>
            </div>
          </div>
        </div>

        {/* Quiz Status */}
        <div className="bg-white border-4 border-gray-900 shadow-[4px_4px_0px_0px_rgba(31,41,55,1)] p-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="material-icons-outlined text-gray-900">
              toggle_on
            </span>
            <h3 className="text-lg font-black text-gray-900">Quiz Status</h3>
          </div>
          <label className="flex items-center gap-4 cursor-pointer p-4 bg-amber-50 border-3 border-gray-900 hover:bg-amber-100 transition-colors">
            <div
              className={`w-12 h-7 rounded-full border-3 border-gray-900 relative transition-colors ${isActive ? "bg-lime-400" : "bg-gray-300"}`}
            >
              <div
                className={`absolute top-0.5 w-5 h-5 bg-white rounded-full border-2 border-gray-900 transition-transform ${isActive ? "translate-x-5" : "translate-x-0.5"}`}
              ></div>
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-gray-900">
                {isActive ? "Active" : "Inactive"}
              </span>
              <span className="text-sm font-medium text-gray-600">
                {isActive
                  ? "Students can access and take this quiz"
                  : "Quiz is hidden from students"}
              </span>
            </div>
          </label>
        </div>

        {/* Duration & Timing */}
        <div className="bg-white border-4 border-gray-900 shadow-[4px_4px_0px_0px_rgba(31,41,55,1)] p-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="material-icons-outlined text-gray-900">
              schedule
            </span>
            <h3 className="text-lg font-black text-gray-900">
              Duration & Timing
            </h3>
          </div>

          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-gray-900">
                Duration (minutes)
              </label>
              <input
                type="number"
                min="1"
                value={duration ?? ""}
                onChange={(e) =>
                  setDuration(e.target.value ? parseInt(e.target.value) : null)
                }
                className="w-full px-4 py-3 border-3 border-gray-900 bg-amber-50 font-medium placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-400"
                placeholder="Enter duration (optional)"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-gray-900">
                Available From
              </label>
              <div className="flex gap-3">
                <input
                  type="date"
                  value={availableDate}
                  onChange={(e) => setAvailableDate(e.target.value)}
                  className="flex-1 px-4 py-3 border-3 border-gray-900 bg-amber-50 font-medium focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
                <input
                  type="time"
                  value={availableTime}
                  onChange={(e) => setAvailableTime(e.target.value)}
                  className="flex-1 px-4 py-3 border-3 border-gray-900 bg-amber-50 font-medium focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-gray-900">
                Due Date
              </label>
              <div className="flex gap-3">
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="flex-1 px-4 py-3 border-3 border-gray-900 bg-amber-50 font-medium focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
                <input
                  type="time"
                  value={dueTime}
                  onChange={(e) => setDueTime(e.target.value)}
                  className="flex-1 px-4 py-3 border-3 border-gray-900 bg-amber-50 font-medium focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section Assignment */}
        <div className="bg-white border-4 border-gray-900 shadow-[4px_4px_0px_0px_rgba(31,41,55,1)] p-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="material-icons-outlined text-gray-900">
              groups
            </span>
            <h3 className="text-lg font-black text-gray-900">
              Section Assignment
            </h3>
          </div>

          {loadingSections ? (
            <div className="flex items-center gap-2 p-4 bg-amber-50 border-2 border-gray-900">
              <div className="w-4 h-4 border-2 border-gray-900 border-t-transparent rounded-full animate-spin"></div>
              <span className="font-medium text-gray-600">
                Loading sections...
              </span>
            </div>
          ) : sections.length === 0 ? (
            <div className="p-4 bg-amber-100 border-3 border-gray-900 text-center">
              <span className="font-bold text-gray-700">
                No sections available
              </span>
            </div>
          ) : (
            <div className="flex flex-col gap-2 max-h-48 overflow-y-auto border-3 border-gray-900 bg-amber-50 p-3">
              {sections.map((section) => (
                <label
                  key={section.id}
                  className={`flex items-center gap-3 cursor-pointer p-3 border-2 border-gray-900 transition-colors ${
                    selectedSectionIds.includes(section.id)
                      ? "bg-purple-400"
                      : "bg-white hover:bg-amber-100"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedSectionIds.includes(section.id)}
                    onChange={(e) => {
                      if (
                        e.target.checked !== undefined &&
                        e.target.checked !== null
                      ) {
                        setSelectedSectionIds([
                          ...selectedSectionIds,
                          section.id,
                        ]);
                      } else {
                        setSelectedSectionIds(
                          selectedSectionIds.filter((id) => id !== section.id)
                        );
                      }
                    }}
                    className="w-5 h-5 border-2 border-gray-900 accent-purple-600"
                  />
                  <span className="font-bold text-gray-900">
                    {section.name}
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Quiz Options */}
        <div className="bg-white border-4 border-gray-900 shadow-[4px_4px_0px_0px_rgba(31,41,55,1)] p-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="material-icons-outlined text-gray-900">tune</span>
            <h3 className="text-lg font-black text-gray-900">Quiz Options</h3>
          </div>

          <div className="flex flex-col gap-3">
            <label
              className={`flex items-center gap-3 cursor-pointer p-3 border-3 border-gray-900 transition-colors ${allowRetake ? "bg-lime-400" : "bg-amber-50 hover:bg-amber-100"}`}
            >
              <input
                type="checkbox"
                checked={allowRetake}
                onChange={(e) => setAllowRetake(e.target.checked)}
                className="w-5 h-5 border-2 border-gray-900 accent-lime-600"
              />
              <div className="flex flex-col">
                <span className="font-bold text-gray-900">Allow Retake</span>
                <span className="text-sm font-medium text-gray-600">
                  Students can attempt the quiz multiple times
                </span>
              </div>
            </label>
            <label
              className={`flex items-center gap-3 cursor-pointer p-3 border-3 border-gray-900 transition-colors ${showResults ? "bg-cyan-400" : "bg-amber-50 hover:bg-amber-100"}`}
            >
              <input
                type="checkbox"
                checked={showResults}
                onChange={(e) => setShowResults(e.target.checked)}
                className="w-5 h-5 border-2 border-gray-900 accent-cyan-600"
              />
              <div className="flex flex-col">
                <span className="font-bold text-gray-900">
                  Show Results Immediately
                </span>
                <span className="text-sm font-medium text-gray-600">
                  Display score and answers after submission
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* Anti-Cheat */}
        <div className="bg-white border-4 border-gray-900 shadow-[4px_4px_0px_0px_rgba(31,41,55,1)] p-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="material-icons-outlined text-gray-900">
              security
            </span>
            <h3 className="text-lg font-black text-gray-900">
              Anti-Cheating Configuration
            </h3>
          </div>

          <label
            className={`flex items-center gap-3 cursor-pointer p-3 border-3 border-gray-900 mb-4 transition-colors ${antiCheatEnabled ? "bg-red-400" : "bg-amber-50 hover:bg-amber-100"}`}
          >
            <input
              type="checkbox"
              checked={antiCheatEnabled}
              onChange={(e) => setAntiCheatEnabled(e.target.checked)}
              className="w-5 h-5 border-2 border-gray-900 accent-red-600"
            />
            <div className="flex flex-col">
              <span className="font-bold text-gray-900">
                Enable Anti-Cheating Measures
              </span>
              <span className="text-sm font-medium text-gray-700">
                Monitor and restrict suspicious behavior
              </span>
            </div>
          </label>

          {antiCheatEnabled && (
            <div className="flex flex-col gap-4 p-4 bg-red-100 border-3 border-gray-900">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-gray-900">
                  Tab Change Limit
                </label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={tabChangeLimit}
                  onChange={(e) =>
                    setTabChangeLimit(parseInt(e.target.value) ?? 0)
                  }
                  className="w-full px-4 py-3 border-3 border-gray-900 bg-white font-medium focus:outline-none focus:ring-2 focus:ring-red-400"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-gray-900">
                  Time Away Threshold (seconds)
                </label>
                <input
                  type="number"
                  min="0"
                  max="300"
                  value={timeAwayThreshold}
                  onChange={(e) =>
                    setTimeAwayThreshold(parseInt(e.target.value) ?? 0)
                  }
                  className="w-full px-4 py-3 border-3 border-gray-900 bg-white font-medium focus:outline-none focus:ring-2 focus:ring-red-400"
                />
              </div>
              <label
                className={`flex items-center gap-3 cursor-pointer p-3 border-2 border-gray-900 transition-colors ${autoDisqualifyOnRefresh ? "bg-orange-400" : "bg-white hover:bg-amber-50"}`}
              >
                <input
                  type="checkbox"
                  checked={autoDisqualifyOnRefresh}
                  onChange={(e) => setAutoDisqualifyOnRefresh(e.target.checked)}
                  className="w-5 h-5 border-2 border-gray-900"
                />
                <span className="font-bold text-gray-900">
                  Auto-Disqualify on Page Refresh
                </span>
              </label>
              <label
                className={`flex items-center gap-3 cursor-pointer p-3 border-2 border-gray-900 transition-colors ${autoSubmitOnDisqualification ? "bg-orange-400" : "bg-white hover:bg-amber-50"}`}
              >
                <input
                  type="checkbox"
                  checked={autoSubmitOnDisqualification}
                  onChange={(e) =>
                    setAutoSubmitOnDisqualification(e.target.checked)
                  }
                  className="w-5 h-5 border-2 border-gray-900"
                />
                <span className="font-bold text-gray-900">
                  Auto-Submit on Disqualification
                </span>
              </label>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <button
            onClick={() => void handleSave()}
            disabled={saving}
            className="flex-1 px-6 py-4 bg-lime-400 text-gray-900 font-bold border-4 border-gray-900 shadow-[5px_5px_0px_0px_rgba(31,41,55,1)] hover:shadow-[6px_6px_0px_0px_rgba(31,41,55,1)] hover:-translate-x-0.5 hover:-translate-y-0.5 active:shadow-[2px_2px_0px_0px_rgba(31,41,55,1)] active:translate-x-0.5 active:translate-y-0.5 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving && (
              <div className="w-5 h-5 border-3 border-gray-900 border-t-transparent rounded-full animate-spin"></div>
            )}
            <span className="material-icons-outlined">save</span>
            <span>{saving ? "Saving..." : "Save Settings"}</span>
          </button>
          <button
            onClick={() => goToDetail(quizId)}
            className="px-6 py-4 bg-amber-200 text-gray-900 font-bold border-4 border-gray-900 shadow-[5px_5px_0px_0px_rgba(31,41,55,1)] hover:shadow-[6px_6px_0px_0px_rgba(31,41,55,1)] active:shadow-[2px_2px_0px_0px_rgba(31,41,55,1)] transition-all"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
