"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import PDFUploadModal from "./PDFUploadModal";

interface GeneratedQuiz {
  title: string;
  description: string;
  questions: Array<{
    question: string;
    type: string;
    choices?: string[];
    answer: string;
  }>;
}

interface GenerateQuizButtonProps {
  idToken: string;
  onQuizGenerated?: (quiz: GeneratedQuiz) => void;
  onSave?: (quiz: GeneratedQuiz) => void | Promise<void>;
  onEdit?: (quiz: GeneratedQuiz) => void;
  className?: string;
  variant?: "primary" | "secondary";
}

const GenerateQuizButton = ({
  idToken,
  onQuizGenerated,
  onSave,
  onEdit,
  className = "",
  variant = "primary",
}: GenerateQuizButtonProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleSave = async (quiz: GeneratedQuiz) => {
    if (onSave) {
      await onSave(quiz);
      handleCloseModal();
    } else if (onQuizGenerated) {
      onQuizGenerated(quiz);
      handleCloseModal();
    } else {
      setSaving(true);
      try {
        const quizData = {
          title: quiz.title.trim(),
          description: quiz.description.trim(),
          isActive: true,
          questions: quiz.questions.map((q) => {
            const questionData: any = {
              question: q.question.trim(),
              type: q.type,
              answer: q.answer.trim(),
            };

            if (q.type === "multiple_choice" && q.choices && Array.isArray(q.choices)) {
              const filteredChoices = q.choices
                .filter((c) => c.trim().length > 0)
                .map((c) => c.trim());
              if (filteredChoices.length > 0) {
                questionData.choices = filteredChoices;
              }
            }

            return questionData;
          }),
        };

        const response = await fetch("/api/quizzes", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify(quizData),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to create quiz");
        }

        alert("Quiz created successfully!");
        router.push(`/teacher/quizzes/${data.id}`);
      } catch (error) {
        console.error("Error creating quiz:", error);
        alert(
          error instanceof Error
            ? error.message
            : "Failed to create quiz. Please try again."
        );
      } finally {
        setSaving(false);
        handleCloseModal();
      }
    }
  };

  const handleEdit = (quiz: GeneratedQuiz) => {
    if (onEdit) {
      onEdit(quiz);
      handleCloseModal();
    } else if (onQuizGenerated) {
      onQuizGenerated(quiz);
      handleCloseModal();
    }
  };

  const buttonClasses =
    variant === "primary"
      ? "px-6 py-3 bg-black text-white font-light hover:bg-gray-800 transition-colors"
      : "px-6 py-3 bg-gray-200 text-black font-light hover:bg-gray-300 transition-colors";

  return (
    <>
      <button
        onClick={handleOpenModal}
        className={`${buttonClasses} ${className}`}
        aria-label="Generate quiz from PDF"
      >
        Generate Quiz from PDF
      </button>

      <PDFUploadModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSave}
        onEdit={handleEdit}
        idToken={idToken}
      />
    </>
  );
};

export default GenerateQuizButton;
