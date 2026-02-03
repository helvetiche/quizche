import React from "react";
import Image from "next/image";
import { QUESTION_TYPES } from "./types";
import type { Question, QuestionType } from "./types";

type ComposerQuestionEditorProps = {
  currentQuestion: Question | undefined;
  currentQuestionIndex: number;
  totalQuestions: number;
  onQuestionChange: (
    id: string,
    field: keyof Question,
    value: Question[keyof Question]
  ) => void;
  onImageSelect: (questionId: string, file: File) => void;
  onRemoveImage: (questionId: string) => void;
  onChoiceChange: (
    questionId: string,
    choiceIndex: number,
    value: string
  ) => void;
  onAddChoice: (questionId: string) => void;
  onRemoveChoice: (questionId: string, choiceIndex: number) => void;
  onChoiceExplanationChange: (
    questionId: string,
    choiceIndex: number,
    value: string
  ) => void;
  onExplanationChange: (questionId: string, value: string) => void;
  showExplanations: boolean;
  onToggleExplanations: () => void;
  hasDuplicateChoices: (questionId: string) => boolean;
  duplicateIndices: number[];
};

export default function ComposerQuestionEditor({
  currentQuestion,
  currentQuestionIndex,
  totalQuestions,
  onQuestionChange,
  onImageSelect,
  onRemoveImage,
  onChoiceChange,
  onAddChoice,
  onRemoveChoice,
  onChoiceExplanationChange,
  onExplanationChange,
  showExplanations,
  onToggleExplanations,
  hasDuplicateChoices,
  duplicateIndices,
}: ComposerQuestionEditorProps): React.ReactElement {
  const getQuestionTypeInfo = (
    type: QuestionType
  ): (typeof QUESTION_TYPES)[number] => {
    return QUESTION_TYPES.find((t) => t.value === type) ?? QUESTION_TYPES[0];
  };

  if (!currentQuestion) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 bg-amber-50">
        <div className="text-center text-gray-500">
          <p className="font-bold">No questions selected</p>
          <p className="text-sm">Select or add a question to start editing</p>
        </div>
      </div>
    );
  }

  const typeInfo = getQuestionTypeInfo(currentQuestion.type);

  return (
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
                  Question {currentQuestionIndex + 1} of {totalQuestions}
                </p>
              </div>
            </div>
            <select
              value={currentQuestion.type}
              onChange={(e) =>
                onQuestionChange(
                  currentQuestion.id,
                  "type",
                  e.target.value as QuestionType
                )
              }
              className="px-4 py-2 bg-white border-2 border-gray-900 rounded-xl font-bold text-gray-900 text-sm cursor-pointer focus:outline-none shadow-[2px_2px_0px_0px_rgba(17,24,39,1)]"
            >
              {QUESTION_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* Card Body */}
          <div className="p-6 flex flex-col gap-6 bg-amber-50">
            {/* Question + Image Row */}
            <div className="flex gap-6">
              {/* Question Text - Left Side */}
              <div className="flex-1">
                <label className="text-sm font-black text-gray-900 mb-2 block">
                  Question <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={currentQuestion.question}
                  onChange={(e) =>
                    onQuestionChange(
                      currentQuestion.id,
                      "question",
                      e.target.value
                    )
                  }
                  className="w-full h-40 px-4 py-4 bg-white border-2 border-gray-900 rounded-xl text-gray-900 font-medium text-lg placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none shadow-[2px_2px_0px_0px_rgba(17,24,39,1)]"
                  placeholder="Type your question here..."
                />
              </div>

              {/* Image Upload - Right Side */}
              <div className="w-64 flex-shrink-0">
                <label className="text-sm font-black text-gray-900 mb-2 block">
                  Image (Optional)
                </label>
                {(currentQuestion.imagePreview !== undefined &&
                  currentQuestion.imagePreview !== "") ||
                (currentQuestion.imageUrl !== undefined &&
                  currentQuestion.imageUrl !== "") ? (
                  <div className="relative h-40 border-2 border-gray-900 rounded-xl overflow-hidden bg-white group">
                    <Image
                      src={
                        currentQuestion.imagePreview ??
                        currentQuestion.imageUrl ??
                        ""
                      }
                      alt="Question"
                      fill
                      className="object-contain"
                      unoptimized={
                        currentQuestion.imagePreview !== undefined &&
                        currentQuestion.imagePreview !== ""
                      }
                    />
                    <button
                      onClick={() => onRemoveImage(currentQuestion.id)}
                      className="absolute top-2 right-2 w-8 h-8 bg-red-400 text-gray-900 rounded-lg border-2 border-gray-900 hover:bg-red-500 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100"
                    >
                      <span className="material-icons-outlined text-sm">
                        close
                      </span>
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center gap-2 h-40 bg-white border-2 border-dashed border-gray-400 rounded-xl cursor-pointer hover:border-gray-900 hover:bg-amber-100 transition-all">
                    <span className="material-icons-outlined text-gray-400 text-4xl">
                      add_photo_alternate
                    </span>
                    <span className="text-xs font-bold text-gray-500">
                      Click to upload
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) onImageSelect(currentQuestion.id, file);
                        e.target.value = "";
                      }}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>

            {/* Multiple Choice */}
            {currentQuestion.type === "multiple_choice" && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-black text-gray-900">
                    Choices <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={onToggleExplanations}
                      className={`px-3 py-1.5 font-bold text-xs rounded-lg border-2 transition-colors flex items-center gap-1 ${showExplanations ? "bg-green-400 border-gray-900 text-gray-900 shadow-[2px_2px_0px_0px_rgba(17,24,39,1)]" : "bg-green-100 border-green-400 text-green-700 hover:bg-green-200"}`}
                    >
                      <span className="material-icons-outlined text-sm">
                        lightbulb
                      </span>
                      {showExplanations ? "Hide" : "Show"} Explanations
                    </button>
                    {currentQuestion.choices.length < 6 && (
                      <button
                        onClick={() => onAddChoice(currentQuestion.id)}
                        className="px-3 py-1.5 bg-amber-200 text-gray-900 font-bold text-xs rounded-lg border-2 border-gray-900 hover:bg-amber-300 transition-colors flex items-center gap-1 shadow-[2px_2px_0px_0px_rgba(17,24,39,1)]"
                      >
                        <span className="material-icons-outlined text-sm">
                          add
                        </span>{" "}
                        Add
                      </button>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {currentQuestion.choices.map((choice, idx) => {
                    const isDuplicate = duplicateIndices.includes(idx);
                    const isCorrect =
                      currentQuestion.answer.trim() === choice.trim() &&
                      choice.trim().length > 0;
                    const choiceExplanation =
                      currentQuestion.choiceExplanations?.[idx] ?? "";
                    return (
                      <div key={idx} className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() =>
                              choice.trim() &&
                              onQuestionChange(
                                currentQuestion.id,
                                "answer",
                                choice.trim()
                              )
                            }
                            className={`w-8 h-8 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${isCorrect ? "bg-green-400 border-gray-900 shadow-[2px_2px_0px_0px_rgba(17,24,39,1)]" : "bg-white border-gray-400 hover:border-gray-900 hover:bg-green-100"}`}
                          >
                            {isCorrect && (
                              <span className="material-icons-outlined text-gray-900 text-xs">
                                check
                              </span>
                            )}
                          </button>
                          <input
                            type="text"
                            value={choice}
                            onChange={(e) =>
                              onChoiceChange(
                                currentQuestion.id,
                                idx,
                                e.target.value
                              )
                            }
                            className={`flex-1 min-w-0 px-3 py-2 bg-white border-2 rounded-xl font-medium text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400 transition-all ${isDuplicate ? "border-red-500" : isCorrect ? "border-green-500 bg-green-50" : "border-gray-300 focus:border-gray-900"}`}
                            placeholder={`Choice ${idx + 1}`}
                          />
                          {currentQuestion.choices.length > 2 && (
                            <button
                              onClick={() =>
                                onRemoveChoice(currentQuestion.id, idx)
                              }
                              className="w-7 h-7 bg-amber-100 rounded-lg flex items-center justify-center border-2 border-gray-300 hover:bg-red-100 hover:border-red-500 hover:text-red-600 transition-colors flex-shrink-0"
                            >
                              <span className="material-icons-outlined text-xs">
                                close
                              </span>
                            </button>
                          )}
                        </div>
                        {/* Choice Explanation */}
                        {showExplanations && (
                          <div className="ml-10">
                            <div
                              className={`flex items-start gap-2 p-2 rounded-xl border-2 ${isCorrect ? "bg-green-50 border-green-300" : "bg-gray-50 border-gray-300"}`}
                            >
                              <span
                                className={`material-icons-outlined text-xs mt-0.5 ${isCorrect ? "text-green-600" : "text-gray-400"}`}
                              >
                                {isCorrect ? "check_circle" : "cancel"}
                              </span>
                              <div className="flex-1">
                                <label
                                  className={`text-xs font-bold mb-1 block ${isCorrect ? "text-green-700" : "text-gray-500"}`}
                                >
                                  {isCorrect ? "Why correct:" : "Why wrong:"}
                                </label>
                                <textarea
                                  value={choiceExplanation}
                                  onChange={(e) =>
                                    onChoiceExplanationChange(
                                      currentQuestion.id,
                                      idx,
                                      e.target.value
                                    )
                                  }
                                  className={`w-full px-2 py-1.5 bg-white border-2 rounded-lg text-xs font-medium placeholder:text-gray-400 focus:outline-none resize-none transition-all ${isCorrect ? "border-green-300 focus:border-green-500 focus:ring-2 focus:ring-green-200" : "border-gray-300 focus:border-gray-500 focus:ring-2 focus:ring-gray-200"}`}
                                  placeholder={
                                    isCorrect
                                      ? "Why this is correct..."
                                      : "Why this is incorrect..."
                                  }
                                  rows={2}
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                {hasDuplicateChoices(currentQuestion.id) && (
                  <p className="text-sm text-red-500 font-bold mt-3 flex items-center gap-1">
                    <span className="material-icons-outlined text-sm">
                      warning
                    </span>{" "}
                    Duplicate choices
                  </p>
                )}
                <p className="text-xs text-gray-600 font-medium mt-3">
                  Click the circle to mark the correct answer • Max 6 choices
                </p>
              </div>
            )}

            {/* True/False */}
            {currentQuestion.type === "true_or_false" && (
              <div>
                <label className="text-sm font-black text-gray-900 mb-3 block">
                  Correct Answer <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-4">
                  <button
                    onClick={() =>
                      onQuestionChange(currentQuestion.id, "answer", "true")
                    }
                    className={`flex-1 py-4 rounded-xl border-2 font-bold text-lg transition-all ${currentQuestion.answer === "true" ? "bg-green-400 border-gray-900 text-gray-900 shadow-[3px_3px_0px_0px_rgba(17,24,39,1)]" : "bg-white border-gray-300 text-gray-700 hover:border-green-500"}`}
                  >
                    <span className="flex items-center justify-center gap-2">
                      <span className="material-icons-outlined">check</span>{" "}
                      True
                    </span>
                  </button>
                  <button
                    onClick={() =>
                      onQuestionChange(currentQuestion.id, "answer", "false")
                    }
                    className={`flex-1 py-4 rounded-xl border-2 font-bold text-lg transition-all ${currentQuestion.answer === "false" ? "bg-red-400 border-gray-900 text-gray-900 shadow-[3px_3px_0px_0px_rgba(17,24,39,1)]" : "bg-white border-gray-300 text-gray-700 hover:border-red-500"}`}
                  >
                    <span className="flex items-center justify-center gap-2">
                      <span className="material-icons-outlined">close</span>{" "}
                      False
                    </span>
                  </button>
                </div>
                {/* Explanation for True/False */}
                <div className="mt-4">
                  <label className="text-sm font-black text-gray-900 mb-2 flex items-center gap-2">
                    <span className="material-icons-outlined text-green-500 text-sm">
                      lightbulb
                    </span>
                    Explanation (Optional)
                  </label>
                  <textarea
                    value={currentQuestion.explanation ?? ""}
                    onChange={(e) =>
                      onExplanationChange(currentQuestion.id, e.target.value)
                    }
                    className="w-full px-4 py-3 bg-green-50 border-2 border-green-300 rounded-xl font-medium placeholder:text-gray-400 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-200 resize-none transition-all shadow-[2px_2px_0px_0px_rgba(34,197,94,0.3)]"
                    placeholder="Explain why this statement is true or false..."
                    rows={3}
                  />
                </div>
              </div>
            )}

            {/* Text Answer Types */}
            {(currentQuestion.type === "identification" ||
              currentQuestion.type === "enumeration" ||
              currentQuestion.type === "essay" ||
              currentQuestion.type === "reflection") && (
              <div>
                <label className="text-sm font-black text-gray-900 mb-2 block">
                  {currentQuestion.type === "enumeration"
                    ? "Answers (comma-separated)"
                    : currentQuestion.type === "essay" ||
                        currentQuestion.type === "reflection"
                      ? "Sample Answer / Rubric"
                      : "Correct Answer"}{" "}
                  <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={currentQuestion.answer}
                  onChange={(e) =>
                    onQuestionChange(
                      currentQuestion.id,
                      "answer",
                      e.target.value
                    )
                  }
                  className="w-full px-4 py-3 bg-white border-2 border-gray-900 rounded-xl font-medium placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none shadow-[2px_2px_0px_0px_rgba(17,24,39,1)]"
                  placeholder={
                    currentQuestion.type === "enumeration"
                      ? "Answer 1, Answer 2, Answer 3..."
                      : currentQuestion.type === "essay" ||
                          currentQuestion.type === "reflection"
                        ? "Enter sample answer or rubric..."
                        : "Enter the correct answer..."
                  }
                  rows={
                    currentQuestion.type === "essay" ||
                    currentQuestion.type === "reflection"
                      ? 4
                      : 2
                  }
                />
                {/* Explanation for Identification */}
                {currentQuestion.type === "identification" && (
                  <div className="mt-4">
                    <label className="text-sm font-black text-gray-900 mb-2 flex items-center gap-2">
                      <span className="material-icons-outlined text-green-500 text-sm">
                        lightbulb
                      </span>
                      Explanation (Optional)
                    </label>
                    <textarea
                      value={currentQuestion.explanation ?? ""}
                      onChange={(e) =>
                        onExplanationChange(currentQuestion.id, e.target.value)
                      }
                      className="w-full px-4 py-3 bg-green-50 border-2 border-green-300 rounded-xl font-medium placeholder:text-gray-400 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-200 resize-none transition-all shadow-[2px_2px_0px_0px_rgba(34,197,94,0.3)]"
                      placeholder="Explain why this is the correct answer..."
                      rows={3}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
