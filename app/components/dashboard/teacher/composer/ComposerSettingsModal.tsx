import React from "react";
import Modal from "@/components/Modal";
import type { QuizSettings } from "./types";

type ComposerSettingsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  settings: QuizSettings;
  onSettingChange: (
    key: keyof QuizSettings,
    value: QuizSettings[keyof QuizSettings]
  ) => void;
};

// ============================================================================
// TOGGLE BUTTON COMPONENT
// ============================================================================
function ToggleButton({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}): React.ReactElement {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`flex items-center justify-between p-3 rounded-xl border-2 transition-all ${checked ? "bg-amber-200 text-gray-900 border-gray-900 shadow-[2px_2px_0px_0px_rgba(17,24,39,1)]" : "bg-white text-gray-900 border-gray-300 hover:border-gray-900"}`}
    >
      <span className="font-bold text-sm">{label}</span>
      <div
        className={`w-5 h-5 rounded-md border-2 flex items-center justify-center ${checked ? "bg-amber-400 border-gray-900" : "bg-white border-gray-400"}`}
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

export default function ComposerSettingsModal({
  isOpen,
  onClose,
  settings,
  onSettingChange,
}: ComposerSettingsModalProps): React.ReactElement | null {
  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="w-full max-w-2xl max-h-[90vh]"
    >
      <div className="bg-amber-50 border-3 border-gray-900 rounded-2xl shadow-[8px_8px_0px_0px_rgba(17,24,39,1)] w-full max-h-[90vh] overflow-hidden flex flex-col">
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
            className="w-10 h-10 bg-red-400 rounded-xl flex items-center justify-center border-2 border-gray-900 hover:bg-red-500 transition-colors shadow-[2px_2px_0px_0px_rgba(17,24,39,1)]"
          >
            <span className="material-icons-outlined text-gray-900">close</span>
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
          {/* Basic Info */}
          <div className="flex flex-col gap-4">
            <h4 className="text-sm font-black text-gray-900 uppercase tracking-wider">
              Basic Information
            </h4>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-gray-700">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={settings.title}
                onChange={(e) => onSettingChange("title", e.target.value)}
                placeholder="Enter quiz title..."
                className="px-4 py-3 bg-white border-2 border-gray-900 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-amber-400 shadow-[2px_2px_0px_0px_rgba(17,24,39,1)]"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-gray-700">
                Description
              </label>
              <textarea
                value={settings.description}
                onChange={(e) => onSettingChange("description", e.target.value)}
                placeholder="Enter description..."
                rows={3}
                className="px-4 py-3 bg-white border-2 border-gray-900 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none shadow-[2px_2px_0px_0px_rgba(17,24,39,1)]"
              />
            </div>
          </div>

          {/* Time Settings */}
          <div className="flex flex-col gap-4">
            <h4 className="text-sm font-black text-gray-900 uppercase tracking-wider">
              Time & Attempts
            </h4>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-gray-700">
                  Duration (minutes)
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {[15, 30, 45, 60, 90, 120].map((mins) => (
                    <button
                      key={mins}
                      onClick={() => onSettingChange("duration", mins)}
                      className={`px-4 py-2 rounded-full border-2 font-bold text-sm transition-all ${
                        settings.duration === mins
                          ? "bg-amber-200 border-gray-900 text-gray-900 shadow-[2px_2px_0px_0px_rgba(17,24,39,1)]"
                          : "bg-white border-gray-300 text-gray-700 hover:border-gray-900"
                      }`}
                    >
                      {mins} min
                    </button>
                  ))}
                  <button
                    onClick={() => onSettingChange("duration", null)}
                    className={`px-4 py-2 rounded-full border-2 font-bold text-sm transition-all ${
                      settings.duration === null
                        ? "bg-amber-200 border-gray-900 text-gray-900 shadow-[2px_2px_0px_0px_rgba(17,24,39,1)]"
                        : "bg-white border-gray-300 text-gray-700 hover:border-gray-900"
                    }`}
                  >
                    No limit
                  </button>
                </div>
                <input
                  type="number"
                  min="0"
                  value={settings.duration ?? ""}
                  onChange={(e) =>
                    onSettingChange(
                      "duration",
                      e.target.value ? parseInt(e.target.value) : null
                    )
                  }
                  placeholder="Custom duration..."
                  className="px-4 py-3 bg-white border-2 border-gray-900 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-amber-400 shadow-[2px_2px_0px_0px_rgba(17,24,39,1)]"
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
                    onSettingChange(
                      "maxAttempts",
                      parseInt(e.target.value) || 1
                    )
                  }
                  className="px-4 py-3 bg-white border-2 border-gray-900 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-amber-400 shadow-[2px_2px_0px_0px_rgba(17,24,39,1)]"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-gray-700">
                  Deadline
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {[
                    { label: "1 Day", days: 1 },
                    { label: "2 Days", days: 2 },
                    { label: "3 Days", days: 3 },
                    { label: "1 Week", days: 7 },
                  ].map((preset) => {
                    const presetDate = new Date();
                    presetDate.setDate(presetDate.getDate() + preset.days);
                    presetDate.setHours(23, 59, 0, 0);
                    const presetValue = presetDate.toISOString().slice(0, 16);
                    const isSelected =
                      settings.deadline !== "" &&
                      settings.deadline.slice(0, 10) ===
                        presetValue.slice(0, 10);
                    return (
                      <button
                        key={preset.days}
                        onClick={() => onSettingChange("deadline", presetValue)}
                        className={`px-4 py-2 rounded-full border-2 font-bold text-sm transition-all ${
                          isSelected
                            ? "bg-amber-200 border-gray-900 text-gray-900 shadow-[2px_2px_0px_0px_rgba(17,24,39,1)]"
                            : "bg-white border-gray-300 text-gray-700 hover:border-gray-900"
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => onSettingChange("deadline", "")}
                    className={`px-4 py-2 rounded-full border-2 font-bold text-sm transition-all ${
                      settings.deadline === ""
                        ? "bg-amber-200 border-gray-900 text-gray-900 shadow-[2px_2px_0px_0px_rgba(17,24,39,1)]"
                        : "bg-white border-gray-300 text-gray-700 hover:border-gray-900"
                    }`}
                  >
                    No deadline
                  </button>
                </div>
                <input
                  type="datetime-local"
                  value={settings.deadline}
                  onChange={(e) => onSettingChange("deadline", e.target.value)}
                  className="px-4 py-3 bg-white border-2 border-gray-900 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-amber-400 shadow-[2px_2px_0px_0px_rgba(17,24,39,1)]"
                />
              </div>
            </div>
          </div>

          {/* Quiz Options */}
          <div className="flex flex-col gap-4">
            <h4 className="text-sm font-black text-gray-900 uppercase tracking-wider">
              Quiz Options
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <ToggleButton
                label="Shuffle Questions"
                checked={settings.shuffleQuestions}
                onChange={(v) => onSettingChange("shuffleQuestions", v)}
              />
              <ToggleButton
                label="Shuffle Choices"
                checked={settings.shuffleChoices}
                onChange={(v) => onSettingChange("shuffleChoices", v)}
              />
              <ToggleButton
                label="Show Results"
                checked={settings.showResults}
                onChange={(v) => onSettingChange("showResults", v)}
              />
              <ToggleButton
                label="Allow Retake"
                checked={settings.allowRetake}
                onChange={(v) => onSettingChange("allowRetake", v)}
              />
            </div>
          </div>

          {/* Anti-Cheat */}
          <div className="flex flex-col gap-4">
            <h4 className="text-sm font-black text-gray-900 uppercase tracking-wider">
              Anti-Cheat
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-2">
                <ToggleButton
                  label="Prevent Tab Switch"
                  checked={settings.preventTabSwitch}
                  onChange={(v) => onSettingChange("preventTabSwitch", v)}
                />
                {settings.preventTabSwitch && (
                  <div className="flex items-center gap-2 pl-2">
                    <label className="text-xs font-medium text-gray-600">
                      Max violations:
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={settings.maxTabSwitches}
                      onChange={(e) =>
                        onSettingChange(
                          "maxTabSwitches",
                          Math.max(
                            1,
                            Math.min(10, parseInt(e.target.value) || 3)
                          )
                        )
                      }
                      className="w-16 px-2 py-1 bg-white border-2 border-gray-900 rounded-lg font-bold text-center text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 shadow-[2px_2px_0px_0px_rgba(17,24,39,1)]"
                    />
                  </div>
                )}
              </div>
              <ToggleButton
                label="Prevent Copy/Paste"
                checked={settings.preventCopyPaste}
                onChange={(v) => onSettingChange("preventCopyPaste", v)}
              />
              <ToggleButton
                label="Fullscreen Mode"
                checked={settings.fullscreenMode}
                onChange={(v) => onSettingChange("fullscreenMode", v)}
              />
              <ToggleButton
                label="Disable Right Click"
                checked={settings.disableRightClick}
                onChange={(v) => onSettingChange("disableRightClick", v)}
              />
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-amber-100 border-2 border-amber-400 rounded-xl p-4">
            <p className="text-gray-900 font-bold text-sm mb-2">
              How to Configure Your Quiz
            </p>
            <p className="text-gray-700 text-xs leading-relaxed">
              Set a clear title and description so students know what to expect.
              Choose an appropriate duration based on the number and complexity
              of questions. Use deadline presets for quick scheduling or set a
              custom date. Enable anti-cheat options for high-stakes assessments
              to maintain academic integrity during the quiz.
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t-2 border-gray-900 bg-amber-100">
          <button
            onClick={onClose}
            className="px-6 py-3 bg-amber-200 text-gray-900 font-bold rounded-xl border-2 border-gray-900 hover:bg-amber-300 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onClose}
            className="px-6 py-3 bg-amber-400 text-gray-900 font-bold rounded-xl border-2 border-gray-900 shadow-[3px_3px_0px_0px_rgba(17,24,39,1)] hover:shadow-[4px_4px_0px_0px_rgba(17,24,39,1)] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all flex items-center gap-2"
          >
            <span className="material-icons-outlined">check</span> Save
          </button>
        </div>
      </div>
    </Modal>
  );
}
