"use client";

import { useState, useRef, useCallback } from "react";

type Difficulty = "easy" | "medium" | "hard";

interface Question {
  question: string;
  type: string;
  choices?: string[];
  answer: string;
}

interface GeneratedQuiz {
  title: string;
  description: string;
  questions: Question[];
}

interface PDFUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (quiz: GeneratedQuiz) => void;
  onEdit: (quiz: GeneratedQuiz) => void;
  idToken: string;
}

const PDFUploadModal = ({
  isOpen,
  onClose,
  onSave,
  onEdit,
  idToken,
}: PDFUploadModalProps) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [file, setFile] = useState<File | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [numQuestions, setNumQuestions] = useState<number>(10);
  const [additionalInstructions, setAdditionalInstructions] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedQuiz, setGeneratedQuiz] = useState<GeneratedQuiz | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileSelect = useCallback((selectedFile: File) => {
    if (selectedFile.type !== "application/pdf" && !selectedFile.name.toLowerCase().endsWith(".pdf")) {
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
      if (droppedFile) {
        handleFileSelect(droppedFile);
      }
    },
    [handleFileSelect]
  );

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0];
      if (selectedFile) {
        handleFileSelect(selectedFile);
      }
    },
    [handleFileSelect]
  );

  const handleNext = () => {
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
      handleGenerate();
    }
  };

  const handleGenerate = async () => {
    if (!file) return;

    setStep(3);
    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("difficulty", difficulty);
      formData.append("numQuestions", numQuestions.toString());
      if (additionalInstructions.trim()) {
        formData.append("additionalInstructions", additionalInstructions.trim());
      }

      const response = await fetch("/api/quizzes/generate", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate quiz");
      }

      setGeneratedQuiz(data.quiz);
      setStep(4);
    } catch (err) {
      console.error("Error generating quiz:", err);
      setError(
        err instanceof Error ? err.message : "Failed to generate quiz. Please try again."
      );
      setStep(2);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    if (generatedQuiz) {
      onSave(generatedQuiz);
      handleClose();
    }
  };

  const handleContinueEditing = () => {
    if (generatedQuiz) {
      onEdit(generatedQuiz);
      handleClose();
    }
  };

  const handleClose = () => {
    setStep(1);
    setFile(null);
    setDifficulty("medium");
    setNumQuestions(10);
    setAdditionalInstructions("");
    setError(null);
    setGeneratedQuiz(null);
    setLoading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    onClose();
  };

  const handleBack = () => {
    if (step > 1 && step < 4) {
      setStep((prev) => (prev - 1) as 1 | 2 | 3 | 4);
      setError(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white border-2 border-black w-full max-w-4xl max-h-[90vh] overflow-y-auto flex flex-col">
        <div className="sticky top-0 bg-white border-b-2 border-black p-6 flex items-center justify-between z-10">
          <h2 className="text-2xl font-light text-black">Generate Quiz from PDF</h2>
          <button
            onClick={handleClose}
            className="text-black hover:text-gray-600 font-light text-xl"
            aria-label="Close modal"
          >
            ×
          </button>
        </div>

        <div className="p-6 flex-1">
          {step === 1 && (
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-4">
                <h3 className="text-xl font-light text-black">Upload PDF</h3>
                <p className="text-base font-light text-gray-600">
                  Upload a PDF file containing educational content to generate quiz questions.
                </p>
              </div>

              <div
                className={`border-2 border-dashed p-12 text-center transition-colors ${
                  isDragging
                    ? "border-black bg-gray-50"
                    : "border-gray-300 bg-white"
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={handleFileInputChange}
                  className="hidden"
                  id="pdf-upload"
                />
                <label
                  htmlFor="pdf-upload"
                  className="cursor-pointer flex flex-col items-center gap-4"
                >
                  <svg
                    className="w-16 h-16 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                  <div className="flex flex-col gap-2">
                    <span className="text-base font-light text-black">
                      {isDragging
                        ? "Drop PDF file here"
                        : "Click to upload or drag and drop"}
                    </span>
                    <span className="text-sm font-light text-gray-500">
                      PDF files only (max 20MB)
                    </span>
                  </div>
                </label>
              </div>

              {file && (
                <div className="p-4 bg-gray-50 border-2 border-gray-300">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <svg
                        className="w-8 h-8 text-red-600"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <div className="flex flex-col">
                        <span className="text-base font-light text-black">{file.name}</span>
                        <span className="text-sm font-light text-gray-600">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setFile(null);
                        if (fileInputRef.current) {
                          fileInputRef.current.value = "";
                        }
                      }}
                      className="text-red-600 hover:text-red-700 font-light"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              )}

              {error && (
                <div className="p-4 bg-red-50 border-2 border-red-600">
                  <p className="text-sm font-light text-red-600">{error}</p>
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-4">
                <h3 className="text-xl font-light text-black">Configuration</h3>
                <p className="text-base font-light text-gray-600">
                  Configure the difficulty level and number of questions for your quiz.
                </p>
              </div>

              <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-4">
                  <label className="text-lg font-light text-black">
                    Difficulty Level
                  </label>
                  <div className="flex flex-col gap-3">
                    {(["easy", "medium", "hard"] as Difficulty[]).map((level) => (
                      <label
                        key={level}
                        className="flex items-center gap-3 p-4 border-2 border-gray-300 cursor-pointer hover:bg-gray-50 transition-colors"
                      >
                        <input
                          type="radio"
                          name="difficulty"
                          value={level}
                          checked={difficulty === level}
                          onChange={(e) =>
                            setDifficulty(e.target.value as Difficulty)
                          }
                          className="w-4 h-4 text-black"
                        />
                        <div className="flex flex-col">
                          <span className="text-base font-light text-black capitalize">
                            {level}
                          </span>
                          <span className="text-sm font-light text-gray-600">
                            {level === "easy" &&
                              "Original descriptions, straightforward questions"}
                            {level === "medium" &&
                              "Rewritten descriptions, requires understanding"}
                            {level === "hard" &&
                              "Completely rewritten, requires deep understanding"}
                          </span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-4">
                  <label htmlFor="numQuestions" className="text-lg font-light text-black">
                    Number of Questions
                  </label>
                  <input
                    id="numQuestions"
                    type="number"
                    min={1}
                    max={50}
                    value={numQuestions}
                    onChange={(e) => {
                      const value = parseInt(e.target.value, 10);
                      if (!isNaN(value) && value >= 1 && value <= 50) {
                        setNumQuestions(value);
                      }
                    }}
                    className="w-full px-4 py-3 border-2 border-black bg-white text-black font-light focus:outline-none focus:ring-2 focus:ring-black"
                  />
                  <p className="text-sm font-light text-gray-600">
                    Enter a number between 1 and 50
                  </p>
                </div>

                <div className="flex flex-col gap-4">
                  <label htmlFor="additionalInstructions" className="text-lg font-light text-black">
                    Additional Instructions (Optional)
                  </label>
                  <textarea
                    id="additionalInstructions"
                    value={additionalInstructions}
                    onChange={(e) => setAdditionalInstructions(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-black bg-white text-black font-light focus:outline-none focus:ring-2 focus:ring-black resize-none"
                    placeholder="e.g., Focus on networking protocols, Include questions about TCP/IP, Emphasize practical applications..."
                    rows={4}
                  />
                  <p className="text-sm font-light text-gray-600">
                    Provide specific instructions or focus areas for the quiz generation
                  </p>
                </div>
              </div>

              {error && (
                <div className="p-4 bg-red-50 border-2 border-red-600">
                  <p className="text-sm font-light text-red-600">{error}</p>
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="flex flex-col items-center justify-center gap-6 py-12">
              <div className="flex flex-col items-center gap-4">
                <svg
                  className="animate-spin h-12 w-12 text-black"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                <p className="text-lg font-light text-black">
                  Processing PDF and generating quiz...
                </p>
                <p className="text-sm font-light text-gray-600">
                  This may take a few moments
                </p>
              </div>
            </div>
          )}

          {step === 4 && generatedQuiz && (
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-4">
                <h3 className="text-xl font-light text-black">Preview Generated Quiz</h3>
                <p className="text-base font-light text-gray-600">
                  Review the generated quiz. You can save it directly or continue editing.
                </p>
              </div>

              <div className="flex flex-col gap-6 border-2 border-gray-300 p-6">
                <div className="flex flex-col gap-2">
                  <h4 className="text-lg font-light text-black">Title</h4>
                  <p className="text-base font-light text-black">{generatedQuiz.title}</p>
                </div>

                {generatedQuiz.description && (
                  <div className="flex flex-col gap-2">
                    <h4 className="text-lg font-light text-black">Description</h4>
                    <p className="text-base font-light text-gray-600">
                      {generatedQuiz.description}
                    </p>
                  </div>
                )}

                <div className="flex flex-col gap-4">
                  <h4 className="text-lg font-light text-black">
                    Questions ({generatedQuiz.questions.length})
                  </h4>
                  <div className="flex flex-col gap-4 max-h-96 overflow-y-auto">
                    {generatedQuiz.questions.map((question, index) => (
                      <div
                        key={index}
                        className="flex flex-col gap-3 p-4 border-2 border-gray-300 bg-white"
                      >
                        <div className="flex items-start gap-3">
                          <span className="text-base font-light text-black min-w-[24px]">
                            {index + 1}.
                          </span>
                          <div className="flex-1 flex flex-col gap-3">
                            <p className="text-base font-light text-black">
                              {question.question}
                            </p>

                            {question.type === "multiple_choice" && question.choices && (
                              <div className="flex flex-wrap gap-2 ml-4">
                                {question.choices.map((choice, choiceIndex) => {
                                  const isCorrectAnswer =
                                    question.answer.trim() === choice.trim();
                                  return (
                                    <div
                                      key={choiceIndex}
                                      className={`px-4 py-2 border-2 font-light ${
                                        isCorrectAnswer
                                          ? "bg-green-100 text-green-800 border-green-600"
                                          : "bg-white text-black border-gray-300"
                                      }`}
                                    >
                                      {choice}
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            {question.type === "true_or_false" && (
                              <div className="flex gap-2 ml-4">
                                <div
                                  className={`px-4 py-2 border-2 font-light ${
                                    question.answer === "true"
                                      ? "bg-green-100 text-green-800 border-green-600"
                                      : "bg-white text-black border-gray-300"
                                  }`}
                                >
                                  True
                                </div>
                                <div
                                  className={`px-4 py-2 border-2 font-light ${
                                    question.answer === "false"
                                      ? "bg-green-100 text-green-800 border-green-600"
                                      : "bg-white text-black border-gray-300"
                                  }`}
                                >
                                  False
                                </div>
                              </div>
                            )}

                            <div className="ml-4 mt-2 p-3 bg-gray-100 border border-gray-300">
                              <p className="text-xs font-light text-gray-600 mb-1">
                                Correct Answer:
                              </p>
                              <p className="text-sm font-light text-black">
                                {question.answer}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {error && (
                <div className="p-4 bg-red-50 border-2 border-red-600">
                  <p className="text-sm font-light text-red-600">{error}</p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="sticky bottom-0 bg-white border-t-2 border-black p-6 flex items-center justify-between gap-4">
          <div className="flex gap-2">
            {step > 1 && step < 4 && (
              <button
                onClick={handleBack}
                disabled={loading}
                className="px-6 py-3 bg-gray-200 text-black font-light hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Back
              </button>
            )}
          </div>

          <div className="flex gap-4">
            {step === 4 && generatedQuiz ? (
              <>
                <button
                  onClick={handleContinueEditing}
                  className="px-6 py-3 bg-gray-200 text-black font-light hover:bg-gray-300 transition-colors"
                >
                  Continue Editing
                </button>
                <button
                  onClick={handleSave}
                  className="px-6 py-3 bg-black text-white font-light hover:bg-gray-800 transition-colors"
                >
                  Save Quiz
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleClose}
                  className="px-6 py-3 bg-gray-200 text-black font-light hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleNext}
                  disabled={loading || (step === 1 && !file)}
                  className="px-6 py-3 bg-black text-white font-light hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  {loading && (
                    <svg
                      className="animate-spin h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                  )}
                  {step === 1 ? "Next" : step === 2 ? "Generate Quiz" : "Processing..."}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PDFUploadModal;
