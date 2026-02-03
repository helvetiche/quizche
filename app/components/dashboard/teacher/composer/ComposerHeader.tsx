import React from "react";

type ComposerHeaderProps = {
  title: string;
  description: string;
  editMode: boolean;
  draftId?: string;
  lastSavedText: string | null;
  onBack: () => void;
};

export default function ComposerHeader({
  title,
  description,
  editMode,
  draftId,
  lastSavedText,
  onBack,
}: ComposerHeaderProps): React.ReactElement {
  return (
    <header className="flex items-center justify-between px-4 py-3 bg-amber-100 border-b-2 border-gray-900">
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="w-10 h-10 bg-amber-200 text-gray-900 rounded-xl flex items-center justify-center border-2 border-gray-900 hover:bg-amber-300 transition-colors shadow-[2px_2px_0px_0px_rgba(17,24,39,1)]"
        >
          <span className="material-icons-outlined">home</span>
        </button>
        <div>
          <div className="flex items-center gap-2">
            {editMode && (
              <span className="text-xs font-bold px-2 py-0.5 bg-cyan-400 border-2 border-gray-900 rounded-full">
                EDITING
              </span>
            )}
            <h1 className="text-lg font-black text-gray-900">
              {title !== "" ? title : "Untitled Quiz"}
            </h1>
          </div>
          <p className="text-xs text-gray-600 font-medium">
            {description !== "" ? description : "Click settings to add details"}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {editMode && (
          <span className="text-xs text-cyan-700 font-bold px-3 py-1.5 bg-cyan-200 border-2 border-cyan-600 rounded-full flex items-center gap-1">
            <span className="material-icons-outlined text-xs">edit</span>
            Edit Mode
          </span>
        )}
        {draftId !== undefined && editMode === false && (
          <span className="text-xs text-green-700 font-bold px-3 py-1.5 bg-green-200 border-2 border-green-600 rounded-full flex items-center gap-1">
            <span className="material-icons-outlined text-xs">
              check_circle
            </span>
            Draft saved
          </span>
        )}
        <span className="text-xs text-gray-600 font-bold px-3 py-1.5 bg-amber-200 border-2 border-gray-900 rounded-full">
          {lastSavedText ?? "Not saved"}
        </span>
      </div>
    </header>
  );
}
