import React from "react";
import Image from "next/image";
import { type Question, QUESTION_TYPES, type QuestionType } from "./types";

type QuizFormQuestionEditorProps = {
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

export default function QuizFormQuestionEditor({
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
}: QuizFormQuestionEditorProps): React.ReactElement | null {
  const getQuestionTypeInfo = (
    type: QuestionType
  ): (typeof QUESTION_TYPES)[number] =>
    QUESTION_TYPES.find((t) => t.value === type) ?? QUESTION_TYPES[0];

  if (!currentQuestion) return null;

  const typeInfo = getQuestionTypeInfo(currentQuestion.type);

  return (
    <div className="flex-1 overflow-y-auto p-8">
      <div className="max-w-4xl mx-auto">
        {/* Question Card */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Card Header */}
          <div
            className={`${typeInfo.color} px-6 py-4 flex items-center justify-between`}
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
                <span className="text-2xl font-black text-gray-900">
                  {currentQuestionIndex + 1}
                </span>
              </div>
              <div>
                <p className="text-gray-900 font-bold text-lg">
                  {typeInfo.label}
                </p>
                <p className="text-gray-900/60 text-sm">
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
              className="px-4 py-2 bg-white/20 backdrop-blur border-2 border-gray-900/20 rounded-xl font-bold text-gray-900 text-sm cursor-pointer focus:outline-none"
            >
              {QUESTION_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* Card Body */}
          <div className="p-6 flex flex-col gap-6">
            {/* Question Text */}
            <div>
              <label className="text-sm font-bold text-gray-600 mb-2 block">
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
                className="w-full px-4 py-4 bg-gray-50 border-2 border-gray-200 rounded-xl text-gray-900 font-medium text-lg placeholder:text-gray-400 focus:outline-none focus:border-gray-900 focus:bg-white resize-none transition-all"
                placeholder="Type your question here..."
                rows={3}
              />
            </div>

            {/* Image Upload */}
            <div>
              <label className="text-sm font-bold text-gray-600 mb-2 block">
                Image (Optional)
              </label>
              {Boolean(currentQuestion.imagePreview) ||
              Boolean(currentQuestion.imageUrl) ? (
                <div className="flex items-start gap-4">
                  <div className="relative w-48 h-32 border-2 border-gray-200 rounded-xl overflow-hidden bg-gray-100">
                    <Image
                      src={
                        currentQuestion.imagePreview ??
                        currentQuestion.imageUrl ??
                        ""
                      }
                      alt="Question image"
                      fill
                      className="object-contain"
                      unoptimized={!!currentQuestion.imagePreview}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemoveImage(currentQuestion.id)}
                    className="px-4 py-2 bg-red-100 text-red-600 font-bold text-sm rounded-lg hover:bg-red-200 transition-colors"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center gap-2 p-6 bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-gray-900 hover:bg-gray-100 transition-all">
                  <span className="material-icons-outlined text-gray-400 text-3xl">
                    cloud_upload
                  </span>
                  <span className="text-sm font-medium text-gray-500">
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

            {/* Answer Section based on type */}
            {currentQuestion.type === "multiple_choice" && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-bold text-gray-600">
                    Choices <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={onToggleExplanations}
                      className={`px-3 py-1.5 font-bold text-xs rounded-lg transition-colors flex items-center gap-1 ${showExplanations ? "bg-purple-500 text-white" : "bg-purple-100 text-purple-600 hover:bg-purple-200"}`}
                    >
                      <span className="material-icons-outlined text-sm">
                        lightbulb
                      </span>
                      {showExplanations ? "Hide" : "Show"} Explanations
                    </button>
                    <button
                      type="button"
                      onClick={() => onAddChoice(currentQuestion.id)}
                      className="px-3 py-1.5 bg-blue-100 text-blue-600 font-bold text-xs rounded-lg hover:bg-blue-200 transition-colors flex items-center gap-1"
                    >
                      <span className="material-icons-outlined text-sm">
                        add
                      </span>{" "}
                      Add
                    </button>
                  </div>
                </div>
                <div className="flex flex-col gap-3">
                  {currentQuestion.choices.map((choice, choiceIndex) => {
                    const isDuplicate = duplicateIndices.includes(choiceIndex);
                    const isCorrect =
                      currentQuestion.answer.trim() === choice.trim() &&
                      choice.trim().length > 0;
                    const choiceExplanation =
                      currentQuestion.choiceExplanations?.[choiceIndex] ?? "";
                    return (
                      <div key={choiceIndex} className="flex flex-col gap-2">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() =>
                              choice.trim() &&
                              onQuestionChange(
                                currentQuestion.id,
                                "answer",
                                choice.trim()
                              )
                            }
                            className={`w-10 h-10 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${isCorrect ? "bg-green-500 border-green-600 text-white" : "bg-gray-100 border-gray-300 hover:border-green-500 hover:bg-green-50"}`}
                          >
                            {isCorrect && (
                              <span className="material-icons-outlined">
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
                                choiceIndex,
                                e.target.value
                              )
                            }
                            className={`flex-1 px-4 py-3 bg-gray-50 border-2 rounded-xl font-medium placeholder:text-gray-400 focus:outline-none focus:bg-white transition-all ${isDuplicate ? "border-red-500" : isCorrect ? "border-green-500 bg-green-50" : "border-gray-200 focus:border-gray-900"}`}
                            placeholder={`Choice ${choiceIndex + 1}`}
                          />
                          {currentQuestion.choices.length > 2 && (
                            <button
                              type="button"
                              onClick={() =>
                                onRemoveChoice(currentQuestion.id, choiceIndex)
                              }
                              className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center hover:bg-red-100 hover:text-red-600 transition-colors"
                            >
                              <span className="material-icons-outlined">
                                close
                              </span>
                            </button>
                          )}
                        </div>
                        {/* Choice Explanation */}
                        {showExplanations && (
                          <div className="ml-13 pl-10">
                            <div
                              className={`flex items-start gap-2 p-3 rounded-xl border-2 ${isCorrect ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200"}`}
                            >
                              <span
                                className={`material-icons-outlined text-sm mt-0.5 ${isCorrect ? "text-green-500" : "text-gray-400"}`}
                              >
                                {isCorrect ? "check_circle" : "cancel"}
                              </span>
                              <div className="flex-1">
                                <label
                                  className={`text-xs font-bold mb-1 block ${isCorrect ? "text-green-700" : "text-gray-500"}`}
                                >
                                  {isCorrect
                                    ? "Why this is correct:"
                                    : "Why this is wrong:"}
                                </label>
                                <textarea
                                  value={choiceExplanation}
                                  onChange={(e) =>
                                    onChoiceExplanationChange(
                                      currentQuestion.id,
                                      choiceIndex,
                                      e.target.value
                                    )
                                  }
                                  className={`w-full px-3 py-2 bg-white border rounded-lg text-sm font-medium placeholder:text-gray-400 focus:outline-none resize-none transition-all ${isCorrect ? "border-green-300 focus:border-green-500" : "border-gray-300 focus:border-gray-500"}`}
                                  placeholder={
                                    isCorrect
                                      ? "Explain why this answer is correct..."
                                      : "Explain why this answer is incorrect..."
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
                  <p className="text-sm text-red-500 mt-2 flex items-center gap-1">
                    <span className="material-icons-outlined text-sm">
                      warning
                    </span>{" "}
                    Duplicate choices detected
                  </p>
                )}
                <p className="text-xs text-gray-500 mt-2">
                  Click the circle to mark the correct answer
                </p>
              </div>
            )}

            {currentQuestion.type === "true_or_false" && (
              <div>
                <label className="text-sm font-bold text-gray-600 mb-3 block">
                  Correct Answer <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() =>
                      onQuestionChange(currentQuestion.id, "answer", "true")
                    }
                    className={`flex-1 py-4 rounded-xl border-2 font-bold text-lg transition-all ${currentQuestion.answer === "true" ? "bg-green-500 border-green-600 text-white" : "bg-gray-50 border-gray-200 text-gray-700 hover:border-green-500"}`}
                  >
                    <span className="flex items-center justify-center gap-2">
                      <span className="material-icons-outlined">check</span>{" "}
                      True
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onQuestionChange(currentQuestion.id, "answer", "false")
                    }
                    className={`flex-1 py-4 rounded-xl border-2 font-bold text-lg transition-all ${currentQuestion.answer === "false" ? "bg-red-500 border-red-600 text-white" : "bg-gray-50 border-gray-200 text-gray-700 hover:border-red-500"}`}
                  >
                    <span className="flex items-center justify-center gap-2">
                      <span className="material-icons-outlined">close</span>{" "}
                      False
                    </span>
                  </button>
                </div>
                {/* Explanation for True/False */}
                <div className="mt-4">
                  <label className="text-sm font-bold text-gray-600 mb-2 flex items-center gap-2">
                    <span className="material-icons-outlined text-purple-500 text-sm">
                      lightbulb
                    </span>
                    Explanation (Optional)
                  </label>
                  <textarea
                    value={currentQuestion.explanation ?? ""}
                    onChange={(e) =>
                      onExplanationChange(currentQuestion.id, e.target.value)
                    }
                    className="w-full px-4 py-3 bg-purple-50 border-2 border-purple-200 rounded-xl font-medium placeholder:text-gray-400 focus:outline-none focus:border-purple-500 focus:bg-white resize-none transition-all"
                    placeholder="Explain why this statement is true or false..."
                    rows={3}
                  />
                </div>
              </div>
            )}

            {(currentQuestion.type === "identification" ||
              currentQuestion.type === "enumeration" ||
              currentQuestion.type === "essay" ||
              currentQuestion.type === "reflection") && (
              <div>
                <label className="text-sm font-bold text-gray-600 mb-2 block">
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
                  className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl font-medium placeholder:text-gray-400 focus:outline-none focus:border-gray-900 focus:bg-white resize-none transition-all"
                  placeholder={
                    currentQuestion.type === "enumeration"
                      ? "Answer 1, Answer 2, Answer 3..."
                      : currentQuestion.type === "essay" ||
                          currentQuestion.type === "reflection"
                        ? "Enter sample answer or grading rubric..."
                        : "Enter the correct answer..."
                  }
                  rows={
                    currentQuestion.type === "essay" ||
                    currentQuestion.type === "reflection"
                      ? 4
                      : 2
                  }
                />

                {/* Explanation for Identification only (not for essay/reflection/enumeration) */}
                {currentQuestion.type === "identification" && (
                  <div className="mt-4">
                    <label className="text-sm font-bold text-gray-600 mb-2 flex items-center gap-2">
                      <span className="material-icons-outlined text-purple-500 text-sm">
                        lightbulb
                      </span>
                      Explanation (Optional)
                    </label>
                    <textarea
                      value={currentQuestion.explanation ?? ""}
                      onChange={(e) =>
                        onExplanationChange(currentQuestion.id, e.target.value)
                      }
                      className="w-full px-4 py-3 bg-purple-50 border-2 border-purple-200 rounded-xl font-medium placeholder:text-gray-400 focus:outline-none focus:border-purple-500 focus:bg-white resize-none transition-all"
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
