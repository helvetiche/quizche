"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import PDFUploadModalFlashcard from "./PDFUploadModalFlashcard";

interface GeneratedFlashcardSet {
  title: string;
  description: string;
  cards: Array<{
    front: string;
    back: string;
  }>;
}

interface GenerateFlashcardButtonProps {
  idToken: string;
  onFlashcardSetGenerated?: (flashcardSet: GeneratedFlashcardSet) => void;
  onSave?: (flashcardSet: GeneratedFlashcardSet) => void | Promise<void>;
  onEdit?: (flashcardSet: GeneratedFlashcardSet) => void;
  className?: string;
  variant?: "primary" | "secondary";
}

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

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleSave = async (flashcardSet: GeneratedFlashcardSet) => {
    if (onSave) {
      await onSave(flashcardSet);
      handleCloseModal();
    } else if (onFlashcardSetGenerated) {
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

        alert("Flashcard set created successfully!");
        router.push("/student/flashcards");
      } catch (error) {
        console.error("Error creating flashcard set:", error);
        alert(
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

  const handleEdit = (flashcardSet: GeneratedFlashcardSet) => {
    if (onEdit) {
      onEdit(flashcardSet);
      handleCloseModal();
    } else if (onFlashcardSetGenerated) {
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
        onClick={handleOpenModal}
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
