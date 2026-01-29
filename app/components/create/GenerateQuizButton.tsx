"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import PDFUploadModal from "./PDFUploadModal";
import { type GeneratedQuizData } from "./QuizForm";

type GenerateQuizButtonProps = {
  idToken: string;
  onQuizGenerated?: (quiz: GeneratedQuizData) => void;
  onSave?: (quiz: GeneratedQuizData) => void | Promise<void>;
  onEdit?: (quiz: GeneratedQuizData) => void;
  className?: string;
  variant?: "primary" | "secondary";
};

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

  const handleSave = async (quiz: GeneratedQuizData) => {
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

            if (
              q.type === "multiple_choice" &&
              q.choices &&
              Array.isArray(q.choices)
            ) {
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

        const { apiPost } = await import("../../lib/api");
        const response = await apiPost("/api/quizzes", {
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(quizData),
          idToken,
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

  const handleEdit = (quiz: GeneratedQuizData) => {
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
      ? "px-5 py-3 bg-cyan-400 text-gray-900 font-bold border-3 border-gray-900 rounded-full shadow-[4px_4px_0px_0px_rgba(31,41,55,1)] hover:shadow-[5px_5px_0px_0px_rgba(31,41,55,1)] hover:-translate-x-0.5 hover:-translate-y-0.5 active:shadow-[2px_2px_0px_0px_rgba(31,41,55,1)] active:translate-x-0.5 active:translate-y-0.5 transition-all flex items-center gap-2"
      : "px-5 py-3 bg-cyan-400 text-gray-900 font-bold border-3 border-gray-900 rounded-full shadow-[4px_4px_0px_0px_rgba(31,41,55,1)] hover:shadow-[5px_5px_0px_0px_rgba(31,41,55,1)] hover:-translate-x-0.5 hover:-translate-y-0.5 active:shadow-[2px_2px_0px_0px_rgba(31,41,55,1)] active:translate-x-0.5 active:translate-y-0.5 transition-all flex items-center gap-2";

  return (
    <>
      <button
        onClick={handleOpenModal}
        className={`${buttonClasses} ${className}`}
        aria-label="Generate quiz from PDF"
      >
        <span className="material-icons-outlined text-lg">auto_awesome</span>
        <span>Generate from PDF</span>
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
