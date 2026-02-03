import React from "react";
import { type Question, QUESTION_TYPES, type QuestionType } from "./types";

type QuizFormPaginationProps = {
  questions: Question[];
  currentQuestionIndex: number;
  onQuestionIndexChange: (index: number) => void;
  onAddQuestion: () => void;
};

export default function QuizFormPagination({
  questions,
  currentQuestionIndex,
  onQuestionIndexChange,
  onAddQuestion,
}: QuizFormPaginationProps): React.ReactElement {
  const getQuestionTypeInfo = (
    type: QuestionType
  ): (typeof QUESTION_TYPES)[number] =>
    QUESTION_TYPES.find((t) => t.value === type) ?? QUESTION_TYPES[0];

  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-gray-900 border-t border-gray-800">
      <button
        type="button"
        onClick={() =>
          onQuestionIndexChange(Math.max(0, currentQuestionIndex - 1))
        }
        disabled={currentQuestionIndex === 0}
        className="w-10 h-10 rounded-lg bg-gray-800 hover:bg-gray-700 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        <span className="material-icons-outlined text-white">chevron_left</span>
      </button>

      <div className="flex-1 flex items-center gap-2 overflow-x-auto py-1 px-1">
        {questions.map((q, index) => {
          const typeInfo = getQuestionTypeInfo(q.type);
          const isActive = currentQuestionIndex === index;
          const hasContent = q.question.trim().length > 0;
          return (
            <button
              key={q.id}
              type="button"
              onClick={() => onQuestionIndexChange(index)}
              className={`flex-shrink-0 w-14 h-11 rounded-lg border-2 flex flex-col items-center justify-center transition-all ${isActive ? `${typeInfo.color} border-white shadow-lg` : hasContent ? "bg-gray-800 border-gray-700 hover:border-gray-500" : "bg-gray-800/50 border-gray-700 border-dashed hover:border-gray-500"}`}
            >
              <span
                className={`text-xs font-bold ${isActive ? "text-gray-900" : "text-gray-400"}`}
              >
                {index + 1}
              </span>
              <span
                className={`material-icons-outlined text-[10px] ${isActive ? "text-gray-900" : "text-gray-500"}`}
              >
                {typeInfo.icon}
              </span>
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => onAddQuestion()}
          className="flex-shrink-0 w-11 h-11 rounded-lg border-2 border-dashed border-gray-700 flex items-center justify-center hover:border-amber-400 hover:bg-gray-800 transition-all group"
        >
          <span className="material-icons-outlined text-gray-600 group-hover:text-amber-400">
            add
          </span>
        </button>
      </div>

      <button
        type="button"
        onClick={() =>
          onQuestionIndexChange(
            Math.min(questions.length - 1, currentQuestionIndex + 1)
          )
        }
        disabled={currentQuestionIndex === questions.length - 1}
        className="w-10 h-10 rounded-lg bg-gray-800 hover:bg-gray-700 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        <span className="material-icons-outlined text-white">
          chevron_right
        </span>
      </button>

      <div className="flex items-center gap-1 px-3 py-2 bg-gray-800 rounded-lg">
        <span className="text-amber-400 font-bold">
          {currentQuestionIndex + 1}
        </span>
        <span className="text-gray-600">/</span>
        <span className="text-gray-400">{questions.length}</span>
      </div>
    </div>
  );
}
