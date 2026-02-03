/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { useRef, useState } from "react";

type UploadStepProps = {
  file: File | null;
  onFileSelect: (file: File) => void;
  onRemoveFile: () => void;
  error: string | null;
};

export default function UploadStep({
  file,
  onFileSelect,
  onRemoveFile,
  error,
}: UploadStepProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) onFileSelect(droppedFile);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) onFileSelect(selectedFile);
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRemoveFile();
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h3 className="text-lg font-black text-gray-900 mb-2">
          Upload Your PDF
        </h3>
        <p className="text-sm text-gray-600">
          Upload educational content like lecture notes, textbooks, or study
          materials to generate quiz questions automatically.
        </p>
      </div>

      <div
        className={`border-3 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${
          isDragging
            ? "border-amber-500 bg-amber-100"
            : "border-gray-400 bg-white hover:border-gray-900 hover:bg-amber-50"
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          onChange={handleFileInputChange}
          className="hidden"
        />
        <div className="flex flex-col items-center gap-3">
          <div className="w-16 h-16 bg-amber-200 rounded-2xl flex items-center justify-center border-2 border-gray-900">
            <span className="material-icons-outlined text-gray-900 text-3xl">
              cloud_upload
            </span>
          </div>
          <div>
            <p className="text-gray-900 font-bold">
              {isDragging
                ? "Drop your PDF here"
                : "Click to upload or drag & drop"}
            </p>
            <p className="text-gray-500 text-sm mt-1">
              PDF files only • Max 20MB
            </p>
          </div>
        </div>
      </div>

      {file && (
        <div className="bg-white border-2 border-gray-900 rounded-xl p-4 flex items-center justify-between shadow-[2px_2px_0px_0px_rgba(17,24,39,1)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center border-2 border-red-300">
              <span className="material-icons text-red-600">
                picture_as_pdf
              </span>
            </div>
            <div>
              <p className="text-gray-900 font-bold text-sm truncate max-w-[200px]">
                {file.name}
              </p>
              <p className="text-gray-500 text-xs">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          </div>
          <button
            onClick={handleRemove}
            className="text-red-500 hover:text-red-700 font-bold text-sm flex items-center gap-1"
          >
            <span className="material-icons text-sm">delete</span> Remove
          </button>
        </div>
      )}

      {/* Disclaimer */}
      <div className="bg-amber-100 border-2 border-amber-400 rounded-xl p-4">
        <p className="text-gray-900 font-bold text-sm mb-1">Important Notice</p>
        <p className="text-gray-700 text-xs leading-relaxed">
          AI-generated questions should always be reviewed for accuracy before
          use. Complex diagrams or images within PDFs may not be processed
          correctly. This tool works best with text-heavy educational content
          like lecture notes and textbooks. Your PDF is processed securely and
          is not stored permanently on our servers.
        </p>
      </div>

      {error && (
        <div className="bg-red-100 border-2 border-red-500 rounded-xl p-4 flex items-center gap-3">
          <span className="material-icons text-red-600">error</span>
          <p className="text-red-700 font-medium text-sm">{error}</p>
        </div>
      )}
    </div>
  );
}
