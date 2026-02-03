import type { ReactElement } from "react";
import type { QuizSettingsSetter, QuizSettingsState } from "./quizSettingsTypes";

type QuizSettingsModalOptionsProps = {
  quizSettings: QuizSettingsState;
  setQuizSettings: QuizSettingsSetter;
};

export default function QuizSettingsModalOptions({
  quizSettings,
  setQuizSettings,
}: QuizSettingsModalOptionsProps): ReactElement {
  return (
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
  );
}
