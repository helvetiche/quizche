import type { ReactElement } from "react";
import { useAnimatedModal } from "../hooks/useAnimatedModal";
import type { Section } from "../types";

type ViewSectionModalProps = {
  isOpen: boolean;
  section: Section | null;
  onClose: () => void;
  onEdit: () => void;
};

export default function ViewSectionModal({
  isOpen,
  section,
  onClose,
  onEdit,
}: ViewSectionModalProps): ReactElement | null {
  const { modalRef, backdropRef, isVisible, handleClose } = useAnimatedModal(
    isOpen,
    onClose
  );
  if (isVisible === false || section === null) return null;

  const formatDate = (dateString: string): string => {
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return "Unknown";
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        ref={backdropRef}
        className="absolute inset-0 bg-black/50"
        onClick={() => void handleClose()}
      />
      <div
        ref={modalRef}
        className="relative bg-amber-100 border-4 border-gray-900 rounded-2xl shadow-[8px_8px_0px_0px_rgba(31,41,55,1)] w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        <div className="bg-amber-200 border-b-4 border-gray-900 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">
              <div className="w-4 h-4 bg-red-500 rounded-full border-2 border-gray-900"></div>
              <div className="w-4 h-4 bg-yellow-500 rounded-full border-2 border-gray-900"></div>
              <div className="w-4 h-4 bg-green-500 rounded-full border-2 border-gray-900"></div>
            </div>
            <h3 className="text-xl font-black text-gray-900 ml-2">
              Section Details
            </h3>
          </div>
          <button
            onClick={() => void handleClose()}
            className="w-8 h-8 bg-amber-100 border-2 border-gray-900 rounded-full flex items-center justify-center hover:bg-amber-300 transition-colors"
          >
            <span className="material-icons-outlined text-gray-900 text-lg">
              close
            </span>
          </button>
        </div>
        <div className="p-6 flex flex-col gap-5 overflow-y-auto">
          <div className="flex flex-col gap-3">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-black text-gray-900">
                  {section.name}
                </h2>
                {section.description !== undefined &&
                  section.description !== "" && (
                    <p className="text-gray-600 font-medium mt-1">
                      {section.description}
                    </p>
                  )}
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-cyan-400 border-2 border-gray-900 rounded-full">
                <span className="material-icons-outlined text-gray-900 text-sm">
                  groups
                </span>
                <span className="font-bold text-gray-900 text-sm">
                  {section.students.length} students
                </span>
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <span className="material-icons-outlined text-base">
                  calendar_today
                </span>
                <span>Created: {formatDate(section.createdAt)}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="material-icons-outlined text-base">
                  update
                </span>
                <span>Updated: {formatDate(section.updatedAt)}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <h4 className="text-sm font-black text-gray-900 flex items-center gap-2">
              <span className="material-icons-outlined text-lg">people</span>
              Students ({section.students.length})
            </h4>
            {section.students.length === 0 ? (
              <div className="bg-amber-50 border-3 border-gray-900 rounded-xl p-6 text-center">
                <span className="material-icons-outlined text-gray-400 text-4xl mb-2">
                  person_off
                </span>
                <p className="text-gray-600 font-medium">
                  No students in this section yet
                </p>
              </div>
            ) : (
              <div className="bg-white border-3 border-gray-900 rounded-xl overflow-hidden">
                <div className="max-h-64 overflow-y-auto">
                  {section.students.map((student, index) => (
                    <div
                      key={student.id}
                      className={`flex items-center gap-3 p-3 ${index !== section.students.length - 1 ? "border-b-2 border-gray-200" : ""}`}
                    >
                      <div className="w-10 h-10 bg-lime-400 rounded-full flex items-center justify-center border-2 border-gray-900">
                        <span className="text-sm font-black text-gray-900">
                          {(student.displayName ??
                            student.email)[0].toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-gray-900">
                          {student.displayName ?? "No name"}
                        </p>
                        <p className="text-sm text-gray-500">{student.email}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="border-t-4 border-gray-900 px-6 py-4 bg-amber-50 flex gap-3 justify-end">
          <button
            onClick={() => void handleClose()}
            className="px-5 py-2.5 bg-amber-200 text-gray-900 font-bold border-3 border-gray-900 rounded-full shadow-[3px_3px_0px_0px_rgba(31,41,55,1)] hover:shadow-[4px_4px_0px_0px_rgba(31,41,55,1)] active:shadow-[1px_1px_0px_0px_rgba(31,41,55,1)] transition-all"
          >
            Close
          </button>
          <button
            onClick={() => void onEdit()}
            className="px-5 py-2.5 bg-amber-200 text-gray-900 font-bold border-3 border-gray-900 rounded-full shadow-[3px_3px_0px_0px_rgba(31,41,55,1)] hover:shadow-[4px_4px_0px_0px_rgba(31,41,55,1)] active:shadow-[1px_1px_0px_0px_rgba(31,41,55,1)] transition-all flex items-center gap-2"
          >
            <span className="material-icons-outlined text-lg">edit</span>
            <span>Edit Section</span>
          </button>
        </div>
      </div>
    </div>
  );
}
