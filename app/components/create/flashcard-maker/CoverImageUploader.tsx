import Image from "next/image";
import type { ReactElement } from "react";

type CoverImageUploaderProps = {
  coverImagePreview: string | null;
  coverImageUrl: string | undefined;
  coverImageFile: File | null;
  setCoverImageFile: (file: File | null) => void;
  setCoverImagePreview: (url: string | null) => void;
  setCoverImageUrl: (url: string | undefined) => void;
  loading: boolean;
};

export default function CoverImageUploader({
  coverImagePreview,
  coverImageUrl,
  coverImageFile,
  setCoverImageFile,
  setCoverImagePreview,
  setCoverImageUrl,
  loading,
}: CoverImageUploaderProps): ReactElement {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Cover Image (Optional)
      </label>
      {coverImagePreview || coverImageUrl ? (
        <div className="flex flex-col gap-2">
          <div className="relative w-full max-w-xs h-48 border-2 border-gray-300">
            <Image
              src={(coverImagePreview || coverImageUrl) ?? ""}
              alt="Cover"
              fill
              className="object-cover"
              unoptimized={!!coverImagePreview}
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setCoverImageFile(null);
                setCoverImageUrl(undefined);
                if (
                  coverImagePreview !== undefined &&
                  coverImagePreview !== null
                ) {
                  URL.revokeObjectURL(coverImagePreview);
                  setCoverImagePreview(null);
                }
              }}
              className="px-3 py-1 bg-red-600 text-white text-xs font-light hover:bg-red-700 transition-colors"
              disabled={loading}
            >
              Remove Cover Image
            </button>
            {coverImageFile && !coverImageUrl && (
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
                if (!file.type.startsWith("image/")) {
                  console.error("Please select an image file");
                  return;
                }
                if (file.size > 10 * 1024 * 1024) {
                  console.error("Image size must be less than 10MB");
                  return;
                }
                const previewUrl = URL.createObjectURL(file);
                setCoverImageFile(file);
                setCoverImagePreview(previewUrl);
              }
              e.target.value = "";
            }}
            className="w-full px-3 py-2 text-xs border border-gray-300 text-black font-light focus:outline-none focus:ring-2 focus:ring-black file:mr-2 file:py-1 file:px-2 file:border-0 file:bg-black file:text-white file:text-xs file:font-light file:cursor-pointer hover:file:bg-gray-800"
            disabled={loading}
          />
          <p className="text-xs font-light text-gray-500">
            Cover image will be displayed on your flashcard set card
          </p>
        </div>
      )}
    </div>
  );
}
