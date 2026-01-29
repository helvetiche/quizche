/* eslint-disable @typescript-eslint/no-misused-promises */
/* eslint-disable @typescript-eslint/strict-boolean-expressions, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unnecessary-condition, @typescript-eslint/prefer-nullish-coalescing, @typescript-eslint/explicit-function-return-type, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-return */
"use client";

import { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import QuizForm, { type GeneratedQuizData } from "../../../create/QuizForm";
import PDFUploadModal from "../../../create/PDFUploadModal";
import { useQuizView } from "./QuizViewContext";
import Modal from "@/components/Modal";

type QuizSettings = {
  title: string;
  description: string;
  duration: number | null;
  deadline: string;
  shuffleQuestions: boolean;
  shuffleChoices: boolean;
  showResults: boolean;
  allowRetake: boolean;
  maxAttempts: number;
  preventTabSwitch: boolean;
  preventCopyPaste: boolean;
  fullscreenMode: boolean;
  webcamProctoring: boolean;
  disableRightClick: boolean;
  lockdownBrowser: boolean;
};

export default function QuizCreateView() {
  const { goToList, goToDetail } = useQuizView();
  const [idToken, setIdToken] = useState<string | null>(null);
  const [initialQuizData, setInitialQuizData] = useState<
    GeneratedQuizData | undefined
  >(undefined);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);
  const [currentDraftId, setCurrentDraftId] = useState<string | undefined>(
    undefined
  );
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [settings, setSettings] = useState<QuizSettings>({
    title: "",
    description: "",
    duration: null,
    deadline: "",
    shuffleQuestions: false,
    shuffleChoices: false,
    showResults: true,
    allowRetake: false,
    maxAttempts: 1,
    preventTabSwitch: true,
    preventCopyPaste: true,
    fullscreenMode: false,
    webcamProctoring: false,
    disableRightClick: true,
    lockdownBrowser: false,
  });

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

  const handleSaveQuiz = async (quiz: GeneratedQuizData) => {
    if (!idToken) return;
    try {
      const quizData = {
        title: settings.title.trim() || quiz.title.trim(),
        description: settings.description.trim() || quiz.description.trim(),
        isActive: true,
        duration: settings.duration,
        deadline: settings.deadline,
        shuffleQuestions: settings.shuffleQuestions,
        shuffleChoices: settings.shuffleChoices,
        showResults: settings.showResults,
        allowRetake: settings.allowRetake,
        maxAttempts: settings.maxAttempts,
        preventTabSwitch: settings.preventTabSwitch,
        preventCopyPaste: settings.preventCopyPaste,
        fullscreenMode: settings.fullscreenMode,
        webcamProctoring: settings.webcamProctoring,
        disableRightClick: settings.disableRightClick,
        lockdownBrowser: settings.lockdownBrowser,
        questions: quiz.questions.map((q) => {
          const questionData: any = {
            question: q.question.trim(),
            type: q.type,
            answer: q.answer.trim(),
          };
          if (
            q.type === "multiple_choice" &&
            q.choices &&
            Array.isArray(q.choices)
          ) {
            const filteredChoices = q.choices
              .filter((c) => c.trim().length > 0)
              .map((c) => c.trim());
            if (filteredChoices.length > 0)
              questionData.choices = filteredChoices;
          }
          return questionData;
        }),
      };

      const { apiPost } = await import("../../../../lib/api");
      const response = await apiPost("/api/quizzes", {
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(quizData),
        idToken,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to create quiz");
      console.error("Quiz created successfully");
      goToDetail(data.id);
    } catch (error) {
      console.error("Error creating quiz:", error);
      console.error(
        error instanceof Error
          ? error.message
          : "Failed to create quiz. Please try again."
      );
    }
  };

  const handleSettingChange = (key: keyof QuizSettings, value: any): void => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleDraftSaved = (draftId: string): void => {
    setCurrentDraftId(draftId);
    setLastSaved(new Date());
  };

  const formatLastSaved = (): string | null => {
    if (!lastSaved) return null;
    const now = new Date();
    const diff = Math.floor((now.getTime() - lastSaved.getTime()) / 1000);
    if (diff < 60) return "Saved just now";
    if (diff < 3600) return `Saved ${Math.floor(diff / 60)}m ago`;
    return `Saved at ${lastSaved.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  };

  return (
    <>
      {/* Full-page overlay that breaks out of parent container */}
      <div className="fixed inset-0 z-40 flex flex-col bg-gray-900">
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-4 py-3 bg-gray-900 border-b border-gray-800">
          <div className="flex items-center gap-4">
            <button
              onClick={() => void goToList()}
              className="w-10 h-10 bg-gray-800 text-gray-300 rounded-xl flex items-center justify-center border border-gray-700 hover:bg-gray-700 hover:text-white transition-colors"
            >
              <span className="material-icons-outlined">arrow_back</span>
            </button>
            <div>
              <h2 className="text-lg font-bold text-white">
                {settings.title || "Untitled Quiz"}
              </h2>
              <p className="text-xs text-gray-500">
                {settings.description || "Add title & description in settings"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {currentDraftId && (
              <span className="text-xs text-green-400 px-3 py-1 bg-green-900/30 rounded-full flex items-center gap-1">
                <span className="material-icons-outlined text-xs">
                  check_circle
                </span>
                Draft saved
              </span>
            )}
            <span className="text-xs text-gray-500 px-3 py-1 bg-gray-800 rounded-full">
              {formatLastSaved() || "Not saved"}
            </span>
          </div>
        </div>

        {/* Main Content - Full Height */}
        {idToken ? (
          <QuizForm
            idToken={idToken}
            draftId={currentDraftId}
            initialData={initialQuizData}
            title={settings.title}
            description={settings.description}
            onOpenSettings={() => setShowSettingsModal(true)}
            onOpenAIGenerate={() => setShowAIModal(true)}
            onDraftSaved={handleDraftSaved}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-900">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
              <span className="font-bold text-white">Loading...</span>
            </div>
          </div>
        )}
      </div>

      {/* AI Generate Modal */}
      {idToken && (
        <PDFUploadModal
          isOpen={showAIModal}
          onClose={() => setShowAIModal(false)}
          onSave={handleSaveQuiz}
          onEdit={(quiz) => {
            setInitialQuizData(quiz);
            setShowAIModal(false);
          }}
          idToken={idToken}
        />
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <Modal
          isOpen={showSettingsModal}
          onClose={() => setShowSettingsModal(false)}
          className="w-full max-w-2xl max-h-[90vh]"
        >
          <div className="bg-amber-50 border-3 border-gray-900 rounded-2xl shadow-[8px_8px_0px_0px_rgba(17,24,39,1)] w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b-2 border-gray-900 bg-amber-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-400 rounded-lg flex items-center justify-center border-2 border-gray-900">
                  <span className="material-icons-outlined text-gray-900">
                    tune
                  </span>
                </div>
                <h3 className="text-xl font-black text-gray-900">
                  Quiz Settings
                </h3>
              </div>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="w-8 h-8 bg-red-400 rounded-lg flex items-center justify-center border-2 border-gray-900 hover:bg-red-500 transition-colors"
              >
                <span className="material-icons-outlined text-gray-900 text-lg">
                  close
                </span>
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-6">
              {/* Quiz Info */}
              <div className="flex flex-col gap-4">
                <h4 className="text-sm font-black text-gray-900 uppercase tracking-wider flex items-center gap-2">
                  <span className="material-icons-outlined text-base">
                    info
                  </span>
                  Quiz Information
                </h4>
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-bold text-gray-700">
                      Quiz Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={settings.title}
                      onChange={(e) =>
                        handleSettingChange("title", e.target.value)
                      }
                      placeholder="Enter quiz title..."
                      className="px-3 py-2 bg-white border-2 border-gray-900 rounded-lg font-medium focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-bold text-gray-700">
                      Description
                    </label>
                    <textarea
                      value={settings.description}
                      onChange={(e) =>
                        handleSettingChange("description", e.target.value)
                      }
                      placeholder="Enter quiz description (optional)..."
                      rows={3}
                      className="px-3 py-2 bg-white border-2 border-gray-900 rounded-lg font-medium focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* General Settings */}
              <div className="flex flex-col gap-4">
                <h4 className="text-sm font-black text-gray-900 uppercase tracking-wider flex items-center gap-2">
                  <span className="material-icons-outlined text-base">
                    settings
                  </span>
                  General Settings
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-bold text-gray-700">
                      Time Limit (minutes)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={settings.duration ?? ""}
                      onChange={(e) =>
                        handleSettingChange(
                          "duration",
                          e.target.value ? parseInt(e.target.value) : null
                        )
                      }
                      placeholder="No limit"
                      className="px-3 py-2 bg-white border-2 border-gray-900 rounded-lg font-medium focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-bold text-gray-700">
                      Deadline
                    </label>
                    <input
                      type="datetime-local"
                      value={settings.deadline}
                      onChange={(e) =>
                        handleSettingChange("deadline", e.target.value)
                      }
                      className="px-3 py-2 bg-white border-2 border-gray-900 rounded-lg font-medium focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-bold text-gray-700">
                      Max Attempts
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={settings.maxAttempts}
                      onChange={(e) =>
                        handleSettingChange(
                          "maxAttempts",
                          parseInt(e.target.value) || 1
                        )
                      }
                      className="px-3 py-2 bg-white border-2 border-gray-900 rounded-lg font-medium focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-3">
                  <ToggleOption
                    label="Shuffle Questions"
                    icon="shuffle"
                    checked={settings.shuffleQuestions}
                    onChange={(v) => handleSettingChange("shuffleQuestions", v)}
                  />
                  <ToggleOption
                    label="Shuffle Choices"
                    icon="swap_vert"
                    checked={settings.shuffleChoices}
                    onChange={(v) => handleSettingChange("shuffleChoices", v)}
                  />
                  <ToggleOption
                    label="Show Results"
                    icon="visibility"
                    checked={settings.showResults}
                    onChange={(v) => handleSettingChange("showResults", v)}
                  />
                  <ToggleOption
                    label="Allow Retake"
                    icon="replay"
                    checked={settings.allowRetake}
                    onChange={(v) => handleSettingChange("allowRetake", v)}
                  />
                </div>
              </div>

              {/* Anti-Cheat Settings */}
              <div className="flex flex-col gap-4">
                <h4 className="text-sm font-black text-gray-900 uppercase tracking-wider flex items-center gap-2">
                  <span className="material-icons-outlined text-base">
                    security
                  </span>
                  Anti-Cheat Protection
                </h4>
                <div className="bg-amber-100 border-2 border-gray-900 rounded-xl p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <ToggleOption
                      label="Prevent Tab Switch"
                      icon="tab"
                      description="Detect when student leaves"
                      checked={settings.preventTabSwitch}
                      onChange={(v) =>
                        handleSettingChange("preventTabSwitch", v)
                      }
                    />
                    <ToggleOption
                      label="Prevent Copy/Paste"
                      icon="content_copy"
                      description="Disable clipboard"
                      checked={settings.preventCopyPaste}
                      onChange={(v) =>
                        handleSettingChange("preventCopyPaste", v)
                      }
                    />
                    <ToggleOption
                      label="Fullscreen Mode"
                      icon="fullscreen"
                      description="Force fullscreen"
                      checked={settings.fullscreenMode}
                      onChange={(v) => handleSettingChange("fullscreenMode", v)}
                    />
                    <ToggleOption
                      label="Disable Right Click"
                      icon="mouse"
                      description="No context menu"
                      checked={settings.disableRightClick}
                      onChange={(v) =>
                        handleSettingChange("disableRightClick", v)
                      }
                    />
                    <ToggleOption
                      label="Webcam Proctoring"
                      icon="videocam"
                      description="Monitor via webcam"
                      checked={settings.webcamProctoring}
                      onChange={(v) =>
                        handleSettingChange("webcamProctoring", v)
                      }
                      premium
                    />
                    <ToggleOption
                      label="Lockdown Browser"
                      icon="lock"
                      description="Secure browser"
                      checked={settings.lockdownBrowser}
                      onChange={(v) =>
                        handleSettingChange("lockdownBrowser", v)
                      }
                      premium
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-3 px-5 py-4 border-t-2 border-gray-900 bg-amber-100">
              <button
                onClick={() => setShowSettingsModal(false)}
                className="px-5 py-2.5 bg-gray-200 text-gray-900 font-bold border-2 border-gray-900 rounded-full hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="px-5 py-2.5 bg-amber-400 text-gray-900 font-bold border-2 border-gray-900 rounded-full shadow-[3px_3px_0px_0px_rgba(17,24,39,1)] hover:shadow-[4px_4px_0px_0px_rgba(17,24,39,1)] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all flex items-center gap-2"
              >
                <span className="material-icons-outlined text-lg">check</span>
                Save Settings
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

function ToggleOption({
  label,
  icon,
  description,
  checked,
  onChange,
  premium,
}: {
  label: string;
  icon: string;
  description?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  premium?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`flex items-start gap-3 p-3 rounded-xl border-2 transition-all text-left ${checked ? "bg-gray-900 text-amber-100 border-gray-900" : "bg-white text-gray-900 border-gray-300 hover:border-gray-900"}`}
    >
      <div
        className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${checked ? "bg-amber-400" : "bg-amber-100"} border-2 border-gray-900`}
      >
        <span className="material-icons-outlined text-gray-900 text-sm">
          {icon}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-bold text-sm">{label}</span>
          {premium && (
            <span className="px-1.5 py-0.5 bg-amber-400 text-gray-900 text-[10px] font-black rounded border border-gray-900">
              PRO
            </span>
          )}
        </div>
        {description && (
          <p
            className={`text-xs mt-0.5 ${checked ? "text-amber-200" : "text-gray-500"}`}
          >
            {description}
          </p>
        )}
      </div>
      <div
        className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 ${checked ? "bg-amber-400 border-gray-900" : "bg-white border-gray-400"}`}
      >
        {checked && (
          <span className="material-icons-outlined text-gray-900 text-sm">
            check
          </span>
        )}
      </div>
    </button>
  );
}
