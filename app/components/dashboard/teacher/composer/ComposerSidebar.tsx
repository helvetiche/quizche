import React from "react";
import { type QuestionType, QUESTION_TYPES } from "./types";

type ComposerSidebarProps = {
  collapsed: boolean;
  onToggleCollapse: () => void;
  onAddQuestion: (type: QuestionType) => void;
  onDuplicateQuestion: () => void;
  onRemoveQuestion: (id: string) => void;
  onShowAIModal: () => void;
  onShowSettingsModal: () => void;
  onSaveDraft: () => void;
  onPublish: () => void;
  isSavingDraft: boolean;
  isLoading: boolean;
  editMode: boolean;
  currentQuestionId?: string;
  questionCount: number;
};

export default function ComposerSidebar({
  collapsed,
  onToggleCollapse,
  onAddQuestion,
  onDuplicateQuestion,
  onRemoveQuestion,
  onShowAIModal,
  onShowSettingsModal,
  onSaveDraft,
  onPublish,
  isSavingDraft,
  isLoading,
  editMode,
  currentQuestionId,
  questionCount,
}: ComposerSidebarProps): React.ReactElement {
  return (
    <aside
      className={`flex flex-col bg-amber-100 border-r-2 border-gray-900 transition-all duration-200 ${collapsed ? "w-16" : "w-56"}`}
    >
      {/* Sidebar Header */}
      <div className="flex items-center justify-between p-3 border-b-2 border-gray-900">
        {!collapsed && (
          <span className="text-gray-900 font-black text-xs uppercase tracking-wider">
            Tools
          </span>
        )}
        <button
          onClick={onToggleCollapse}
          className="w-8 h-8 rounded-lg bg-amber-200 border-2 border-gray-900 hover:bg-amber-300 flex items-center justify-center transition-colors ml-auto"
        >
          <span className="material-icons-outlined text-gray-900 text-sm">
            {collapsed ? "chevron_right" : "chevron_left"}
          </span>
        </button>
      </div>

      {/* Question Types */}
      <div className="p-2 border-b-2 border-gray-900">
        {!collapsed && (
          <p className="text-[10px] font-black text-gray-700 uppercase tracking-wider mb-2 px-2">
            Add Question
          </p>
        )}
        <div className="flex flex-col gap-1">
          {QUESTION_TYPES.map((type) => (
            <button
              key={type.value}
              onClick={() => onAddQuestion(type.value)}
              className={`group flex items-center gap-2 p-2 rounded-xl hover:bg-amber-200 border-2 border-transparent hover:border-gray-900 transition-all ${collapsed ? "justify-center" : ""}`}
              title={type.label}
            >
              <div className="w-8 h-8 bg-amber-200 rounded-lg flex items-center justify-center flex-shrink-0 border-2 border-gray-900 group-hover:bg-amber-300">
                <span className="material-icons-outlined text-gray-900 text-sm">
                  {type.icon}
                </span>
              </div>
              {!collapsed && (
                <div className="flex flex-col items-start min-w-0 text-left">
                  <span className="text-gray-900 font-bold text-xs">
                    {type.label}
                  </span>
                  <span className="text-gray-500 text-[9px] leading-tight line-clamp-2 text-left">
                    {type.description}
                  </span>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="p-2 border-b-2 border-gray-900">
        {!collapsed && (
          <p className="text-[10px] font-black text-gray-700 uppercase tracking-wider mb-2 px-2">
            Actions
          </p>
        )}
        <div className="flex flex-col gap-1">
          <button
            onClick={onShowAIModal}
            className={`group flex items-center gap-2 p-2 rounded-xl hover:bg-amber-200 border-2 border-transparent hover:border-gray-900 transition-all ${collapsed ? "justify-center" : ""}`}
            title="AI Generate"
          >
            <div className="w-8 h-8 bg-amber-200 rounded-lg flex items-center justify-center flex-shrink-0 border-2 border-gray-900 group-hover:bg-amber-300">
              <span className="material-icons-outlined text-gray-900 text-sm">
                auto_awesome
              </span>
            </div>
            {!collapsed && (
              <div className="flex flex-col items-start min-w-0 text-left">
                <span className="text-gray-900 font-bold text-xs">
                  AI Generate
                </span>
                <span className="text-gray-500 text-[9px] leading-tight line-clamp-2">
                  Generate quiz questions from PDF using AI
                </span>
              </div>
            )}
          </button>
          <button
            onClick={onShowSettingsModal}
            className={`group flex items-center gap-2 p-2 rounded-xl hover:bg-amber-200 border-2 border-transparent hover:border-gray-900 transition-all ${collapsed ? "justify-center" : ""}`}
            title="Settings"
          >
            <div className="w-8 h-8 bg-amber-200 rounded-lg flex items-center justify-center flex-shrink-0 border-2 border-gray-900 group-hover:bg-amber-300">
              <span className="material-icons-outlined text-gray-900 text-sm">
                settings
              </span>
            </div>
            {!collapsed && (
              <div className="flex flex-col items-start min-w-0 text-left">
                <span className="text-gray-900 font-bold text-xs">
                  Settings
                </span>
                <span className="text-gray-500 text-[9px] leading-tight line-clamp-2">
                  Configure quiz title, time limit, and options
                </span>
              </div>
            )}
          </button>
          <button
            onClick={() => void onDuplicateQuestion()}
            className={`group flex items-center gap-2 p-2 rounded-xl hover:bg-amber-200 border-2 border-transparent hover:border-gray-900 transition-all ${collapsed ? "justify-center" : ""}`}
            title="Duplicate"
          >
            <div className="w-8 h-8 bg-amber-200 rounded-lg flex items-center justify-center flex-shrink-0 border-2 border-gray-900 group-hover:bg-amber-300">
              <span className="material-icons-outlined text-gray-900 text-sm">
                content_copy
              </span>
            </div>
            {!collapsed && (
              <div className="flex flex-col items-start min-w-0 text-left">
                <span className="text-gray-900 font-bold text-xs">
                  Duplicate
                </span>
                <span className="text-gray-500 text-[9px] leading-tight line-clamp-2">
                  Create a copy of the current question
                </span>
              </div>
            )}
          </button>
          {questionCount > 1 && (
            <button
              onClick={() => onRemoveQuestion(currentQuestionId ?? "")}
              className={`group flex items-center gap-2 p-2 rounded-xl hover:bg-red-100 border-2 border-transparent hover:border-red-500 transition-all ${collapsed ? "justify-center" : ""}`}
              title="Delete"
            >
              <div className="w-8 h-8 bg-amber-200 rounded-lg flex items-center justify-center flex-shrink-0 border-2 border-gray-900 group-hover:bg-red-200">
                <span className="material-icons-outlined text-gray-900 text-sm group-hover:text-red-600">
                  delete
                </span>
              </div>
              {!collapsed && (
                <div className="flex flex-col items-start min-w-0 text-left">
                  <span className="text-gray-900 font-bold text-xs group-hover:text-red-600">
                    Delete
                  </span>
                  <span className="text-gray-500 text-[9px] leading-tight line-clamp-2 group-hover:text-red-500">
                    Remove the current question from quiz
                  </span>
                </div>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Save Draft & Publish Buttons */}
      <div className="mt-auto p-3 flex flex-col gap-2">
        <button
          onClick={() => void onSaveDraft()}
          disabled={isSavingDraft || isLoading}
          className="w-full flex items-center justify-center gap-2 p-2.5 bg-amber-200 hover:bg-amber-300 text-gray-900 font-bold rounded-xl border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(17,24,39,1)] hover:shadow-[3px_3px_0px_0px_rgba(17,24,39,1)] hover:-translate-x-0.5 hover:-translate-y-0.5 active:shadow-[1px_1px_0px_0px_rgba(17,24,39,1)] active:translate-x-0.5 active:translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSavingDraft ? (
            <div className="w-4 h-4 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
          ) : (
            <span className="material-icons-outlined text-sm">save_alt</span>
          )}
          {!collapsed && (
            <span className="text-xs">
              {isSavingDraft ? "Saving..." : "Save Draft"}
            </span>
          )}
        </button>
        <button
          onClick={() => void onPublish()}
          disabled={isLoading || isSavingDraft}
          className={`w-full flex items-center justify-center gap-2 p-3 ${editMode ? "bg-cyan-400 hover:bg-cyan-500" : "bg-amber-400 hover:bg-amber-500"} text-gray-900 font-black rounded-xl border-2 border-gray-900 shadow-[3px_3px_0px_0px_rgba(17,24,39,1)] hover:shadow-[4px_4px_0px_0px_rgba(17,24,39,1)] hover:-translate-x-0.5 hover:-translate-y-0.5 active:shadow-[1px_1px_0px_0px_rgba(17,24,39,1)] active:translate-x-0.5 active:translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
          ) : (
            <span className="material-icons-outlined">
              {editMode ? "save" : "publish"}
            </span>
          )}
          {!collapsed && (
            <span className="text-sm">
              {isLoading
                ? editMode
                  ? "Updating..."
                  : "Publishing..."
                : editMode
                  ? "Update"
                  : "Publish"}
            </span>
          )}
        </button>
      </div>
    </aside>
  );
}
