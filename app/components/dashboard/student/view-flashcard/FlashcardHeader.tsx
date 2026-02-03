import React from "react";
import { X } from "lucide-react";

type FlashcardHeaderProps = {
  title: string;
  onClose: () => void;
};

export default function FlashcardHeader({
  title,
  onClose,
}: FlashcardHeaderProps): React.ReactElement {
  return (
    <div className="bg-amber-200 px-6 py-4 flex items-center justify-between border-b-3 border-gray-900">
      <div className="flex gap-2">
        <div className="w-3 h-3 rounded-full bg-red-500 border border-gray-900" />
        <div className="w-3 h-3 rounded-full bg-yellow-500 border border-gray-900" />
        <div className="w-3 h-3 rounded-full bg-green-500 border border-gray-900" />
      </div>
      <div className="text-sm font-bold text-gray-900 uppercase tracking-widest">
        {title}
      </div>
      <button
        onClick={onClose}
        className="p-1 hover:bg-amber-300 rounded-lg transition-colors border border-transparent hover:border-gray-900"
      >
        <X className="w-5 h-5 text-gray-900" />
      </button>
    </div>
  );
}
