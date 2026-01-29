/* eslint-disable @typescript-eslint/strict-boolean-expressions, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unnecessary-condition, @typescript-eslint/prefer-nullish-coalescing, @typescript-eslint/explicit-function-return-type */
"use client";

import { useState, useRef, useCallback } from "react";
import { type GeneratedQuizData } from "./QuizForm";
import Modal from "@/components/Modal";

type Difficulty = "easy" | "medium" | "hard";

type PDFUploadModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (quiz: GeneratedQuizData) => void;
  onEdit: (quiz: GeneratedQuizData) => void;
  idToken: string;
};

const PDFUploadModal = ({
  isOpen,
  onClose,
  onSave,
  onEdit,
}: PDFUploadModalProps) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [file, setFile] = useState<File | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [numQuestions, setNumQuestions] = useState<number>(10);
  const [additionalInstructions, setAdditionalInstructions] =
    useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedQuiz, setGeneratedQuiz] = useState<GeneratedQuizData | null>(
    null
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileSelect = useCallback((selectedFile: File) => {
    if (
      selectedFile.type !== "application/pdf" &&
      !selectedFile.name.toLowerCase().endsWith(".pdf")
    ) {
      setError("Please select a PDF file");
      return;
    }
    if (selectedFile.size > 20 * 1024 * 1024) {
      setError("File size must be less than 20MB");
      return;
    }
    setFile(selectedFile);
    setError(null);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) handleFileSelect(droppedFile);
    },
    [handleFileSelect]
  );
  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0];
      if (selectedFile) handleFileSelect(selectedFile);
    },
    [handleFileSelect]
  );

  const handleNext = (): void => {
    if (step === 1) {
      if (!file) {
        setError("Please select a PDF file");
        return;
      }
      setStep(2);
      setError(null);
    } else if (step === 2) {
      if (numQuestions < 1 || numQuestions > 50) {
        setError("Number of questions must be between 1 and 50");
        return;
      }
      void handleGenerate();
    }
  };

  const handleGenerate = async (): Promise<void> => {
    if (!file) return;
    setStep(3);
    setLoading(true);
    setError(null);
    try {
      const { auth } = await import("@/lib/firebase");
      const user = auth.currentUser;
      if (!user) {
        throw new Error("Please sign in to generate quizzes");
      }
      const freshToken = await user.getIdToken(true);

      const formData = new FormData();
      formData.append("file", file);
      formData.append("difficulty", difficulty);
      formData.append("numQuestions", numQuestions.toString());
      if (additionalInstructions.trim())
        formData.append(
          "additionalInstructions",
          additionalInstructions.trim()
        );
      const { getCSRFToken } = await import("../../lib/csrf");
      const csrfToken = await getCSRFToken(freshToken);
      const response = await fetch("/api/quizzes/generate", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${freshToken}`,
          ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {}),
        },
        body: formData,
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Failed to generate quiz");
      setGeneratedQuiz(data.quiz);
      setStep(4);
    } catch (err) {
      console.error("Error generating quiz:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to generate quiz. Please try again."
      );
      setStep(2);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = (): void => {
    if (generatedQuiz !== undefined && generatedQuiz !== null) {
      onSave(generatedQuiz);
      handleClose();
    }
  };
  const handleContinueEditing = (): void => {
    if (generatedQuiz !== undefined && generatedQuiz !== null) {
      onEdit(generatedQuiz);
      handleClose();
    }
  };
  const handleClose = (): void => {
    setStep(1);
    setFile(null);
    setDifficulty("medium");
    setNumQuestions(10);
    setAdditionalInstructions("");
    setError(null);
    setGeneratedQuiz(null);
    setLoading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
    onClose();
  };
  const handleBack = (): void => {
    if (step > 1 && step < 4) {
      setStep((prev) => (prev - 1) as 1 | 2 | 3 | 4);
      setError(null);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      className="w-full max-w-3xl max-h-[90vh]"
    >
      <div className="bg-amber-50 border-3 border-gray-900 rounded-2xl shadow-[8px_8px_0px_0px_rgba(17,24,39,1)] w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-amber-200 px-6 py-4 flex items-center justify-between border-b-3 border-gray-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-400 rounded-xl flex items-center justify-center border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(17,24,39,1)]">
              <span className="material-icons text-gray-900">auto_awesome</span>
            </div>
            <div>
              <h2 className="text-xl font-black text-gray-900">
                AI Quiz Generator
              </h2>
              <p className="text-xs text-gray-700 font-medium">
                Step {step} of 4
              </p>
            </div>
          </div>
          <button
            onClick={() => void handleClose()}
            className="w-10 h-10 bg-red-400 rounded-xl flex items-center justify-center border-2 border-gray-900 hover:bg-red-500 transition-colors shadow-[2px_2px_0px_0px_rgba(17,24,39,1)]"
          >
            <span className="material-icons text-gray-900">close</span>
          </button>
        </div>

        {/* Progress Bar */}
        <div className="px-6 py-3 bg-amber-100 border-b-2 border-gray-900">
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4].map((s) => (
              <div key={s} className="flex-1 flex items-center gap-2">
                <div
                  className={`h-2 flex-1 rounded-full border border-gray-900 ${s <= step ? "bg-amber-400" : "bg-white"}`}
                />
                {s < 4 && <span className="text-gray-400 text-xs">→</span>}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-1">
            <span
              className={`text-[10px] font-bold ${step >= 1 ? "text-gray-900" : "text-gray-400"}`}
            >
              Upload
            </span>
            <span
              className={`text-[10px] font-bold ${step >= 2 ? "text-gray-900" : "text-gray-400"}`}
            >
              Configure
            </span>
            <span
              className={`text-[10px] font-bold ${step >= 3 ? "text-gray-900" : "text-gray-400"}`}
            >
              Generate
            </span>
            <span
              className={`text-[10px] font-bold ${step >= 4 ? "text-gray-900" : "text-gray-400"}`}
            >
              Preview
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Step 1: Upload */}
          {step === 1 && (
            <div className="flex flex-col gap-6">
              <div>
                <h3 className="text-lg font-black text-gray-900 mb-2">
                  Upload Your PDF
                </h3>
                <p className="text-sm text-gray-600">
                  Upload educational content like lecture notes, textbooks, or
                  study materials to generate quiz questions automatically.
                </p>
              </div>

              <div
                className={`border-3 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${isDragging ? "border-amber-500 bg-amber-100" : "border-gray-400 bg-white hover:border-gray-900 hover:bg-amber-50"}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={handleFileInputChange}
                  className="hidden"
                />
                <div className="flex flex-col items-center gap-3">
                  <div className="w-16 h-16 bg-amber-200 rounded-2xl flex items-center justify-center border-2 border-gray-900">
                    <span className="material-icons-outlined text-gray-900 text-3xl">
                      cloud_upload
                    </span>
                  </div>
                  <div>
                    <p className="text-gray-900 font-bold">
                      {isDragging
                        ? "Drop your PDF here"
                        : "Click to upload or drag & drop"}
                    </p>
                    <p className="text-gray-500 text-sm mt-1">
                      PDF files only • Max 20MB
                    </p>
                  </div>
                </div>
              </div>

              {file && (
                <div className="bg-white border-2 border-gray-900 rounded-xl p-4 flex items-center justify-between shadow-[2px_2px_0px_0px_rgba(17,24,39,1)]">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center border-2 border-red-300">
                      <span className="material-icons text-red-600">
                        picture_as_pdf
                      </span>
                    </div>
                    <div>
                      <p className="text-gray-900 font-bold text-sm truncate max-w-[200px]">
                        {file.name}
                      </p>
                      <p className="text-gray-500 text-xs">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    className="text-red-500 hover:text-red-700 font-bold text-sm flex items-center gap-1"
                  >
                    <span className="material-icons text-sm">delete</span>{" "}
                    Remove
                  </button>
                </div>
              )}

              {/* Disclaimer */}
              <div className="bg-amber-100 border-2 border-amber-400 rounded-xl p-4">
                <p className="text-gray-900 font-bold text-sm mb-1">
                  Important Notice
                </p>
                <p className="text-gray-700 text-xs leading-relaxed">
                  AI-generated questions should always be reviewed for accuracy
                  before use. Complex diagrams or images within PDFs may not be
                  processed correctly. This tool works best with text-heavy
                  educational content like lecture notes and textbooks. Your PDF
                  is processed securely and is not stored permanently on our
                  servers.
                </p>
              </div>

              {error && (
                <div className="bg-red-100 border-2 border-red-500 rounded-xl p-4 flex items-center gap-3">
                  <span className="material-icons text-red-600">error</span>
                  <p className="text-red-700 font-medium text-sm">{error}</p>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Configure */}
          {step === 2 && (
            <div className="flex flex-col gap-6">
              <div>
                <h3 className="text-lg font-black text-gray-900 mb-2">
                  Configure Your Quiz
                </h3>
                <p className="text-sm text-gray-600">
                  Customize the difficulty and number of questions to match your
                  needs.
                </p>
              </div>

              {/* Difficulty */}
              <div>
                <label className="text-sm font-black text-gray-900 mb-3 block">
                  Difficulty Level
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {(
                    [
                      {
                        value: "easy",
                        label: "Easy",
                        desc: "Straightforward questions",
                        icon: "sentiment_satisfied",
                        color: "bg-green-100 border-green-400",
                      },
                      {
                        value: "medium",
                        label: "Medium",
                        desc: "Requires understanding",
                        icon: "sentiment_neutral",
                        color: "bg-amber-100 border-amber-400",
                      },
                      {
                        value: "hard",
                        label: "Hard",
                        desc: "Deep comprehension",
                        icon: "sentiment_very_dissatisfied",
                        color: "bg-red-100 border-red-400",
                      },
                    ] as const
                  ).map((level) => (
                    <button
                      key={level.value}
                      onClick={() => setDifficulty(level.value)}
                      className={`p-4 rounded-xl border-2 transition-all text-left ${difficulty === level.value ? `${level.color} border-gray-900 shadow-[3px_3px_0px_0px_rgba(17,24,39,1)]` : "bg-white border-gray-300 hover:border-gray-900"}`}
                    >
                      <span className="material-icons text-2xl mb-2">
                        {level.icon}
                      </span>
                      <p className="font-bold text-gray-900">{level.label}</p>
                      <p className="text-xs text-gray-600">{level.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Number of Questions */}
              <div>
                <label className="text-sm font-black text-gray-900 mb-2 block">
                  Number of Questions
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min={1}
                    max={50}
                    value={numQuestions}
                    onChange={(e) => setNumQuestions(parseInt(e.target.value))}
                    className="flex-1 h-2 bg-amber-200 rounded-lg appearance-none cursor-pointer accent-amber-500"
                  />
                  <div className="w-16 h-12 bg-white border-2 border-gray-900 rounded-xl flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(17,24,39,1)]">
                    <span className="text-xl font-black text-gray-900">
                      {numQuestions}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Recommended: 10-20 questions for optimal results
                </p>
              </div>

              {/* Additional Instructions */}
              <div>
                <label className="text-sm font-black text-gray-900 mb-2 block">
                  Additional Instructions{" "}
                  <span className="text-gray-400 font-normal">(Optional)</span>
                </label>
                <textarea
                  value={additionalInstructions}
                  onChange={(e) => setAdditionalInstructions(e.target.value)}
                  className="w-full px-4 py-3 bg-white border-2 border-gray-900 rounded-xl font-medium placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none shadow-[2px_2px_0px_0px_rgba(17,24,39,1)]"
                  placeholder="e.g., Focus on Chapter 3, Include practical examples, Avoid theoretical questions..."
                  rows={3}
                />
                {/* Prompt Presets */}
                <div className="flex flex-wrap gap-2 mt-3">
                  {[
                    {
                      label: "Scenario-based",
                      prompt:
                        "Make the questions scenario-based with practical situations",
                    },
                    {
                      label: "Real-life cases",
                      prompt:
                        "Use real-life cases and examples in the questions",
                    },
                    {
                      label: "Philippine context",
                      prompt:
                        "Use examples and context relevant to the Philippines",
                    },
                    {
                      label: "Critical thinking",
                      prompt:
                        "Focus on critical thinking and analysis questions",
                    },
                    {
                      label: "Application-focused",
                      prompt:
                        "Emphasize application of concepts rather than memorization",
                    },
                    {
                      label: "Case studies",
                      prompt: "Include case study style questions",
                    },
                  ].map((preset) => {
                    const isSelected = additionalInstructions.includes(
                      preset.prompt
                    );
                    return (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => {
                          if (isSelected !== undefined && isSelected !== null) {
                            setAdditionalInstructions(
                              additionalInstructions
                                .replace(preset.prompt, "")
                                .replace(/,\s*,/g, ",")
                                .replace(/^,\s*|,\s*$/g, "")
                                .trim()
                            );
                          } else {
                            setAdditionalInstructions(
                              additionalInstructions
                                ? `${additionalInstructions}, ${preset.prompt}`
                                : preset.prompt
                            );
                          }
                        }}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold border-2 transition-all ${isSelected ? "bg-amber-400 border-gray-900 text-gray-900 shadow-[2px_2px_0px_0px_rgba(17,24,39,1)]" : "bg-white border-gray-300 text-gray-600 hover:border-gray-900 hover:bg-amber-50"}`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tips */}
              <div className="bg-amber-100 border-2 border-amber-400 rounded-xl p-4">
                <p className="text-gray-900 font-bold text-sm mb-1">Pro Tips</p>
                <p className="text-gray-700 text-xs leading-relaxed">
                  Use specific instructions to help the AI focus on particular
                  topics or chapters from your content. Starting with fewer
                  questions allows you to assess quality before generating more.
                  Medium difficulty typically works best for standard classroom
                  assessments and provides a good balance between challenge and
                  accessibility.
                </p>
              </div>

              {error && (
                <div className="bg-red-100 border-2 border-red-500 rounded-xl p-4 flex items-center gap-3">
                  <span className="material-icons text-red-600">error</span>
                  <p className="text-red-700 font-medium text-sm">{error}</p>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Generating */}
          {step === 3 && (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-12 h-12 border-4 border-amber-400 border-t-amber-50 rounded-full animate-spin mb-6" />
              <h3 className="text-xl font-black text-gray-900 mb-2">
                AI is Working Its Magic
              </h3>
              <p className="text-gray-600 text-center max-w-md mb-6">
                Analyzing your PDF and generating high-quality quiz questions.
                This usually takes 30-60 seconds.
              </p>
              <div className="bg-amber-100 border-2 border-amber-300 rounded-xl p-4 max-w-md">
                <p className="text-gray-700 text-xs text-center">
                  Our AI analyzes your document content and context to generate
                  meaningful questions that effectively test comprehension and
                  understanding.
                </p>
              </div>
            </div>
          )}

          {/* Step 4: Preview */}
          {step === 4 &&
            generatedQuiz !== undefined &&
            generatedQuiz !== null && (
              <div className="flex flex-col gap-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-black text-gray-900 mb-1">
                      Quiz Generated Successfully
                    </h3>
                    <p className="text-sm text-gray-600">
                      Review the questions below. You can edit them after
                      importing.
                    </p>
                  </div>
                  <div className="bg-green-100 border-2 border-green-500 rounded-xl px-4 py-2 flex items-center gap-2">
                    <span className="material-icons text-green-600">
                      check_circle
                    </span>
                    <span className="text-green-700 font-bold text-sm">
                      {generatedQuiz.questions.length} Questions
                    </span>
                  </div>
                </div>

                {/* Quiz Info */}
                <div className="bg-white border-2 border-gray-900 rounded-xl p-4 shadow-[2px_2px_0px_0px_rgba(17,24,39,1)]">
                  <h4 className="font-black text-gray-900 text-lg">
                    {generatedQuiz.title}
                  </h4>
                  {generatedQuiz.description && (
                    <p className="text-gray-600 text-sm mt-1">
                      {generatedQuiz.description}
                    </p>
                  )}
                </div>

                {/* Questions Preview */}
                <div className="flex flex-col gap-3 max-h-64 overflow-y-auto pr-2">
                  {generatedQuiz.questions.map((question, index) => (
                    <div
                      key={index}
                      className="bg-white border-2 border-gray-300 rounded-xl p-4 hover:border-gray-900 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-amber-200 rounded-lg flex items-center justify-center border border-gray-900 flex-shrink-0">
                          <span className="text-sm font-black text-gray-900">
                            {index + 1}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-gray-900 font-medium text-sm line-clamp-2">
                            {question.question}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium capitalize">
                              {question.type.replace("_", " ")}
                            </span>
                            <span className="text-xs text-green-600 font-medium">
                              ✓ {question.answer.substring(0, 30)}
                              {question.answer.length > 30 ? "..." : ""}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Disclaimer */}
                <div className="bg-amber-100 border-2 border-amber-400 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <span className="material-icons text-amber-600">
                      warning
                    </span>
                    <div>
                      <p className="text-gray-900 font-bold text-sm mb-1">
                        Review Recommended
                      </p>
                      <p className="text-gray-700 text-xs">
                        AI-generated content may contain inaccuracies. Please
                        review all questions and answers before publishing your
                        quiz.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
        </div>

        {/* Footer */}
        <div className="bg-amber-100 px-6 py-4 border-t-2 border-gray-900 flex items-center justify-between">
          <div>
            {step > 1 && step < 4 && (
              <button
                onClick={() => void handleBack()}
                disabled={loading}
                className="px-5 py-2.5 bg-white text-gray-900 font-bold rounded-xl border-2 border-gray-900 hover:bg-gray-100 disabled:opacity-50 transition-colors flex items-center gap-2 shadow-[2px_2px_0px_0px_rgba(17,24,39,1)]"
              >
                <span className="material-icons text-sm">arrow_back</span> Back
              </button>
            )}
          </div>
          <div className="flex gap-3">
            {step === 4 && generatedQuiz ? (
              <>
                <button
                  onClick={() => void handleContinueEditing()}
                  className="px-5 py-2.5 bg-white text-gray-900 font-bold rounded-xl border-2 border-gray-900 hover:bg-gray-100 transition-colors flex items-center gap-2 shadow-[2px_2px_0px_0px_rgba(17,24,39,1)]"
                >
                  <span className="material-icons text-sm">edit</span> Edit
                  Questions
                </button>
                <button
                  onClick={() => void handleSave()}
                  className="px-5 py-2.5 bg-amber-400 text-gray-900 font-bold rounded-xl border-2 border-gray-900 hover:bg-amber-500 transition-colors flex items-center gap-2 shadow-[3px_3px_0px_0px_rgba(17,24,39,1)]"
                >
                  <span className="material-icons text-sm">save</span> Save &
                  Publish
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => void handleClose()}
                  className="px-5 py-2.5 bg-white text-gray-900 font-bold rounded-xl border-2 border-gray-900 hover:bg-gray-100 transition-colors shadow-[2px_2px_0px_0px_rgba(17,24,39,1)]"
                >
                  Cancel
                </button>
                <button
                  onClick={() => void handleNext()}
                  disabled={loading || (step === 1 && !file)}
                  className="px-5 py-2.5 bg-amber-400 text-gray-900 font-bold rounded-xl border-2 border-gray-900 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 shadow-[3px_3px_0px_0px_rgba(17,24,39,1)]"
                >
                  {step === 1
                    ? "Continue"
                    : step === 2
                      ? "Generate Quiz"
                      : "Processing..."}
                  <span className="material-icons text-sm">arrow_forward</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default PDFUploadModal;
