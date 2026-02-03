import { useState, useRef } from "react";
import type { ReactElement } from "react";
import Image from "next/image";
import type { Quiz } from "../types";

const QUESTION_TYPES: Record<string, { label: string; icon: string }> = {
  multiple_choice: { label: "Multiple Choice", icon: "radio_button_checked" },
  identification: { label: "Identification", icon: "text_fields" },
  true_or_false: { label: "True / False", icon: "toggle_on" },
  essay: { label: "Essay", icon: "article" },
  enumeration: { label: "Enumeration", icon: "format_list_numbered" },
  reflection: { label: "Reflection", icon: "psychology" },
};

type QuizQuestionsViewProps = {
  quiz: Quiz;
};

export default function QuizQuestionsView({
  quiz,
}: QuizQuestionsViewProps): ReactElement {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFilter, setSearchFilter] = useState<
    "all" | "questions" | "answers"
  >("all");
  const paginationRef = useRef<HTMLDivElement>(null);

  const getTypeInfo = (type: string): { label: string; icon: string } =>
    QUESTION_TYPES[type] ?? QUESTION_TYPES.multiple_choice;

  const currentQuestion = quiz.questions[currentQuestionIndex];
  const typeInfo = getTypeInfo(currentQuestion.type);

  return (
    <>
      {/* Canvas Area */}
      <div className="flex-1 overflow-y-auto p-8 bg-amber-50">
        <div className="mx-auto">
          <div className="bg-white rounded-2xl border-2 border-gray-900 shadow-[6px_6px_0px_0px_rgba(17,24,39,1)] overflow-hidden">
            {/* Card Header */}
            <div className="bg-amber-200 px-6 py-4 flex items-center justify-between border-b-2 border-gray-900">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(17,24,39,1)]">
                  <span className="text-2xl font-black text-gray-900">
                    {currentQuestionIndex + 1}
                  </span>
                </div>
                <div>
                  <p className="text-gray-900 font-black text-lg">
                    {typeInfo.label}
                  </p>
                  <p className="text-gray-700 text-sm font-medium">
                    Question {currentQuestionIndex + 1} of{" "}
                    {quiz.questions.length}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="material-icons-outlined text-gray-700">
                  {typeInfo.icon}
                </span>
                <span className="px-3 py-1.5 bg-white border-2 border-gray-900 rounded-lg font-bold text-gray-900 text-sm shadow-[2px_2px_0px_0px_rgba(17,24,39,1)]">
                  {typeInfo.label}
                </span>
              </div>
            </div>

            {/* Card Body */}
            <div className="p-6 flex flex-col gap-6 bg-amber-50">
              {/* Question + Image Row */}
              <div className="flex gap-6">
                {/* Question Text - Left Side */}
                <div className="flex-1">
                  <label className="text-sm font-black text-gray-900 mb-2 block">
                    Question
                  </label>
                  <div className="w-full min-h-[120px] px-4 py-4 bg-white border-2 border-gray-900 rounded-xl text-gray-900 font-medium text-lg shadow-[2px_2px_0px_0px_rgba(17,24,39,1)]">
                    {currentQuestion.question || (
                      <span className="text-gray-400 italic">
                        No question text
                      </span>
                    )}
                  </div>
                </div>

                {/* Image - Right Side */}
                {currentQuestion.imageUrl !== undefined &&
                  currentQuestion.imageUrl !== "" && (
                    <div className="w-64 flex-shrink-0">
                      <label className="text-sm font-black text-gray-900 mb-2 block">
                        Image
                      </label>
                      <div className="relative h-40 border-2 border-gray-900 rounded-xl overflow-hidden bg-white shadow-[2px_2px_0px_0px_rgba(17,24,39,1)]">
                        <Image
                          src={currentQuestion.imageUrl}
                          alt="Question"
                          fill
                          className="object-contain"
                          unoptimized
                        />
                      </div>
                    </div>
                  )}
              </div>

              {/* Multiple Choice Display */}
              {currentQuestion.type === "multiple_choice" &&
                currentQuestion.choices !== undefined && (
                  <div>
                    <label className="text-sm font-black text-gray-900 mb-3 block">
                      Choices
                    </label>
                    <div className="flex flex-col gap-3">
                      {currentQuestion.choices.map((choice, idx) => {
                        const isCorrect =
                          currentQuestion.answer.trim() === choice.trim();
                        const explanation =
                          currentQuestion.choiceExplanations?.[idx];
                        const hasExplanation =
                          explanation !== undefined &&
                          explanation.trim().length > 0;
                        return (
                          <div key={idx} className="flex flex-col gap-2">
                            <div className="flex items-center gap-2">
                              <div
                                className={`w-9 h-9 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${isCorrect ? "bg-amber-400 border-gray-900 shadow-[2px_2px_0px_0px_rgba(17,24,39,1)]" : "bg-white border-gray-400"}`}
                              >
                                {isCorrect && (
                                  <span className="material-icons-outlined text-gray-900 text-sm">
                                    check
                                  </span>
                                )}
                              </div>
                              <div
                                className={`flex-1 px-3 py-2.5 bg-white border-2 rounded-xl font-medium text-sm ${isCorrect ? "border-amber-500 bg-amber-50" : "border-gray-300"}`}
                              >
                                {choice || (
                                  <span className="text-gray-400 italic">
                                    Empty choice
                                  </span>
                                )}
                              </div>
                            </div>
                            {/* Choice Explanation */}
                            {hasExplanation && (
                              <div
                                className={`ml-11 p-3 rounded-xl border-2 ${isCorrect ? "bg-green-50 border-green-300" : "bg-red-50 border-red-300"}`}
                              >
                                <div className="flex items-start gap-2">
                                  <span
                                    className={`material-icons-outlined text-sm mt-0.5 ${isCorrect ? "text-green-600" : "text-red-600"}`}
                                  >
                                    {isCorrect ? "check_circle" : "cancel"}
                                  </span>
                                  <div>
                                    <p
                                      className={`text-xs font-bold mb-1 ${isCorrect ? "text-green-700" : "text-red-700"}`}
                                    >
                                      {isCorrect
                                        ? "Why this is correct:"
                                        : "Why this is wrong:"}
                                    </p>
                                    <p
                                      className={`text-sm ${isCorrect ? "text-green-800" : "text-red-800"}`}
                                    >
                                      {explanation}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

              {/* True/False Display */}
              {currentQuestion.type === "true_or_false" && (
                <div>
                  <label className="text-sm font-black text-gray-900 mb-3 block">
                    Correct Answer
                  </label>
                  <div className="flex gap-4">
                    <div
                      className={`flex-1 py-4 rounded-xl border-2 font-bold text-lg text-center ${currentQuestion.answer === "true" ? "bg-amber-400 border-gray-900 text-gray-900 shadow-[3px_3px_0px_0px_rgba(17,24,39,1)]" : "bg-white border-gray-300 text-gray-400"}`}
                    >
                      <span className="flex items-center justify-center gap-2">
                        <span className="material-icons-outlined">check</span>{" "}
                        True
                      </span>
                    </div>
                    <div
                      className={`flex-1 py-4 rounded-xl border-2 font-bold text-lg text-center ${currentQuestion.answer === "false" ? "bg-amber-400 border-gray-900 text-gray-900 shadow-[3px_3px_0px_0px_rgba(17,24,39,1)]" : "bg-white border-gray-300 text-gray-400"}`}
                    >
                      <span className="flex items-center justify-center gap-2">
                        <span className="material-icons-outlined">close</span>{" "}
                        False
                      </span>
                    </div>
                  </div>
                  {/* Explanation for True/False */}
                  {currentQuestion.explanation !== undefined &&
                    currentQuestion.explanation.trim().length > 0 && (
                      <div className="mt-4 p-4 bg-green-50 border-2 border-green-300 rounded-xl">
                        <div className="flex items-start gap-2">
                          <span className="material-icons-outlined text-green-600 text-sm mt-0.5">
                            lightbulb
                          </span>
                          <div>
                            <p className="text-xs font-bold text-green-700 mb-1">
                              Explanation
                            </p>
                            <p className="text-sm text-green-800">
                              {currentQuestion.explanation}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                </div>
              )}

              {/* Text Answer Types Display */}
              {(currentQuestion.type === "identification" ||
                currentQuestion.type === "enumeration" ||
                currentQuestion.type === "essay" ||
                currentQuestion.type === "reflection") && (
                <div>
                  <label className="text-sm font-black text-gray-900 mb-2 block">
                    {currentQuestion.type === "enumeration"
                      ? "Answers"
                      : currentQuestion.type === "essay" ||
                          currentQuestion.type === "reflection"
                        ? "Sample Answer / Rubric"
                        : "Correct Answer"}
                  </label>
                  <div className="w-full px-4 py-3 bg-white border-2 border-gray-900 rounded-xl font-medium shadow-[2px_2px_0px_0px_rgba(17,24,39,1)] min-h-[60px]">
                    {currentQuestion.answer || (
                      <span className="text-gray-400 italic">
                        No answer provided
                      </span>
                    )}
                  </div>
                  {/* Explanation for Identification */}
                  {currentQuestion.type === "identification" &&
                    currentQuestion.explanation !== undefined &&
                    currentQuestion.explanation.trim().length > 0 && (
                      <div className="mt-4 p-4 bg-green-50 border-2 border-green-300 rounded-xl">
                        <div className="flex items-start gap-2">
                          <span className="material-icons-outlined text-green-600 text-sm mt-0.5">
                            lightbulb
                          </span>
                          <div>
                            <p className="text-xs font-bold text-green-700 mb-1">
                              Explanation
                            </p>
                            <p className="text-sm text-green-800">
                              {currentQuestion.explanation}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM PAGINATION */}
      <nav className="flex flex-col gap-2 px-4 py-3 bg-amber-100 border-t-2 border-gray-900">
        {/* Search Bar & Filters */}
        <div className="flex items-center gap-2">
          {/* Filter Buttons */}
          <div className="flex items-center bg-white border-2 border-gray-900 rounded-xl overflow-hidden shadow-[2px_2px_0px_0px_rgba(17,24,39,1)] h-[42px]">
            <button
              onClick={() => setSearchFilter("all")}
              className={`px-3 h-full text-xs font-bold transition-colors ${searchFilter === "all" ? "bg-amber-300 text-gray-900" : "bg-white text-gray-600 hover:bg-amber-100"}`}
            >
              All
            </button>
            <button
              onClick={() => setSearchFilter("questions")}
              className={`px-3 h-full text-xs font-bold border-l-2 border-gray-900 transition-colors ${searchFilter === "questions" ? "bg-amber-300 text-gray-900" : "bg-white text-gray-600 hover:bg-amber-100"}`}
            >
              Questions
            </button>
            <button
              onClick={() => setSearchFilter("answers")}
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
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search ${searchFilter === "all" ? "all" : searchFilter}...`}
              className="w-full h-full pl-9 pr-8 bg-white border-2 border-gray-900 rounded-xl text-sm font-medium placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400 shadow-[2px_2px_0px_0px_rgba(17,24,39,1)]"
            />
            {searchQuery !== "" && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 bg-gray-200 rounded-full flex items-center justify-center hover:bg-gray-300 transition-colors"
              >
                <span className="material-icons-outlined text-gray-600 text-xs">
                  close
                </span>
              </button>
            )}
          </div>

          {/* Results Count */}
          {searchQuery !== "" && (
            <span className="text-xs font-bold text-gray-600 px-2 py-1.5 bg-amber-200 border-2 border-gray-900 rounded-lg">
              {
                quiz.questions.filter((q) => {
                  const query = searchQuery.toLowerCase();
                  if (searchFilter === "questions") {
                    return q.question.toLowerCase().includes(query);
                  } else if (searchFilter === "answers") {
                    return (
                      q.answer.toLowerCase().includes(query) ||
                      (q.choices ?? []).some((c) =>
                        c.toLowerCase().includes(query)
                      )
                    );
                  } else {
                    return (
                      q.question.toLowerCase().includes(query) ||
                      q.answer.toLowerCase().includes(query) ||
                      (q.choices ?? []).some((c) =>
                        c.toLowerCase().includes(query)
                      )
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
              {quiz.questions.length}
            </span>
          </div>
        </div>

        {/* Pagination Row */}
        <div className="flex items-center gap-3">
          <button
            onClick={() =>
              setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))
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
            {quiz.questions.map((q, index) => {
              const qTypeInfo = getTypeInfo(q.type);
              const isActive = currentQuestionIndex === index;
              const hasContent = q.question.trim().length > 0;
              const questionPreview = q.question.trim() || "Empty question...";

              // Check if question matches search based on filter
              const matchesSearch =
                searchQuery !== ""
                  ? (() => {
                      const query = searchQuery.toLowerCase();
                      if (searchFilter === "questions") {
                        return q.question.toLowerCase().includes(query);
                      } else if (searchFilter === "answers") {
                        return (
                          q.answer.toLowerCase().includes(query) ||
                          (q.choices ?? []).some((c) =>
                            c.toLowerCase().includes(query)
                          )
                        );
                      } else {
                        return (
                          q.question.toLowerCase().includes(query) ||
                          q.answer.toLowerCase().includes(query) ||
                          (q.choices ?? []).some((c) =>
                            c.toLowerCase().includes(query)
                          )
                        );
                      }
                    })()
                  : true;

              // Dim non-matching questions when searching
              const dimmed = searchQuery !== "" && !matchesSearch;

              return (
                <div
                  key={index}
                  onClick={() => setCurrentQuestionIndex(index)}
                  className={`flex-shrink-0 rounded-xl border-2 overflow-hidden transition-all flex flex-col cursor-pointer ${
                    dimmed ? "opacity-30" : ""
                  } ${
                    matchesSearch && searchQuery !== ""
                      ? "ring-2 ring-amber-500"
                      : ""
                  } ${
                    isActive
                      ? "border-gray-900 shadow-[3px_3px_0px_0px_rgba(17,24,39,1)] ring-2 ring-amber-400"
                      : hasContent
                        ? "border-gray-900 hover:shadow-[2px_2px_0px_0px_rgba(17,24,39,1)] hover:-translate-y-0.5"
                        : "border-gray-400 border-dashed hover:border-gray-900"
                  }`}
                  style={{ width: "240px", height: "152px" }}
                >
                  {/* Card Header with Type Icon */}
                  <div
                    className={`${isActive ? "bg-amber-300" : "bg-amber-200"} px-2 py-1.5 flex items-center justify-between border-b-2 ${isActive ? "border-gray-900" : "border-gray-300"}`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="material-icons-outlined text-xs text-gray-900">
                        {qTypeInfo.icon}
                      </span>
                      <span
                        className={`text-xs font-black truncate ${isActive ? "text-gray-900" : "text-gray-700"}`}
                      >
                        {index + 1}. {qTypeInfo.label.split(" ")[0]}
                      </span>
                    </div>
                    {matchesSearch && searchQuery !== "" && (
                      <span className="material-icons-outlined text-xs text-amber-600">
                        search
                      </span>
                    )}
                  </div>

                  {/* Card Body with Question Preview */}
                  <div
                    className={`flex-1 p-2 ${isActive ? "bg-white" : "bg-amber-50"}`}
                  >
                    <p
                      className={`text-[10px] leading-tight font-medium line-clamp-3 ${hasContent ? (isActive ? "text-gray-900" : "text-gray-700") : "text-gray-400 italic"}`}
                    >
                      {questionPreview}
                    </p>
                  </div>

                  {/* Card Footer with Answer Preview */}
                  <div
                    className={`px-2 py-1 ${isActive ? "bg-amber-100" : "bg-amber-100/50"} border-t ${isActive ? "border-gray-300" : "border-gray-200"}`}
                  >
                    <p
                      className={`text-[9px] leading-tight font-medium line-clamp-2 ${q.answer.trim() ? (isActive ? "text-gray-700" : "text-gray-500") : "text-gray-400 italic"}`}
                    >
                      {q.answer.trim() || "No answer"}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            onClick={() =>
              setCurrentQuestionIndex(
                Math.min(quiz.questions.length - 1, currentQuestionIndex + 1)
              )
            }
            disabled={currentQuestionIndex === quiz.questions.length - 1}
            className="w-10 h-full rounded-xl bg-amber-200 border-2 border-gray-900 hover:bg-amber-300 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed transition-colors shadow-[2px_2px_0px_0px_rgba(17,24,39,1)] flex-shrink-0"
          >
            <span className="material-icons-outlined text-gray-900">
              chevron_right
            </span>
          </button>
        </div>
      </nav>
    </>
  );
}
