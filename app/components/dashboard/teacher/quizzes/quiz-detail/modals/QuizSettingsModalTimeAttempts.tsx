import type { ReactElement } from "react";
import type {
  QuizSettingsSetter,
  QuizSettingsState,
} from "./quizSettingsTypes";

type QuizSettingsModalTimeAttemptsProps = {
  quizSettings: QuizSettingsState;
  setQuizSettings: QuizSettingsSetter;
};

export default function QuizSettingsModalTimeAttempts({
  quizSettings,
  setQuizSettings,
}: QuizSettingsModalTimeAttemptsProps): ReactElement {
  return (
    <div className="mb-6">
      <h4 className="text-sm font-black text-gray-900 uppercase tracking-wider mb-4">
        Time & Attempts
      </h4>
      <div className="bg-white border-2 border-gray-900 rounded-xl p-4 shadow-[2px_2px_0px_0px_rgba(17,24,39,1)]">
        <div className="flex flex-col gap-4">
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
              value={quizSettings.duration}
              onChange={(e) =>
                setQuizSettings((prev) => {
                  const parsed = Number.parseInt(e.target.value, 10);
                  return {
                    ...prev,
                    duration: Number.isNaN(parsed) ? 0 : parsed,
                  };
                })
              }
              placeholder="Custom duration..."
              className="w-full px-3 py-2 bg-amber-50 border-2 border-gray-900 rounded-lg font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>
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
                presetDate.setDate(presetDate.getDate() + preset.days);
                presetDate.setHours(23, 59, 0, 0);
                const presetValue = presetDate.toISOString().slice(0, 16);
                const isSelected =
                  quizSettings.deadline.slice(0, 10) ===
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
  );
}
