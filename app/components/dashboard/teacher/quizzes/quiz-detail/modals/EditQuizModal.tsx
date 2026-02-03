import type { ReactElement } from "react";
import Modal from "@/components/Modal";
import { useRouter } from "next/navigation";

type EditQuizModalProps = {
  isOpen: boolean;
  onClose: () => void;
  quizId: string;
};

export default function EditQuizModal({
  isOpen,
  onClose,
  quizId,
}: EditQuizModalProps): ReactElement | null {
  const router = useRouter();

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="w-full max-w-md">
      <div className="bg-amber-50 border-2 border-gray-900 rounded-2xl shadow-[8px_8px_0px_0px_rgba(17,24,39,1)] overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b-2 border-gray-900 bg-amber-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-400 rounded-xl flex items-center justify-center border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(17,24,39,1)]">
              <span className="material-icons-outlined text-gray-900">
                edit
              </span>
            </div>
            <h3 className="text-xl font-black text-gray-900">Edit Quiz</h3>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 bg-amber-300 rounded-xl flex items-center justify-center border-2 border-gray-900 hover:bg-amber-400 transition-colors shadow-[2px_2px_0px_0px_rgba(17,24,39,1)]"
          >
            <span className="material-icons-outlined text-gray-900">close</span>
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-12 h-12 bg-amber-200 rounded-xl flex items-center justify-center border-2 border-gray-900 flex-shrink-0">
              <span className="material-icons-outlined text-gray-900 text-2xl">
                warning
              </span>
            </div>
            <div>
              <p className="text-gray-900 font-bold mb-2">
                Are you sure you want to edit this quiz?
              </p>
              <p className="text-gray-600 text-sm">
                Editing this quiz will open it in the composer. Any changes you
                make will affect students who haven&apos;t taken the quiz yet.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-white text-gray-900 font-bold rounded-xl border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(17,24,39,1)] hover:shadow-[3px_3px_0px_0px_rgba(17,24,39,1)] hover:-translate-y-0.5 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                onClose();
                router.push(`/teacher/composer?edit=${quizId}`);
              }}
              className="flex-1 px-4 py-3 bg-amber-400 text-gray-900 font-bold rounded-xl border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(17,24,39,1)] hover:shadow-[3px_3px_0px_0px_rgba(17,24,39,1)] hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
            >
              <span className="material-icons-outlined text-sm">edit</span>
              Edit Quiz
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
