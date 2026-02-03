import type { ReactElement } from "react";
import type { Flashcard } from "./types";
import FlashcardEditorItem from "./FlashcardEditorItem";

type FlashcardEditorListProps = {
  cards: Flashcard[];
  loading: boolean;
  onAddCard: () => void;
  onRemoveCard: (index: number) => void;
  onUpdateCard: (index: number, field: "front" | "back", value: string) => void;
  onImageSelect: (index: number, side: "front" | "back", file: File) => void;
  onRemoveImage: (index: number, side: "front" | "back") => void;
};

export default function FlashcardEditorList({
  cards,
  loading,
  onAddCard,
  onRemoveCard,
  onUpdateCard,
  onImageSelect,
  onRemoveImage,
}: FlashcardEditorListProps): ReactElement {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <label className="block text-sm font-medium text-gray-700">
          Flashcards <span className="text-red-500">*</span>
        </label>
        <button
          type="button"
          onClick={onAddCard}
          className="text-sm font-light text-blue-600 hover:text-blue-800"
          disabled={loading}
        >
          + Add Card
        </button>
      </div>

      <div className="flex flex-col gap-4">
        {cards.map((card, index) => (
          <FlashcardEditorItem
            key={index}
            card={card}
            index={index}
            loading={loading}
            onUpdate={onUpdateCard}
            onRemove={onRemoveCard}
            onImageSelect={onImageSelect}
            onRemoveImage={onRemoveImage}
            showRemove={cards.length > 1}
          />
        ))}
      </div>
    </div>
  );
}
