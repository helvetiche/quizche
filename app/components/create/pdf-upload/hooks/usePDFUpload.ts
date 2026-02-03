/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/strict-boolean-expressions */
 
import { useState, useCallback } from "react";
import { type GeneratedQuizData } from "../../quiz-form/types";
import type { Difficulty, Step } from "../types";

export function usePDFUpload({
  onClose,
  onSave,
  onEdit,
  idToken,
}: {
  onClose: () => void;
  onSave: (quiz: GeneratedQuizData) => void;
  onEdit: (quiz: GeneratedQuizData) => void;
  idToken: string;
}) {
  const [step, setStep] = useState<Step>(1);
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

  const handleGenerate = async () => {
    if (!file || !idToken) return;

    setLoading(true);
    setError(null);
    setStep(3);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("difficulty", difficulty);
      formData.append("numQuestions", numQuestions.toString());
      if (additionalInstructions) {
        formData.append("instructions", additionalInstructions);
      }

      const response = await fetch("/api/generate/quiz-from-pdf", {
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
      setError(err instanceof Error ? err.message : "Failed to generate quiz");
      setStep(2);
    } finally {
      setLoading(false);
    }
  };

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
      void handleGenerate();
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep((prev) => (prev - 1) as Step);
      setError(null);
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
    onClose();
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

  const handleRemoveFile = () => {
    setFile(null);
  };

  return {
    step,
    file,
    difficulty,
    setDifficulty,
    numQuestions,
    setNumQuestions,
    additionalInstructions,
    setAdditionalInstructions,
    loading,
    error,
    generatedQuiz,
    handleFileSelect,
    handleNext,
    handleBack,
    handleClose,
    handleSave,
    handleContinueEditing,
    handleRemoveFile,
  };
}
