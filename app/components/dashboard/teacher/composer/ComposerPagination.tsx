import React from "react";
import { QUESTION_TYPES } from "./types";
import type { Question, QuestionType } from "./types";

type ComposerPaginationProps = {
  questions: Question[];
  currentQuestionIndex: number;
  onQuestionIndexChange: (index: number) => void;
  onAddQuestion: () => void;
  onRemoveQuestion: (id: string) => void;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  searchFilter: "all" | "questions" | "answers";
  onSearchFilterChange: (filter: "all" | "questions" | "answers") => void;
  paginationRef: React.RefObject<HTMLDivElement | null>;
};

export default function ComposerPagination({
  questions,
  currentQuestionIndex,
  onQuestionIndexChange,
  onAddQuestion,
  onRemoveQuestion,
  searchQuery,
  onSearchQueryChange,
  searchFilter,
  onSearchFilterChange,
  paginationRef,
}: ComposerPaginationProps): React.ReactElement {
  const getQuestionTypeInfo = (
    type: QuestionType
  ): (typeof QUESTION_TYPES)[number] => {
    return QUESTION_TYPES.find((t) => t.value === type) ?? QUESTION_TYPES[0];
  };

  return (
    <nav className="flex flex-col gap-2 px-4 py-3 bg-amber-100 border-t-2 border-gray-900">
      {/* Search Bar & Filters */}
      <div className="flex items-center gap-2">
        {/* Filter Buttons */}
        <div className="flex items-center bg-white border-2 border-gray-900 rounded-xl overflow-hidden shadow-[2px_2px_0px_0px_rgba(17,24,39,1)] h-[42px]">
          <button
            onClick={() => onSearchFilterChange("all")}
            className={`px-3 h-full text-xs font-bold transition-colors ${searchFilter === "all" ? "bg-amber-300 text-gray-900" : "bg-white text-gray-600 hover:bg-amber-100"}`}
          >
            All
          </button>
          <button
            onClick={() => onSearchFilterChange("questions")}
            className={`px-3 h-full text-xs font-bold border-l-2 border-gray-900 transition-colors ${searchFilter === "questions" ? "bg-amber-300 text-gray-900" : "bg-white text-gray-600 hover:bg-amber-100"}`}
          >
            Questions
          </button>
          <button
            onClick={() => onSearchFilterChange("answers")}
            className={`px-3 h-full text-xs font-bold border-l-2 border-gray-900 transition-colors ${searchFilter === "answers" ? "bg-amber-300 text-gray-900" : "bg-white text-gray-600 hover:bg-amber-100"}`}
          >
            Answers
          </button>
        </div>

        {/* Search Input */}
        <div className="relative flex-1 max-w-xs h-[42px]">
          <span className="material-icons-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            placeholder={`Search ${searchFilter === "all" ? "all" : searchFilter}...`}
            className="w-full h-full pl-9 pr-8 bg-white border-2 border-gray-900 rounded-xl text-sm font-medium placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400 shadow-[2px_2px_0px_0px_rgba(17,24,39,1)]"
          />
          {searchQuery.length > 0 && (
            <button
              onClick={() => onSearchQueryChange("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 bg-gray-200 rounded-full flex items-center justify-center hover:bg-gray-300 transition-colors"
            >
              <span className="material-icons-outlined text-gray-600 text-xs">
                close
              </span>
            </button>
          )}
        </div>

        {/* Results Count */}
        {searchQuery.length > 0 && (
          <span className="text-xs font-bold text-gray-600 px-2 py-1.5 bg-amber-200 border-2 border-gray-900 rounded-lg">
            {
              questions.filter((q) => {
                const query = searchQuery.toLowerCase();
                if (searchFilter === "questions") {
                  return q.question.toLowerCase().includes(query);
                } else if (searchFilter === "answers") {
                  return (
                    q.answer.toLowerCase().includes(query) ||
                    q.choices.some((c) => c.toLowerCase().includes(query))
                  );
                } else {
                  return (
                    q.question.toLowerCase().includes(query) ||
                    q.answer.toLowerCase().includes(query) ||
                    q.choices.some((c) => c.toLowerCase().includes(query))
                  );
                }
              }).length
            }{" "}
            found
          </span>
        )}

        {/* Spacer */}
        <div className="flex-1"></div>

        {/* Page Indicator - Right Side */}
        <div className="flex items-center gap-1 px-2 py-1 bg-white border-2 border-gray-900 rounded-lg shadow-[2px_2px_0px_0px_rgba(17,24,39,1)]">
          <span className="text-gray-900 font-bold text-xs">
            {currentQuestionIndex + 1}
          </span>
          <span className="text-gray-400 text-xs">/</span>
          <span className="text-gray-600 font-medium text-xs">
            {questions.length}
          </span>
        </div>
      </div>

      {/* Pagination Row */}
      <div className="flex items-center gap-3">
        <button
          onClick={() =>
            onQuestionIndexChange(Math.max(0, currentQuestionIndex - 1))
          }
          disabled={currentQuestionIndex === 0}
          className="w-10 h-full rounded-xl bg-amber-200 border-2 border-gray-900 hover:bg-amber-300 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed transition-colors shadow-[2px_2px_0px_0px_rgba(17,24,39,1)] flex-shrink-0"
        >
          <span className="material-icons-outlined text-gray-900">
            chevron_left
          </span>
        </button>

        <div
          ref={paginationRef}
          className="flex-1 flex items-center gap-3 overflow-x-auto py-1 px-1"
        >
          {questions.map((q, index) => {
            const qTypeInfo = getQuestionTypeInfo(q.type);
            const isActive = currentQuestionIndex === index;
            const hasContent = q.question.trim().length > 0;
            const questionPreview =
              q.question.trim().length > 0
                ? q.question.trim()
                : "Empty question...";

            // Check if question is incomplete
            const isIncomplete = ((): boolean => {
              if (q.question.trim().length === 0) return true;
              if (q.answer.trim().length === 0) return true;
              if (q.type === "multiple_choice") {
                const validChoices = q.choices.filter(
                  (c) => c.trim().length > 0
                );
                if (validChoices.length < 2) return true;
                if (
                  !validChoices.map((c) => c.trim()).includes(q.answer.trim())
                )
                  return true;
              }
              if (
                q.type === "true_or_false" &&
                q.answer !== "true" &&
                q.answer !== "false"
              )
                return true;
              return false;
            })();

            // Check if question matches search based on filter
            const matchesSearch =
              searchQuery.length > 0
                ? (() => {
                    const query = searchQuery.toLowerCase();
                    if (searchFilter === "questions") {
                      return q.question.toLowerCase().includes(query);
                    } else if (searchFilter === "answers") {
                      return (
                        q.answer.toLowerCase().includes(query) ||
                        q.choices.some((c) => c.toLowerCase().includes(query))
                      );
                    } else {
                      return (
                        q.question.toLowerCase().includes(query) ||
                        q.answer.toLowerCase().includes(query) ||
                        q.choices.some((c) => c.toLowerCase().includes(query))
                      );
                    }
                  })()
                : true;

            // Dim non-matching questions when searching
            const dimmed = searchQuery.length > 0 && !matchesSearch;

            return (
              <div
                key={q.id}
                onClick={() => onQuestionIndexChange(index)}
                className={`flex-shrink-0 rounded-xl border-2 overflow-hidden transition-all flex flex-col cursor-pointer relative ${
                  dimmed ? "opacity-30" : ""
                } ${
                  matchesSearch && searchQuery.length > 0
                    ? "ring-2 ring-amber-500"
                    : ""
                } ${
                  isIncomplete
                    ? "border-red-500 ring-2 ring-red-300"
                    : isActive
                      ? `border-gray-900 shadow-[3px_3px_0px_0px_rgba(17,24,39,1)] ring-2 ring-amber-400`
                      : hasContent
                        ? "border-gray-900 hover:shadow-[2px_2px_0px_0px_rgba(17,24,39,1)] hover:-translate-y-0.5"
                        : "border-gray-400 border-dashed hover:border-gray-900"
                }`}
                style={{ width: "240px", height: "152px" }}
              >
                {/* Red overlay for incomplete questions */}
                {isIncomplete && (
                  <div className="absolute inset-0 bg-red-500/10 pointer-events-none z-10">
                    <div className="absolute top-1 right-8 bg-red-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded">
                      Incomplete
                    </div>
                  </div>
                )}

                {/* Card Header with Type Icon */}
                <div
                  className={`${isIncomplete ? "bg-red-100" : isActive ? "bg-amber-300" : "bg-amber-200"} px-2 py-1.5 flex items-center justify-between border-b-2 ${isIncomplete ? "border-red-300" : isActive ? "border-gray-900" : "border-gray-300"}`}
                >
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`material-icons-outlined text-xs ${isIncomplete ? "text-red-600" : "text-gray-900"}`}
                    >
                      {qTypeInfo.icon}
                    </span>
                    <span
                      className={`text-xs font-black truncate ${isIncomplete ? "text-red-700" : isActive ? "text-gray-900" : "text-gray-700"}`}
                    >
                      {index + 1}. {qTypeInfo.label.split(" ")[0]}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    {matchesSearch && searchQuery.length > 0 && (
                      <span className="material-icons-outlined text-xs text-amber-600">
                        search
                      </span>
                    )}
                    {questions.length > 1 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveQuestion(q.id);
                        }}
                        className="hover:opacity-70 transition-opacity z-20"
                        title="Delete question"
                      >
                        <span className="material-icons text-red-600 text-sm">
                          delete
                        </span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Card Body with Question Preview */}
                <div
                  className={`flex-1 p-2 ${isIncomplete ? "bg-red-50" : isActive ? "bg-white" : "bg-amber-50"}`}
                >
                  <p
                    className={`text-[10px] leading-tight font-medium line-clamp-3 ${isIncomplete ? "text-red-700" : hasContent ? (isActive ? "text-gray-900" : "text-gray-700") : "text-gray-400 italic"}`}
                  >
                    {questionPreview}
                  </p>
                </div>

                {/* Card Footer with Answer Preview */}
                <div
                  className={`px-2 py-1 ${isIncomplete ? "bg-red-100/50" : isActive ? "bg-amber-100" : "bg-amber-100/50"} border-t ${isIncomplete ? "border-red-200" : isActive ? "border-gray-300" : "border-gray-200"}`}
                >
                  <p
                    className={`text-[9px] leading-tight font-medium line-clamp-2 ${isIncomplete ? "text-red-600" : q.answer.trim().length > 0 ? (isActive ? "text-gray-700" : "text-gray-500") : "text-gray-400 italic"}`}
                  >
                    {q.answer.trim().length > 0
                      ? q.answer.trim()
                      : "No answer yet"}
                  </p>
                </div>
              </div>
            );
          })}

          {/* Add Question Button */}
          <button
            onClick={() => onAddQuestion()}
            className="flex-shrink-0 rounded-xl border-2 border-dashed border-gray-400 flex flex-col items-center justify-center hover:border-gray-900 hover:bg-amber-200 transition-all group"
            style={{ width: "128px", height: "152px" }}
          >
            <div className="w-10 h-10 rounded-full bg-amber-100 border-2 border-gray-400 group-hover:border-gray-900 group-hover:bg-amber-300 flex items-center justify-center transition-all">
              <span className="material-icons-outlined text-gray-500 group-hover:text-gray-900 text-xl">
                add
              </span>
            </div>
            <span className="text-xs font-bold text-gray-500 group-hover:text-gray-900 mt-2">
              Add Question
            </span>
          </button>
        </div>

        <button
          onClick={() =>
            onQuestionIndexChange(
              Math.min(questions.length - 1, currentQuestionIndex + 1)
            )
          }
          disabled={currentQuestionIndex === questions.length - 1}
          className="w-10 h-full rounded-xl bg-amber-200 border-2 border-gray-900 hover:bg-amber-300 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed transition-colors shadow-[2px_2px_0px_0px_rgba(17,24,39,1)] flex-shrink-0"
        >
          <span className="material-icons-outlined text-gray-900">
            chevron_right
          </span>
        </button>
      </div>
    </nav>
  );
}
