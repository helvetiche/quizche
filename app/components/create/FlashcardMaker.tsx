/* eslint-disable @typescript-eslint/strict-boolean-expressions, @typescript-eslint/explicit-function-return-type */
"use client";

import ShareFlashcardModal from "../flashcards/ShareFlashcardModal";
import FlashcardMakerForm from "./flashcard-maker/FlashcardMakerForm";
import FlashcardEditorList from "./flashcard-maker/FlashcardEditorList";
import type { GeneratedFlashcardSet } from "./flashcard-maker/types";
import { useFlashcardMaker } from "./flashcard-maker/hooks/useFlashcardMaker";

type FlashcardMakerProps = {
  onSuccess?: () => void;
  initialData?: GeneratedFlashcardSet;
  flashcardId?: string;
  idToken?: string;
};

export default function FlashcardMaker({
  onSuccess,
  initialData,
  flashcardId,
  idToken,
}: FlashcardMakerProps) {
  const {
    title,
    setTitle,
    description,
    setDescription,
    cards,
    tags,
    tagInput,
    setTagInput,
    isPublic,
    setIsPublic,
    loading,
    error,
    coverImageFile,
    setCoverImageFile,
    coverImagePreview,
    setCoverImagePreview,
    coverImageUrl,
    setCoverImageUrl,
    showShareModal,
    setShowShareModal,
    handleAddCard,
    handleRemoveCard,
    handleCardChange,
    handleImageSelect,
    handleRemoveImage,
    handleAddTag,
    handleRemoveTag,
    handleSave,
  } = useFlashcardMaker({
    onSuccess,
    initialData,
    flashcardId,
    idToken,
  });

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      {loading && flashcardId && !title ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          <span className="ml-3 text-gray-600">Loading flashcard set...</span>
        </div>
      ) : (
        <>
          <h3 className="text-2xl font-light text-black mb-4">
            {flashcardId ? "Edit Flashcard Set" : "Create Flashcard Set"}
          </h3>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-600">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-6">
            <FlashcardMakerForm
              title={title}
              setTitle={setTitle}
              description={description}
              setDescription={setDescription}
              tags={tags}
              tagInput={tagInput}
              setTagInput={setTagInput}
              onAddTag={handleAddTag}
              onRemoveTag={handleRemoveTag}
              coverImagePreview={coverImagePreview}
              coverImageUrl={coverImageUrl}
              coverImageFile={coverImageFile}
              setCoverImageFile={setCoverImageFile}
              setCoverImagePreview={setCoverImagePreview}
              setCoverImageUrl={setCoverImageUrl}
              loading={loading}
            />

            <FlashcardEditorList
              cards={cards}
              loading={loading}
              onAddCard={handleAddCard}
              onRemoveCard={handleRemoveCard}
              onUpdateCard={handleCardChange}
              onImageSelect={handleImageSelect}
              onRemoveImage={handleRemoveImage}
            />

            {/* Public Toggle */}
            <div className="flex items-center gap-2">
              <input
                id="flashcard-public"
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="w-4 h-4 border-gray-300 focus:ring-black"
                disabled={loading}
              />
              <label
                htmlFor="flashcard-public"
                className="text-sm font-light text-gray-700"
              >
                Make this flashcard set public (others can view it)
              </label>
            </div>

            {/* Share Section - Only show if flashcardId exists (editing existing flashcard) */}
            {flashcardId && (
              <div className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-light text-black">
                    Share with Connections
                  </span>
                  <span className="text-xs font-light text-gray-600">
                    Share this flashcard set with your connections
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowShareModal(true)}
                  className="px-4 py-2 bg-black text-white font-light hover:bg-gray-800 transition-colors"
                  disabled={loading}
                >
                  Share
                </button>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={loading}
              className="px-6 py-3 bg-black text-white font-light hover:bg-gray-800 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="animate-spin h-5 w-5"
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
                  {flashcardId ? "Updating..." : "Creating..."}
                </span>
              ) : flashcardId ? (
                "Update Flashcard Set"
              ) : (
                "Create Flashcard Set"
              )}
            </button>

            {/* Share Modal */}
            {flashcardId && (
              <ShareFlashcardModal
                flashcardId={flashcardId}
                isOpen={showShareModal}
                onClose={() => setShowShareModal(false)}
                onShareSuccess={() => {
                  // Optionally refresh or show success message
                }}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}
