/* eslint-disable @typescript-eslint/strict-boolean-expressions, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unnecessary-condition, @typescript-eslint/prefer-nullish-coalescing, @typescript-eslint/explicit-function-return-type */
"use client";

import { useState, useRef, useCallback } from "react";
import Modal from "@/components/Modal";

type Difficulty = "easy" | "medium" | "hard";

type Flashcard = {
  front: string;
  back: string;
};

type GeneratedFlashcardSet = {
  title: string;
  description: string;
  cards: Flashcard[];
};

type PDFUploadModalFlashcardProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (flashcardSet: GeneratedFlashcardSet) => void;
  onEdit: (flashcardSet: GeneratedFlashcardSet) => void;
  idToken: string;
};

const PDFUploadModalFlashcard = ({
  isOpen,
  onClose,
  onSave,
  onEdit,
  idToken,
}: PDFUploadModalFlashcardProps) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [file, setFile] = useState<File | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [numCards, setNumCards] = useState<number>(10);
  const [additionalInstructions, setAdditionalInstructions] =
    useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedFlashcardSet, setGeneratedFlashcardSet] =
    useState<GeneratedFlashcardSet | null>(null);
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
      if (droppedFile !== undefined && droppedFile !== null) {
        handleFileSelect(droppedFile);
      }
    },
    [handleFileSelect]
  );

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0];
      if (selectedFile !== undefined && selectedFile !== null) {
        handleFileSelect(selectedFile);
      }
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
      if (numCards < 1 || numCards > 500) {
        setError("Number of flashcards must be between 1 and 500");
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
      const formData = new FormData();
      formData.append("file", file);
      formData.append("difficulty", difficulty);
      formData.append("numCards", numCards.toString());
      if (additionalInstructions.trim()) {
        formData.append(
          "additionalInstructions",
          additionalInstructions.trim()
        );
      }

      const { apiPost } = await import("../../lib/api");
      const response = await apiPost("/api/flashcards/generate", {
        headers: {},
        body: formData,
        idToken,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate flashcards");
      }

      setGeneratedFlashcardSet(data.flashcardSet);
      setStep(4);
    } catch (err) {
      console.error("Error generating flashcards:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to generate flashcards. Please try again."
      );
      setStep(2);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = (): void => {
    if (generatedFlashcardSet !== undefined && generatedFlashcardSet !== null) {
      onSave(generatedFlashcardSet);
      handleClose();
    }
  };

  const handleContinueEditing = (): void => {
    if (generatedFlashcardSet !== undefined && generatedFlashcardSet !== null) {
      onEdit(generatedFlashcardSet);
      handleClose();
    }
  };

  const handleClose = (): void => {
    setStep(1);
    setFile(null);
    setDifficulty("medium");
    setNumCards(10);
    setAdditionalInstructions("");
    setError(null);
    setGeneratedFlashcardSet(null);
    setLoading(false);
    if (fileInputRef.current !== undefined && fileInputRef.current !== null) {
      fileInputRef.current.value = "";
    }
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
      className="w-full max-w-4xl max-h-[90vh]"
    >
      <div className="bg-amber-50 border-3 border-gray-900 rounded-2xl shadow-[8px_8px_0px_0px_rgba(17,24,39,1)] w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-amber-200 border-b-3 border-gray-900 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-400 rounded-xl flex items-center justify-center border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(17,24,39,1)]">
              <span className="material-icons text-gray-900">auto_awesome</span>
            </div>
            <h2 className="text-xl font-black text-gray-900">
              Generate Flashcards from PDF
            </h2>
          </div>
          <button
            onClick={() => void handleClose()}
            className="w-10 h-10 bg-red-400 rounded-xl flex items-center justify-center border-2 border-gray-900 hover:bg-red-500 transition-colors shadow-[2px_2px_0px_0px_rgba(17,24,39,1)]"
            aria-label="Close modal"
          >
            <span className="material-icons text-gray-900">close</span>
          </button>
        </div>

        <div className="p-6 flex-1">
          {step === 1 && (
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-4">
                <h3 className="text-xl font-light text-black">Upload PDF</h3>
                <p className="text-base font-light text-gray-600">
                  Upload a PDF file containing educational content to generate
                  flashcards.
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
                  onChange={(e) => void handleFileInputChange(e)}
                  className="hidden"
                  id="pdf-upload-flashcard"
                />
                <label
                  htmlFor="pdf-upload-flashcard"
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
                        <span className="text-base font-light text-black">
                          {file.name}
                        </span>
                        <span className="text-sm font-light text-gray-600">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setFile(null);
                        if (
                          fileInputRef.current !== undefined &&
                          fileInputRef.current !== null
                        ) {
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
                  Configure the difficulty level and number of flashcards to
                  generate.
                </p>
              </div>

              <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-4">
                  <label className="text-lg font-light text-black">
                    Difficulty Level
                  </label>
                  <div className="flex flex-col gap-3">
                    {(["easy", "medium", "hard"] as Difficulty[]).map(
                      (level) => (
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
                                "Original descriptions, straightforward flashcards"}
                              {level === "medium" &&
                                "Rewritten descriptions, requires understanding"}
                              {level === "hard" &&
                                "Completely rewritten, requires deep understanding"}
                            </span>
                          </div>
                        </label>
                      )
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-4">
                  <label
                    htmlFor="numCards"
                    className="text-lg font-light text-black"
                  >
                    Number of Flashcards
                  </label>
                  <input
                    id="numCards"
                    type="number"
                    min={1}
                    max={500}
                    value={numCards}
                    onChange={(e) => {
                      const value = parseInt(e.target.value, 10);
                      if (!isNaN(value) && value >= 1 && value <= 500) {
                        setNumCards(value);
                      }
                    }}
                    className="w-full px-4 py-3 border-2 border-black bg-white text-black font-light focus:outline-none focus:ring-2 focus:ring-black"
                  />
                  <p className="text-sm font-light text-gray-600">
                    Enter a number between 1 and 500
                  </p>
                </div>

                <div className="flex flex-col gap-4">
                  <label
                    htmlFor="additionalInstructions"
                    className="text-lg font-light text-black"
                  >
                    Additional Instructions (Optional)
                  </label>
                  <textarea
                    id="additionalInstructions"
                    value={additionalInstructions}
                    onChange={(e) => setAdditionalInstructions(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-black bg-white text-black font-light focus:outline-none focus:ring-2 focus:ring-black resize-none"
                    placeholder="e.g., Focus on key terms, Include definitions, Emphasize practical applications..."
                    rows={4}
                  />
                  <p className="text-sm font-light text-gray-600">
                    Provide specific instructions or focus areas for the
                    flashcard generation
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
                  Processing PDF and generating flashcards...
                </p>
                <p className="text-sm font-light text-gray-600">
                  This may take a few moments
                </p>
              </div>
            </div>
          )}

          {step === 4 &&
            generatedFlashcardSet !== undefined &&
            generatedFlashcardSet !== null && (
              <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-4">
                  <h3 className="text-xl font-light text-black">
                    Preview Generated Flashcards
                  </h3>
                  <p className="text-base font-light text-gray-600">
                    Review the generated flashcards. You can save them directly
                    or continue editing.
                  </p>
                </div>

                <div className="flex flex-col gap-6 border-2 border-gray-300 p-6">
                  <div className="flex flex-col gap-2">
                    <h4 className="text-lg font-light text-black">Title</h4>
                    <p className="text-base font-light text-black">
                      {generatedFlashcardSet.title}
                    </p>
                  </div>

                  {generatedFlashcardSet.description && (
                    <div className="flex flex-col gap-2">
                      <h4 className="text-lg font-light text-black">
                        Description
                      </h4>
                      <p className="text-base font-light text-gray-600">
                        {generatedFlashcardSet.description}
                      </p>
                    </div>
                  )}

                  <div className="flex flex-col gap-4">
                    <h4 className="text-lg font-light text-black">
                      Flashcards ({generatedFlashcardSet.cards.length})
                    </h4>
                    <div className="flex flex-col gap-4 max-h-96 overflow-y-auto">
                      {generatedFlashcardSet.cards.map((card, index) => (
                        <div
                          key={index}
                          className="flex flex-col gap-3 p-4 border-2 border-gray-300 bg-white"
                        >
                          <div className="flex items-start gap-3">
                            <span className="text-base font-light text-black min-w-[24px]">
                              {index + 1}.
                            </span>
                            <div className="flex-1 flex flex-col gap-3">
                              <div className="flex flex-col gap-2">
                                <p className="text-xs font-light text-gray-600">
                                  Front
                                </p>
                                <p className="text-base font-light text-black">
                                  {card.front}
                                </p>
                              </div>
                              <div className="flex flex-col gap-2">
                                <p className="text-xs font-light text-gray-600">
                                  Back
                                </p>
                                <p className="text-base font-light text-gray-700">
                                  {card.back}
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

        <div className="bg-amber-100 border-t-3 border-gray-900 px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex gap-2">
            {step > 1 && step < 4 && (
              <button
                onClick={() => void handleBack()}
                disabled={loading}
                className="px-5 py-2.5 bg-white text-gray-900 font-bold rounded-xl border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(17,24,39,1)] hover:shadow-[3px_3px_0px_0px_rgba(17,24,39,1)] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
              >
                <span className="material-icons text-sm">arrow_back</span> Back
              </button>
            )}
          </div>

          <div className="flex gap-3">
            {step === 4 && generatedFlashcardSet ? (
              <>
                <button
                  onClick={() => void handleContinueEditing()}
                  className="px-5 py-2.5 bg-white text-gray-900 font-bold rounded-xl border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(17,24,39,1)] hover:shadow-[3px_3px_0px_0px_rgba(17,24,39,1)] transition-all flex items-center gap-2"
                >
                  <span className="material-icons text-sm">edit</span> Edit
                </button>
                <button
                  onClick={() => void handleSave()}
                  className="px-5 py-2.5 bg-amber-400 text-gray-900 font-bold rounded-xl border-2 border-gray-900 shadow-[3px_3px_0px_0px_rgba(17,24,39,1)] hover:shadow-[4px_4px_0px_0px_rgba(17,24,39,1)] transition-all flex items-center gap-2"
                >
                  <span className="material-icons text-sm">save</span> Save
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => void handleClose()}
                  className="px-5 py-2.5 bg-white text-gray-900 font-bold rounded-xl border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(17,24,39,1)] hover:shadow-[3px_3px_0px_0px_rgba(17,24,39,1)] transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => void handleNext()}
                  disabled={loading || (step === 1 && !file)}
                  className="px-5 py-2.5 bg-amber-400 text-gray-900 font-bold rounded-xl border-2 border-gray-900 shadow-[3px_3px_0px_0px_rgba(17,24,39,1)] hover:shadow-[4px_4px_0px_0px_rgba(17,24,39,1)] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                >
                  {loading && (
                    <div className="w-4 h-4 border-2 border-gray-900 border-t-transparent rounded-full animate-spin"></div>
                  )}
                  {step === 1
                    ? "Continue"
                    : step === 2
                      ? "Generate"
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

export default PDFUploadModalFlashcard;
