import Image from "next/image";
import type { ReactElement } from "react";
import type { Flashcard } from "./types";

type FlashcardEditorItemProps = {
  card: Flashcard;
  index: number;
  loading: boolean;
  onUpdate: (index: number, field: "front" | "back", value: string) => void;
  onRemove: (index: number) => void;
  onImageSelect: (index: number, side: "front" | "back", file: File) => void;
  onRemoveImage: (index: number, side: "front" | "back") => void;
  showRemove: boolean;
};

export default function FlashcardEditorItem({
  card,
  index,
  loading,
  onUpdate,
  onRemove,
  onImageSelect,
  onRemoveImage,
  showRemove,
}: FlashcardEditorItemProps): ReactElement {
  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-gray-600">
          Card {index + 1}
        </span>
        {showRemove && (
          <button
            type="button"
            onClick={() => onRemove(index)}
            className="text-sm font-light text-red-600 hover:text-red-800"
            disabled={loading}
          >
            Remove
          </button>
        )}
      </div>
      <div className="flex flex-col gap-3">
        <div>
          <label
            htmlFor={`card-front-${index}`}
            className="block text-xs font-medium text-gray-600 mb-1"
          >
            Front
          </label>
          <textarea
            id={`card-front-${index}`}
            value={card.front}
            onChange={(e) => onUpdate(index, "front", e.target.value)}
            placeholder="Enter the front of the card"
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 text-black font-light focus:outline-none focus:ring-2 focus:ring-black resize-none"
            disabled={loading}
          />
          <div className="mt-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Front Image (Optional)
            </label>
            {card.frontImagePreview || card.frontImageUrl ? (
              <div className="flex flex-col gap-2">
                <div className="relative w-full max-w-xs h-48 border-2 border-gray-300">
                  <Image
                    src={card.frontImagePreview || card.frontImageUrl || ""}
                    alt="Front image"
                    fill
                    className="object-contain"
                    unoptimized={!!card.frontImagePreview}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onRemoveImage(index, "front")}
                    className="px-3 py-1 bg-red-600 text-white text-xs font-light hover:bg-red-700 transition-colors"
                    disabled={loading}
                  >
                    Remove Image
                  </button>
                  {card.frontImageFile && !card.frontImageUrl && (
                    <span className="text-xs font-light text-gray-600">
                      (Will be uploaded when saved)
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file !== undefined && file !== null) {
                      onImageSelect(index, "front", file);
                    }
                    e.target.value = "";
                  }}
                  className="w-full px-3 py-2 text-xs border border-gray-300 text-black font-light focus:outline-none focus:ring-2 focus:ring-black file:mr-2 file:py-1 file:px-2 file:border-0 file:bg-black file:text-white file:text-xs file:font-light file:cursor-pointer hover:file:bg-gray-800"
                  disabled={loading}
                />
                <p className="text-xs font-light text-gray-500">
                  Image will be uploaded when you save
                </p>
              </div>
            )}
          </div>
        </div>
        <div>
          <label
            htmlFor={`card-back-${index}`}
            className="block text-xs font-medium text-gray-600 mb-1"
          >
            Back
          </label>
          <textarea
            id={`card-back-${index}`}
            value={card.back}
            onChange={(e) => onUpdate(index, "back", e.target.value)}
            placeholder="Enter the back of the card"
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 text-black font-light focus:outline-none focus:ring-2 focus:ring-black resize-none"
            disabled={loading}
          />
          <div className="mt-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Back Image (Optional)
            </label>
            {card.backImagePreview || card.backImageUrl ? (
              <div className="flex flex-col gap-2">
                <div className="relative w-full max-w-xs h-48 border-2 border-gray-300">
                  <Image
                    src={(card.backImagePreview || card.backImageUrl) ?? ""}
                    alt="Back image"
                    fill
                    className="object-contain"
                    unoptimized={!!card.backImagePreview}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onRemoveImage(index, "back")}
                    className="px-3 py-1 bg-red-600 text-white text-xs font-light hover:bg-red-700 transition-colors"
                    disabled={loading}
                  >
                    Remove Image
                  </button>
                  {card.backImageFile && !card.backImageUrl && (
                    <span className="text-xs font-light text-gray-600">
                      (Will be uploaded when saved)
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file !== undefined && file !== null) {
                      onImageSelect(index, "back", file);
                    }
                    e.target.value = "";
                  }}
                  className="w-full px-3 py-2 text-xs border border-gray-300 text-black font-light focus:outline-none focus:ring-2 focus:ring-black file:mr-2 file:py-1 file:px-2 file:border-0 file:bg-black file:text-white file:text-xs file:font-light file:cursor-pointer hover:file:bg-gray-800"
                  disabled={loading}
                />
                <p className="text-xs font-light text-gray-500">
                  Image will be uploaded when you save
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
