import React from "react";
import { type QuestionType, QUESTION_TYPES, type Question } from "./types";

type QuizFormSidebarProps = {
  sidebarCollapsed: boolean;
  onToggleCollapse: () => void;
  onAddQuestion: (type: QuestionType) => void;
  onOpenAIGenerate?: () => void;
  onOpenSettings?: () => void;
  onDuplicateQuestion: () => void;
  onRemoveQuestion: (id: string) => void;
  onSaveDraft: () => void;
  onPublish: () => void;
  savingDraft: boolean;
  loading: boolean;
  quizId?: string;
  questions: Question[];
  currentQuestionId?: string;
};

export default function QuizFormSidebar({
  sidebarCollapsed,
  onToggleCollapse,
  onAddQuestion,
  onOpenAIGenerate,
  onOpenSettings,
  onDuplicateQuestion,
  onRemoveQuestion,
  onSaveDraft,
  onPublish,
  savingDraft,
  loading,
  quizId,
  questions,
  currentQuestionId,
}: QuizFormSidebarProps): React.ReactElement {
  return (
    <div
      className={`flex flex-col bg-gray-900 border-r border-gray-800 transition-all duration-200 ${sidebarCollapsed ? "w-16" : "w-56"}`}
    >
      <div className="flex items-center justify-between p-3 border-b border-gray-800">
        {!sidebarCollapsed && (
          <span className="text-amber-400 font-bold text-xs uppercase tracking-wider">
            Tools
          </span>
        )}
        <button
          onClick={onToggleCollapse}
          className="w-8 h-8 rounded-lg bg-gray-800 hover:bg-gray-700 flex items-center justify-center transition-colors ml-auto"
        >
          <span className="material-icons-outlined text-gray-400 text-sm">
            {sidebarCollapsed ? "chevron_right" : "chevron_left"}
          </span>
        </button>
      </div>

      {/* Question Types */}
      <div className="p-2 border-b border-gray-800">
        {!sidebarCollapsed && (
          <p className="text-[10px] font-bold text-gray-600 uppercase tracking-wider mb-2 px-2">
            Add Question
          </p>
        )}
        <div className="flex flex-col gap-1">
          {QUESTION_TYPES.map((type) => (
            <button
              key={type.value}
              onClick={() => onAddQuestion(type.value)}
              className={`group flex items-center gap-2 p-2 rounded-lg hover:bg-gray-800 transition-all ${sidebarCollapsed ? "justify-center" : ""}`}
              title={type.label}
            >
              <div
                className={`w-7 h-7 ${type.color} rounded-md flex items-center justify-center flex-shrink-0`}
              >
                <span className="material-icons-outlined text-gray-900 text-sm">
                  {type.icon}
                </span>
              </div>
              {!sidebarCollapsed && (
                <span className="text-gray-400 font-medium text-xs group-hover:text-white transition-colors truncate">
                  {type.label}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tools */}
      <div className="p-2 border-b border-gray-800">
        {!sidebarCollapsed && (
          <p className="text-[10px] font-bold text-gray-600 uppercase tracking-wider mb-2 px-2">
            Actions
          </p>
        )}
        <div className="flex flex-col gap-1">
          {onOpenAIGenerate && (
            <button
              onClick={() => void onOpenAIGenerate()}
              className={`group flex items-center gap-2 p-2 rounded-lg hover:bg-gray-800 transition-all ${sidebarCollapsed ? "justify-center" : ""}`}
              title="AI Generate"
            >
              <div className="w-7 h-7 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-md flex items-center justify-center flex-shrink-0">
                <span className="material-icons-outlined text-white text-sm">
                  auto_awesome
                </span>
              </div>
              {!sidebarCollapsed && (
                <span className="text-gray-400 font-medium text-xs group-hover:text-white transition-colors">
                  AI Generate
                </span>
              )}
            </button>
          )}
          {onOpenSettings && (
            <button
              onClick={() => void onOpenSettings()}
              className={`group flex items-center gap-2 p-2 rounded-lg hover:bg-gray-800 transition-all ${sidebarCollapsed ? "justify-center" : ""}`}
              title="Settings"
            >
              <div className="w-7 h-7 bg-amber-400 rounded-md flex items-center justify-center flex-shrink-0">
                <span className="material-icons-outlined text-gray-900 text-sm">
                  settings
                </span>
              </div>
              {!sidebarCollapsed && (
                <span className="text-gray-400 font-medium text-xs group-hover:text-white transition-colors">
                  Settings
                </span>
              )}
            </button>
          )}
          <button
            onClick={() => void onDuplicateQuestion()}
            className={`group flex items-center gap-2 p-2 rounded-lg hover:bg-gray-800 transition-all ${sidebarCollapsed ? "justify-center" : ""}`}
            title="Duplicate"
          >
            <div className="w-7 h-7 bg-violet-400 rounded-md flex items-center justify-center flex-shrink-0">
              <span className="material-icons-outlined text-gray-900 text-sm">
                content_copy
              </span>
            </div>
            {!sidebarCollapsed && (
              <span className="text-gray-400 font-medium text-xs group-hover:text-white transition-colors">
                Duplicate
              </span>
            )}
          </button>
          {questions.length > 1 && (
            <button
              onClick={() => onRemoveQuestion(currentQuestionId ?? "")}
              className={`group flex items-center gap-2 p-2 rounded-lg hover:bg-red-900/30 transition-all ${sidebarCollapsed ? "justify-center" : ""}`}
              title="Delete"
            >
              <div className="w-7 h-7 bg-red-500 rounded-md flex items-center justify-center flex-shrink-0">
                <span className="material-icons-outlined text-white text-sm">
                  delete
                </span>
              </div>
              {!sidebarCollapsed && (
                <span className="text-gray-400 font-medium text-xs group-hover:text-red-400 transition-colors">
                  Delete
                </span>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Publish Button */}
      <div className="mt-auto p-3 flex flex-col gap-2">
        <button
          onClick={() => void onSaveDraft()}
          disabled={savingDraft || loading}
          className={`w-full flex items-center justify-center gap-2 p-2.5 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-gray-600`}
        >
          {savingDraft ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <span className="material-icons-outlined text-sm">save_alt</span>
          )}
          {!sidebarCollapsed && (
            <span className="text-xs">
              {savingDraft ? "Saving..." : "Save Draft"}
            </span>
          )}
        </button>
        <button
          onClick={() => onPublish()}
          disabled={loading || savingDraft}
          className={`w-full flex items-center justify-center gap-2 p-3 bg-amber-400 hover:bg-amber-300 text-gray-900 font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-gray-900 border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <span className="material-icons-outlined">
              {quizId ? "save" : "publish"}
            </span>
          )}
          {!sidebarCollapsed && (
            <span className="text-sm">
              {loading ? "Saving..." : quizId ? "Save" : "Publish"}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
