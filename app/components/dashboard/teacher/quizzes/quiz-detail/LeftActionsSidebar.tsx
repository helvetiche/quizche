import type { ReactElement } from "react";

type LeftActionsSidebarProps = {
  sidebarCollapsed: boolean;
  activeView: "questions" | "results" | "live";
  onToggleCollapse: () => void;
  onEdit: () => void;
  onToggleResults: () => void;
  onToggleLive: () => void;
  onOpenSettings: () => void;
  copied: boolean;
  onCopyLink: () => void;
  durationLabel: string;
  submissionsCount: number;
  onNewQuiz: () => void;
};

export default function LeftActionsSidebar({
  sidebarCollapsed,
  activeView,
  onToggleCollapse,
  onEdit,
  onToggleResults,
  onToggleLive,
  onOpenSettings,
  copied,
  onCopyLink,
  durationLabel,
  submissionsCount,
  onNewQuiz,
}: LeftActionsSidebarProps): ReactElement {
  return (
    <aside
      className={`flex flex-col bg-amber-100 border-r-2 border-gray-900 transition-all duration-200 ${sidebarCollapsed ? "w-16" : "w-56"}`}
    >
      <div className="flex items-center justify-between p-3 border-b-2 border-gray-900">
        {!sidebarCollapsed && (
          <span className="text-gray-900 font-black text-xs uppercase tracking-wider">
            Actions
          </span>
        )}
        <button
          onClick={onToggleCollapse}
          className="w-8 h-8 rounded-lg bg-amber-200 border-2 border-gray-900 hover:bg-amber-300 flex items-center justify-center transition-colors ml-auto"
        >
          <span className="material-icons-outlined text-gray-900 text-sm">
            {sidebarCollapsed ? "chevron_right" : "chevron_left"}
          </span>
        </button>
      </div>

      <div className="p-2 border-b-2 border-gray-900">
        {!sidebarCollapsed && (
          <p className="text-[10px] font-black text-gray-700 uppercase tracking-wider mb-2 px-2">
            Quick Actions
          </p>
        )}
        <div className="flex flex-col gap-1">
          <button
            onClick={onEdit}
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
                <span className="text-gray-900 font-bold text-xs">Edit Quiz</span>
                <span className="text-gray-500 text-[9px] leading-tight">
                  Modify questions and answers
                </span>
              </div>
            )}
          </button>
          <button
            onClick={onToggleResults}
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
                <span className="text-gray-900 font-bold text-xs">View Results</span>
                <span className="text-gray-500 text-[9px] leading-tight">
                  See student submissions
                </span>
              </div>
            )}
          </button>
          <button
            onClick={onToggleLive}
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
            onClick={onOpenSettings}
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
                <span className="text-gray-900 font-bold text-xs">Settings</span>
                <span className="text-gray-500 text-[9px] leading-tight">
                  Configure quiz options
                </span>
              </div>
            )}
          </button>
        </div>
      </div>

      <div className="p-2 border-b-2 border-gray-900">
        {!sidebarCollapsed && (
          <p className="text-[10px] font-black text-gray-700 uppercase tracking-wider mb-2 px-2">
            Share
          </p>
        )}
        <button
          onClick={onCopyLink}
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

      <div className="p-2 flex-1">
        {!sidebarCollapsed && (
          <p className="text-[10px] font-black text-gray-700 uppercase tracking-wider mb-2 px-2">
            Stats
          </p>
        )}
        <div className="flex flex-col gap-2 px-2">
          <div className={`flex items-center gap-2 ${sidebarCollapsed ? "justify-center" : ""}`}>
            <div className="w-8 h-8 bg-amber-200 rounded-lg flex items-center justify-center border-2 border-gray-900">
              <span className="material-icons-outlined text-gray-900 text-sm">
                schedule
              </span>
            </div>
            {!sidebarCollapsed && (
              <div>
                <p className="text-xs font-bold text-gray-900">{durationLabel}</p>
                <p className="text-[9px] text-gray-500">Duration</p>
              </div>
            )}
          </div>
          <div className={`flex items-center gap-2 ${sidebarCollapsed ? "justify-center" : ""}`}>
            <div className="w-8 h-8 bg-amber-200 rounded-lg flex items-center justify-center border-2 border-gray-900">
              <span className="material-icons-outlined text-gray-900 text-sm">
                people
              </span>
            </div>
            {!sidebarCollapsed && (
              <div>
                <p className="text-xs font-bold text-gray-900">{submissionsCount}</p>
                <p className="text-[9px] text-gray-500">Submissions</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-auto p-3 flex flex-col gap-2">
        <button
          onClick={onNewQuiz}
          className="w-full flex items-center justify-center gap-2 p-2.5 bg-amber-200 hover:bg-amber-300 text-gray-900 font-bold rounded-xl border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(17,24,39,1)] hover:shadow-[3px_3px_0px_0px_rgba(17,24,39,1)] transition-all"
        >
          <span className="material-icons-outlined text-sm">add</span>
          {!sidebarCollapsed && <span className="text-xs">New Quiz</span>}
        </button>
      </div>
    </aside>
  );
}
