import type { ReactElement } from "react";
import type { Quiz } from "../types";

type QuizSettingsModalBasicInfoProps = {
  quiz: Quiz;
  isActive: boolean;
  onToggleActive: () => void;
};

export default function QuizSettingsModalBasicInfo({
  quiz,
  isActive,
  onToggleActive,
}: QuizSettingsModalBasicInfoProps): ReactElement {
  return (
    <div className="mb-6">
      <h4 className="text-sm font-black text-gray-900 uppercase tracking-wider mb-4">
        Basic Information
      </h4>
      <div className="bg-white border-2 border-gray-900 rounded-xl p-4 shadow-[2px_2px_0px_0px_rgba(17,24,39,1)]">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-bold text-gray-500 mb-1">Title</p>
            <p className="font-bold text-gray-900">{quiz.title}</p>
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 mb-2">Status</p>
            <button
              onClick={onToggleActive}
              className={`flex items-center gap-2 px-3 py-1.5 text-sm font-bold rounded-lg border-2 border-gray-900 transition-colors ${isActive ? "bg-amber-300" : "bg-gray-300"}`}
            >
              <span className="material-icons-outlined text-sm">
                {isActive ? "toggle_on" : "toggle_off"}
              </span>
              {isActive ? "Active" : "Inactive"}
            </button>
          </div>
          <div className="col-span-2">
            <p className="text-xs font-bold text-gray-500 mb-1">Description</p>
            <p className="text-gray-700">
              {quiz.description || "No description"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
