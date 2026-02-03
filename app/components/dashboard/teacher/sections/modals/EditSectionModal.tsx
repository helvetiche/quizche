import { useState, useEffect } from "react";
import type { ReactElement } from "react";
import { useAnimatedModal } from "../hooks/useAnimatedModal";
import type { Section, Student } from "../types";

type EditSectionModalProps = {
  isOpen: boolean;
  section: Section | null;
  onClose: () => void;
  onSave: (
    sectionId: string,
    name: string,
    description: string,
    studentIds: string[]
  ) => Promise<void>;
  idToken: string | null;
};

export default function EditSectionModal({
  isOpen,
  section,
  onClose,
  onSave,
  idToken,
}: EditSectionModalProps): ReactElement | null {
  const { modalRef, backdropRef, isVisible, handleClose } = useAnimatedModal(
    isOpen,
    onClose
  );
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<Student[]>([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (section !== null && isOpen === true) {
      setName(section.name);
      setDescription(section.description ?? "");
      setStudents(section.students);
      setSearchTerm("");
      setSearchResults([]);
      setError(null);
    }
  }, [section, isOpen]);

  const handleStudentSearch = async (): Promise<void> => {
    if (idToken === null || searchTerm.trim().length === 0) return;
    try {
      setSearching(true);
      setError(null);
      const response = await fetch(
        `/api/teacher/students/search?q=${encodeURIComponent(searchTerm.trim())}`,
        { headers: { Authorization: `Bearer ${idToken}` } }
      );
      const data = (await response.json()) as {
        students?: Student[];
        error?: string;
      };
      if (response.ok === true) {
        const studentsData = data as { students?: Student[] };
        setSearchResults(
          (studentsData.students ?? []).filter(
            (s: Student) =>
              students.find((existing) => existing.id === s.id) === undefined
          )
        );
      } else {
        const errorData = data as { error?: string };
        setError(errorData.error ?? "Failed to search students");
      }
    } catch (err) {
      console.error("Error searching students:", err);
      setError("Failed to search students");
    } finally {
      setSearching(false);
    }
  };

  const handleAddStudent = (student: Student): void => {
    setStudents([...students, student]);
    setSearchResults([]);
    setSearchTerm("");
  };
  const handleRemoveStudent = (studentId: string): void => {
    setStudents(students.filter((s) => s.id !== studentId));
  };

  const handleSave = async (): Promise<void> => {
    if (section === null || name.trim().length === 0) return;
    setSaving(true);
    setError(null);
    try {
      await onSave(
        section.id,
        name.trim(),
        description.trim(),
        students.map((s) => s.id)
      );
      handleClose();
    } catch (err) {
      console.error("Error saving section:", err);
      setError(err instanceof Error ? err.message : "Failed to save section");
    } finally {
      setSaving(false);
    }
  };

  if (!isVisible || !section) return null;

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
        <div className="bg-cyan-400 border-b-4 border-gray-900 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">
              <div className="w-4 h-4 bg-red-500 rounded-full border-2 border-gray-900"></div>
              <div className="w-4 h-4 bg-yellow-500 rounded-full border-2 border-gray-900"></div>
              <div className="w-4 h-4 bg-green-500 rounded-full border-2 border-gray-900"></div>
            </div>
            <h3 className="text-xl font-black text-gray-900 ml-2">
              Edit Section
            </h3>
          </div>
          <button
            onClick={() => void handleClose()}
            className="w-8 h-8 bg-cyan-300 border-2 border-gray-900 rounded-full flex items-center justify-center hover:bg-cyan-200 transition-colors"
          >
            <span className="material-icons-outlined text-gray-900 text-lg">
              close
            </span>
          </button>
        </div>
        <div className="p-6 flex flex-col gap-5 overflow-y-auto">
          {error !== null && (
            <div className="bg-red-400 border-3 border-gray-900 rounded-xl p-3 flex items-center gap-2">
              <span className="material-icons-outlined text-gray-900">
                error
              </span>
              <p className="font-bold text-gray-900 text-sm">{error}</p>
            </div>
          )}
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-black text-gray-900">
                Section Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="px-4 py-3 border-3 border-gray-900 rounded-xl bg-white font-medium placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                placeholder="e.g., Grade 10 - Section A"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-black text-gray-900">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="px-4 py-3 border-3 border-gray-900 rounded-xl bg-white font-medium placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-400 resize-none"
                placeholder="Optional description..."
                rows={2}
              />
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <h4 className="text-sm font-black text-gray-900 flex items-center gap-2">
              <span className="material-icons-outlined text-lg">
                person_add
              </span>
              Manage Students
            </h4>
            <div className="flex gap-2">
              <div className="flex-1 flex items-center bg-white border-3 border-gray-900 rounded-full">
                <span className="material-icons-outlined text-gray-500 text-lg pl-3">
                  search
                </span>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void handleStudentSearch();
                  }}
                  placeholder="Search students to add..."
                  className="flex-1 px-3 py-2 bg-transparent text-gray-900 font-medium placeholder:text-gray-500 focus:outline-none text-sm"
                />
              </div>
              <button
                onClick={() => void handleStudentSearch()}
                disabled={searching}
                className="px-4 py-2 bg-cyan-400 text-gray-900 font-bold text-sm border-3 border-gray-900 rounded-full shadow-[2px_2px_0px_0px_rgba(31,41,55,1)] hover:shadow-[3px_3px_0px_0px_rgba(31,41,55,1)] active:shadow-[1px_1px_0px_0px_rgba(31,41,55,1)] transition-all disabled:opacity-50"
              >
                {searching ? "..." : "Search"}
              </button>
            </div>
            {searchResults.length > 0 && (
              <div className="bg-white border-3 border-gray-900 rounded-xl p-3">
                <p className="text-xs font-bold text-gray-600 mb-2">
                  Search Results
                </p>
                <div className="flex flex-col gap-1.5 max-h-32 overflow-y-auto">
                  {searchResults.map((student) => (
                    <div
                      key={student.id}
                      className="flex items-center justify-between p-2 bg-amber-50 border-2 border-gray-900 rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-lime-400 rounded-full flex items-center justify-center border-2 border-gray-900">
                          <span className="text-xs font-black text-gray-900">
                            {(student.displayName ??
                              student.email)[0].toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 text-xs">
                            {student.displayName ?? student.email}
                          </p>
                          <p className="text-xs text-gray-500">
                            {student.email}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleAddStudent(student)}
                        className="px-2.5 py-1 bg-amber-200 text-gray-900 font-bold text-xs border-2 border-gray-900 rounded-full hover:bg-amber-300 transition-colors"
                      >
                        + Add
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="bg-white border-3 border-gray-900 rounded-xl overflow-hidden">
              <div className="bg-amber-50 px-3 py-2 border-b-2 border-gray-900">
                <p className="text-xs font-bold text-gray-700">
                  Current Students ({students.length})
                </p>
              </div>
              {students.length === 0 ? (
                <div className="p-4 text-center text-gray-500 text-sm">
                  No students added
                </div>
              ) : (
                <div className="max-h-40 overflow-y-auto">
                  {students.map((student, index) => (
                    <div
                      key={student.id}
                      className={`flex items-center justify-between p-2.5 ${index !== students.length - 1 ? "border-b border-gray-200" : ""}`}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-lime-400 rounded-full flex items-center justify-center border-2 border-gray-900">
                          <span className="text-xs font-black text-gray-900">
                            {(student.displayName ??
                              student.email)[0].toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 text-sm">
                            {student.displayName ?? "No name"}
                          </p>
                          <p className="text-xs text-gray-500">
                            {student.email}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveStudent(student.id)}
                        className="w-7 h-7 bg-red-500 rounded-full flex items-center justify-center border-2 border-gray-900 hover:bg-red-600 transition-colors"
                      >
                        <span className="material-icons-outlined text-white text-sm">
                          close
                        </span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="border-t-4 border-gray-900 px-6 py-4 bg-amber-50 flex gap-3 justify-end">
          <button
            onClick={() => void handleClose()}
            className="px-5 py-2.5 bg-amber-200 text-gray-900 font-bold border-3 border-gray-900 rounded-full shadow-[3px_3px_0px_0px_rgba(31,41,55,1)] hover:shadow-[4px_4px_0px_0px_rgba(31,41,55,1)] active:shadow-[1px_1px_0px_0px_rgba(31,41,55,1)] transition-all"
          >
            Cancel
          </button>
          <button
            onClick={() => void handleSave()}
            disabled={saving === true || name.trim().length === 0}
            className="px-5 py-2.5 bg-amber-200 text-gray-900 font-bold border-3 border-gray-900 rounded-full shadow-[3px_3px_0px_0px_rgba(31,41,55,1)] hover:shadow-[4px_4px_0px_0px_rgba(31,41,55,1)] active:shadow-[1px_1px_0px_0px_rgba(31,41,55,1)] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-gray-900 border-t-transparent rounded-full animate-spin"></div>
                <span>Saving...</span>
              </>
            ) : (
              <>
                <span className="material-icons-outlined text-lg">save</span>
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
