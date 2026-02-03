import type { ReactElement } from "react";
import CoverImageUploader from "./CoverImageUploader";
import FlashcardTagInput from "./FlashcardTagInput";

type FlashcardMakerFormProps = {
  title: string;
  setTitle: (title: string) => void;
  description: string;
  setDescription: (description: string) => void;
  tags: string[];
  tagInput: string;
  setTagInput: (input: string) => void;
  onAddTag: () => void;
  onRemoveTag: (tag: string) => void;
  coverImagePreview: string | null;
  coverImageUrl: string | undefined;
  coverImageFile: File | null;
  setCoverImageFile: (file: File | null) => void;
  setCoverImagePreview: (url: string | null) => void;
  setCoverImageUrl: (url: string | undefined) => void;
  loading: boolean;
};

export default function FlashcardMakerForm({
  title,
  setTitle,
  description,
  setDescription,
  tags,
  tagInput,
  setTagInput,
  onAddTag,
  onRemoveTag,
  coverImagePreview,
  coverImageUrl,
  coverImageFile,
  setCoverImageFile,
  setCoverImagePreview,
  setCoverImageUrl,
  loading,
}: FlashcardMakerFormProps): ReactElement {
  return (
    <div className="flex flex-col gap-6">
      {/* Title */}
      <div>
        <label
          htmlFor="flashcard-title"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Title <span className="text-red-500">*</span>
        </label>
        <input
          id="flashcard-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter flashcard set title"
          className="w-full px-4 py-2 border border-gray-300 text-black font-light focus:outline-none focus:ring-2 focus:ring-black"
          disabled={loading}
        />
      </div>

      {/* Description */}
      <div>
        <label
          htmlFor="flashcard-description"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Description (Optional)
        </label>
        <textarea
          id="flashcard-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Enter a description for your flashcard set"
          rows={3}
          className="w-full px-4 py-2 border border-gray-300 text-black font-light focus:outline-none focus:ring-2 focus:ring-black resize-none"
          disabled={loading}
        />
      </div>

      {/* Cover Image */}
      <CoverImageUploader
        coverImagePreview={coverImagePreview}
        coverImageUrl={coverImageUrl}
        coverImageFile={coverImageFile}
        setCoverImageFile={setCoverImageFile}
        setCoverImagePreview={setCoverImagePreview}
        setCoverImageUrl={setCoverImageUrl}
        loading={loading}
      />

      {/* Tags */}
      <FlashcardTagInput
        tags={tags}
        tagInput={tagInput}
        setTagInput={setTagInput}
        onAddTag={onAddTag}
        onRemoveTag={onRemoveTag}
        loading={loading}
      />
    </div>
  );
}
