import type { ReactElement } from "react";

type FlashcardTagInputProps = {
  tags: string[];
  tagInput: string;
  setTagInput: (input: string) => void;
  onAddTag: () => void;
  onRemoveTag: (tag: string) => void;
  loading: boolean;
};

export default function FlashcardTagInput({
  tags,
  tagInput,
  setTagInput,
  onAddTag,
  onRemoveTag,
  loading,
}: FlashcardTagInputProps): ReactElement {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Tags (Max 4)
      </label>
      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onAddTag();
              }
            }}
            placeholder="Add a tag (e.g., Biology, Exam 1)"
            className="flex-1 px-4 py-2 border border-gray-300 text-black font-light focus:outline-none focus:ring-2 focus:ring-black"
            disabled={loading || tags.length >= 4}
          />
          <button
            type="button"
            onClick={onAddTag}
            disabled={loading || tags.length >= 4 || !tagInput.trim()}
            className="px-4 py-2 bg-gray-900 text-white font-light hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            Add
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {tags.map((tag, index) => (
            <span
              key={index}
              className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-800 text-sm font-light rounded-full border border-gray-300"
            >
              {tag}
              <button
                type="button"
                onClick={() => onRemoveTag(tag)}
                className="text-gray-500 hover:text-red-600 focus:outline-none"
              >
                <span className="material-icons-outlined text-sm">close</span>
              </button>
            </span>
          ))}
        </div>
        {tags.length >= 4 && (
          <p className="text-xs text-amber-600 font-light">
            Maximum of 4 tags reached.
          </p>
        )}
      </div>
    </div>
  );
}
