import type { ReactElement } from "react";
import { useAnimatedModal } from "../hooks/useAnimatedModal";

type DeleteModalProps = {
  isOpen: boolean;
  sectionName: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting: boolean;
};

export default function DeleteConfirmModal({
  isOpen,
  sectionName,
  onConfirm,
  onCancel,
  isDeleting,
}: DeleteModalProps): ReactElement | null {
  const { modalRef, backdropRef, isVisible, handleClose } = useAnimatedModal(
    isOpen,
    onCancel
  );
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        ref={backdropRef}
        className="absolute inset-0 bg-black/50"
        onClick={() => void handleClose()}
      />
      <div
        ref={modalRef}
        className="relative bg-amber-100 border-4 border-gray-900 rounded-2xl shadow-[8px_8px_0px_0px_rgba(31,41,55,1)] p-6 max-w-md w-full"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center border-3 border-gray-900">
            <span className="material-icons-outlined text-white text-2xl">
              delete
            </span>
          </div>
          <h3 className="text-xl font-black text-gray-900">Delete Section?</h3>
        </div>
        <p className="text-gray-700 font-medium mb-6">
          Are you sure you want to delete{" "}
          <span className="font-bold text-gray-900">
            &quot;{sectionName}&quot;
          </span>
          ? This action cannot be undone.
        </p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={() => void handleClose()}
            disabled={isDeleting}
            className="px-5 py-2.5 bg-amber-200 text-gray-900 font-bold border-3 border-gray-900 rounded-full shadow-[3px_3px_0px_0px_rgba(31,41,55,1)] hover:shadow-[4px_4px_0px_0px_rgba(31,41,55,1)] active:shadow-[1px_1px_0px_0px_rgba(31,41,55,1)] transition-all disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={() => void onConfirm()}
            disabled={isDeleting}
            className="px-5 py-2.5 bg-red-500 text-white font-bold border-3 border-gray-900 rounded-full shadow-[3px_3px_0px_0px_rgba(31,41,55,1)] hover:shadow-[4px_4px_0px_0px_rgba(31,41,55,1)] active:shadow-[1px_1px_0px_0px_rgba(31,41,55,1)] transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {isDeleting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Deleting...</span>
              </>
            ) : (
              <>
                <span className="material-icons-outlined text-lg">delete</span>
                <span>Delete</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
