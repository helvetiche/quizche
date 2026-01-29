/* eslint-disable @typescript-eslint/no-misused-promises */
/* eslint-disable @typescript-eslint/strict-boolean-expressions, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unnecessary-condition, @typescript-eslint/prefer-nullish-coalescing, @typescript-eslint/explicit-function-return-type, @typescript-eslint/no-unused-vars */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import PDFUploadModalFlashcard from "./PDFUploadModalFlashcard";

type GeneratedFlashcardSet = {
  title: string;
  description: string;
  cards: {
    front: string;
    back: string;
  }[];
};

type GenerateFlashcardButtonProps = {
  idToken: string;
  onFlashcardSetGenerated?: (flashcardSet: GeneratedFlashcardSet) => void;
  onSave?: (flashcardSet: GeneratedFlashcardSet) => void | Promise<void>;
  onEdit?: (flashcardSet: GeneratedFlashcardSet) => void;
  className?: string;
  variant?: "primary" | "secondary";
};

const GenerateFlashcardButton = ({
  idToken,
  onFlashcardSetGenerated,
  onSave,
  onEdit,
  className = "",
  variant = "primary",
}: GenerateFlashcardButtonProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  const handleOpenModal = (): void => {
    setIsModalOpen(true);
  };

  const handleCloseModal = (): void => {
    setIsModalOpen(false);
  };

  const handleSave = async (flashcardSet: GeneratedFlashcardSet) => {
    if (onSave !== undefined && onSave !== null) {
      await onSave(flashcardSet);
      handleCloseModal();
    } else if (
      onFlashcardSetGenerated !== undefined &&
      onFlashcardSetGenerated !== null
    ) {
      onFlashcardSetGenerated(flashcardSet);
      handleCloseModal();
    } else {
      setSaving(true);
      try {
        const flashcardData = {
          title: flashcardSet.title.trim(),
          description: flashcardSet.description.trim(),
          isPublic: false,
          cards: flashcardSet.cards.map((card) => ({
            front: card.front.trim(),
            back: card.back.trim(),
          })),
        };

        const { apiPost } = await import("../../lib/api");
        const response = await apiPost("/api/flashcards", {
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(flashcardData),
          idToken,
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to create flashcard set");
        }

        console.error("Flashcard set created successfully");
        router.push("/student?tab=flashcards");
      } catch (error) {
        console.error("Error creating flashcard set:", error);
        console.error(
          error instanceof Error
            ? error.message
            : "Failed to create flashcard set. Please try again."
        );
      } finally {
        setSaving(false);
        handleCloseModal();
      }
    }
  };

  const handleEdit = (flashcardSet: GeneratedFlashcardSet): void => {
    if (onEdit !== undefined && onEdit !== null) {
      onEdit(flashcardSet);
      handleCloseModal();
    } else if (
      onFlashcardSetGenerated !== undefined &&
      onFlashcardSetGenerated !== null
    ) {
      onFlashcardSetGenerated(flashcardSet);
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
        onClick={() => void handleOpenModal()}
        className={`${buttonClasses} ${className}`}
        aria-label="Generate flashcards from PDF"
      >
        Generate Flashcards from PDF
      </button>

      <PDFUploadModalFlashcard
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSave}
        onEdit={handleEdit}
        idToken={idToken}
      />
    </>
  );
};

export default GenerateFlashcardButton;
