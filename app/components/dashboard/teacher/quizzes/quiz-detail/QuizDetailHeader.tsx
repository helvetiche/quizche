import type { ReactElement } from "react";
import type { Quiz } from "./types";

type QuizDetailHeaderProps = {
  quiz: Quiz;
  attemptsCount: number;
  onBack: () => void;
};

export default function QuizDetailHeader({
  quiz,
  attemptsCount,
  onBack,
}: QuizDetailHeaderProps): ReactElement {
  return (
    <header className="flex items-center justify-between px-4 py-3 bg-amber-100 border-b-2 border-gray-900">
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="w-10 h-10 bg-amber-200 text-gray-900 rounded-xl flex items-center justify-center border-2 border-gray-900 hover:bg-amber-300 transition-colors shadow-[2px_2px_0px_0px_rgba(17,24,39,1)]"
        >
          <span className="material-icons-outlined">arrow_back</span>
        </button>
        <div>
          <div className="flex items-center gap-2">
            <span
              className={`text-xs font-bold px-2 py-0.5 border-2 border-gray-900 rounded-full ${quiz.isActive ? "bg-amber-300" : "bg-gray-300"}`}
            >
              {quiz.isActive ? "ACTIVE" : "INACTIVE"}
            </span>
            <h1 className="text-lg font-black text-gray-900">{quiz.title}</h1>
          </div>
          <p className="text-xs text-gray-600 font-medium">
            {quiz.description || "No description"}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs text-gray-600 font-bold px-3 py-1.5 bg-amber-200 border-2 border-gray-900 rounded-full">
          {quiz.totalQuestions} questions
        </span>
        <span className="text-xs text-gray-600 font-bold px-3 py-1.5 bg-amber-200 border-2 border-gray-900 rounded-full">
          {attemptsCount} submissions
        </span>
      </div>
    </header>
  );
}
