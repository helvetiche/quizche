import type { ReactElement } from "react";

type QuizSettingsModalActionsProps = {
  copied: boolean;
  onClose: () => void;
  onShowEditModal: () => void;
  onCopyLink: () => void;
};

export default function QuizSettingsModalActions({
  copied,
  onClose,
  onShowEditModal,
  onCopyLink,
}: QuizSettingsModalActionsProps): ReactElement {
  return (
    <div>
      <h4 className="text-sm font-black text-gray-900 uppercase tracking-wider mb-4">
        Quick Actions
      </h4>
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => {
            onClose();
            onShowEditModal();
          }}
          className="flex items-center gap-2 px-4 py-2 bg-amber-200 text-gray-900 font-bold rounded-xl border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(17,24,39,1)] hover:shadow-[3px_3px_0px_0px_rgba(17,24,39,1)] transition-all"
        >
          <span className="material-icons-outlined text-sm">edit</span>
          Edit Questions
        </button>
        <button
          onClick={onCopyLink}
          className={`flex items-center gap-2 px-4 py-2 font-bold rounded-xl border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(17,24,39,1)] hover:shadow-[3px_3px_0px_0px_rgba(17,24,39,1)] transition-all ${copied ? "bg-amber-400" : "bg-amber-200"}`}
        >
          <span className="material-icons-outlined text-sm">
            {copied ? "check" : "link"}
          </span>
          {copied ? "Copied" : "Copy Link"}
        </button>
      </div>
    </div>
  );
}
