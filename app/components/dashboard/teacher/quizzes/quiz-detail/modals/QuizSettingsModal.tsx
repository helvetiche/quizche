import { useState, useEffect } from "react";
import type { ReactElement } from "react";
import Modal from "@/components/Modal";
import type { Quiz } from "../types";
import type { Section } from "../../../sections/types";
import type { QuizSettingsState } from "./quizSettingsTypes";
import QuizSettingsModalBasicInfo from "./QuizSettingsModalBasicInfo";
import QuizSettingsModalTimeAttempts from "./QuizSettingsModalTimeAttempts";
import QuizSettingsModalOptions from "./QuizSettingsModalOptions";
import QuizSettingsModalAntiCheat from "./QuizSettingsModalAntiCheat";
import QuizSettingsModalSections from "./QuizSettingsModalSections";
import QuizSettingsModalActions from "./QuizSettingsModalActions";

type QuizSettingsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  quiz: Quiz;
  quizId: string;
  sections: Section[];
  idToken: string | null;
  onUpdateQuiz: (updatedQuiz: Quiz) => void;
  setShowEditModal: (show: boolean) => void;
  assignedSectionIds: string[];
  excludedStudentIds: string[];
  onUpdateAssignments: (sectionIds: string[], excludedIds: string[]) => void;
};

export default function QuizSettingsModal({
  isOpen,
  onClose,
  quiz,
  quizId,
  sections,
  idToken,
  onUpdateQuiz,
  setShowEditModal,
  assignedSectionIds,
  excludedStudentIds,
  onUpdateAssignments,
}: QuizSettingsModalProps): ReactElement | null {
  const [localAssignedSectionIds, setLocalAssignedSectionIds] = useState<
    string[]
  >([]);
  const [localExcludedStudentIds, setLocalExcludedStudentIds] = useState<
    string[]
  >([]);
  const [expandedSections, setExpandedSections] = useState<string[]>([]);
  const [savingSections, setSavingSections] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [copied, setCopied] = useState(false);

  const [quizSettings, setQuizSettings] = useState<QuizSettingsState>({
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

  // Initialize local state from props
  useEffect(() => {
    setLocalAssignedSectionIds(assignedSectionIds);
    setLocalExcludedStudentIds(excludedStudentIds);
  }, [assignedSectionIds, excludedStudentIds]);

  // Initialize settings from quiz prop
  useEffect(() => {
    setQuizSettings({
      isActive: quiz.isActive,
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
  }, [quiz]);

  const toggleSectionAssignment = (sectionId: string): void => {
    setLocalAssignedSectionIds((prev) =>
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
    setLocalExcludedStudentIds((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId]
    );
  };

  const saveSectionAssignments = async (): Promise<void> => {
    if (!idToken || !quizId) return;
    setSavingSections(true);
    try {
      const { apiPut } = await import("../../../../../../lib/api");
      const response = await apiPut(`/api/quizzes/${quizId}/sections`, {
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sectionIds: localAssignedSectionIds,
          excludedStudentIds: localExcludedStudentIds,
        }),
        idToken,
      });
      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error ?? "Failed to save section assignments");
      }

      onUpdateAssignments(localAssignedSectionIds, localExcludedStudentIds);
    } catch (err) {
      console.error("Error saving section assignments:", err);
      // You might want to show a toast here
    } finally {
      setSavingSections(false);
    }
  };

  const saveQuizSettings = async (): Promise<void> => {
    if (!idToken || !quizId) return;
    setSavingSettings(true);
    try {
      const { apiPut } = await import("../../../../../../lib/api");
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
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error ?? "Failed to save quiz settings");
      }

      // Update local quiz state via callback
      onUpdateQuiz({
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

      onClose();
    } catch (err) {
      console.error("Error saving quiz settings:", err);
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

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
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
            <h3 className="text-xl font-black text-gray-900">Quiz Settings</h3>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 bg-amber-300 rounded-xl flex items-center justify-center border-2 border-gray-900 hover:bg-amber-400 transition-colors shadow-[2px_2px_0px_0px_rgba(17,24,39,1)]"
          >
            <span className="material-icons-outlined text-gray-900">close</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <QuizSettingsModalBasicInfo
            quiz={quiz}
            isActive={quizSettings.isActive}
            onToggleActive={() =>
              setQuizSettings((prev) => ({ ...prev, isActive: !prev.isActive }))
            }
          />

          <QuizSettingsModalTimeAttempts
            quizSettings={quizSettings}
            setQuizSettings={setQuizSettings}
          />

          <QuizSettingsModalOptions
            quizSettings={quizSettings}
            setQuizSettings={setQuizSettings}
          />

          <QuizSettingsModalAntiCheat
            quizSettings={quizSettings}
            setQuizSettings={setQuizSettings}
          />

          <QuizSettingsModalSections
            sections={sections}
            localAssignedSectionIds={localAssignedSectionIds}
            localExcludedStudentIds={localExcludedStudentIds}
            expandedSections={expandedSections}
            onToggleSectionAssignment={toggleSectionAssignment}
            onToggleSectionExpanded={toggleSectionExpanded}
            onToggleStudentExclusion={toggleStudentExclusion}
          />

          <QuizSettingsModalActions
            copied={copied}
            onClose={onClose}
            onShowEditModal={() => setShowEditModal(true)}
            onCopyLink={() => void copyShareLink()}
          />
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t-2 border-gray-900 bg-amber-100 flex gap-3">
          <button
            onClick={onClose}
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
            {savingSections || savingSettings ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
