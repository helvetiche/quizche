import type { ReactElement } from "react";
import type { QuizSettingsSetter, QuizSettingsState } from "./quizSettingsTypes";

type QuizSettingsModalAntiCheatProps = {
  quizSettings: QuizSettingsState;
  setQuizSettings: QuizSettingsSetter;
};

export default function QuizSettingsModalAntiCheat({
  quizSettings,
  setQuizSettings,
}: QuizSettingsModalAntiCheatProps): ReactElement {
  return (
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
  );
}
