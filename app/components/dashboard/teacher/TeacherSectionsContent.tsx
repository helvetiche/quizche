"use client";

import { useState, useEffect, useRef } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { gsap } from "gsap";
import TiltedCard from "@/components/TiltedCard";
import Masonry, { type MasonryItem } from "@/components/Masonry";

type Student = {
  id: string;
  email: string;
  displayName?: string;
  role: string;
};

type Section = {
  id: string;
  name: string;
  description?: string;
  teacherId: string;
  students: Student[];
  createdAt: string;
  updatedAt: string;
};

// Reusable animated modal hook
function useAnimatedModal(
  isOpen: boolean,
  onClose: () => void
): {
  modalRef: React.RefObject<HTMLDivElement>;
  backdropRef: React.RefObject<HTMLDivElement>;
  isVisible: boolean;
  handleClose: () => void;
} {
  const modalRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const prevIsOpen = useRef(isOpen);

  // Handle opening
  useEffect(() => {
    if (isOpen === true && isVisible === false && isClosing === false) {
      // Use requestAnimationFrame to avoid synchronous setState in effect
      requestAnimationFrame(() => {
        setIsVisible(true);
      });
    }
  }, [isOpen, isVisible, isClosing]);

  // Handle external close (when parent sets isOpen to false) - run exit animation
  useEffect(() => {
    // Detect when isOpen changes from true to false (external close)
    if (
      prevIsOpen.current === true &&
      isOpen === false &&
      isVisible === true &&
      isClosing === false
    ) {
      // Use requestAnimationFrame to avoid synchronous setState in effect
      requestAnimationFrame(() => {
        setIsClosing(true);
        if (modalRef.current !== null && backdropRef.current !== null) {
          gsap.to(modalRef.current, {
            opacity: 0,
            y: 50,
            scale: 0.95,
            filter: "blur(8px)",
            duration: 0.3,
            ease: "power2.in",
          });
          gsap.to(backdropRef.current, {
            opacity: 0,
            duration: 0.3,
            ease: "power2.in",
            onComplete: () => {
              setIsVisible(false);
              setIsClosing(false);
            },
          });
        } else {
          setIsVisible(false);
          setIsClosing(false);
        }
      });
    }
    prevIsOpen.current = isOpen;
  }, [isOpen, isVisible, isClosing]);

  // Run entrance animation
  useEffect(() => {
    if (isVisible && !isClosing && modalRef.current && backdropRef.current) {
      gsap.fromTo(
        backdropRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.3, ease: "power2.out" }
      );
      gsap.fromTo(
        modalRef.current,
        { opacity: 0, y: 100, scale: 0.9, filter: "blur(10px)" },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          filter: "blur(0px)",
          duration: 0.5,
          ease: "power3.out",
          delay: 0.1,
        }
      );
    }
  }, [isVisible, isClosing]);

  const handleClose = (): void => {
    if (isClosing === true) return;
    setIsClosing(true);
    if (modalRef.current !== null && backdropRef.current !== null) {
      gsap.to(modalRef.current, {
        opacity: 0,
        y: 50,
        scale: 0.95,
        filter: "blur(8px)",
        duration: 0.3,
        ease: "power2.in",
      });
      gsap.to(backdropRef.current, {
        opacity: 0,
        duration: 0.3,
        ease: "power2.in",
        onComplete: () => {
          setIsVisible(false);
          setIsClosing(false);
          onClose();
        },
      });
    } else {
      setIsVisible(false);
      setIsClosing(false);
      onClose();
    }
  };

  return { modalRef, backdropRef, isVisible, handleClose };
}

type DeleteModalProps = {
  isOpen: boolean;
  sectionName: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting: boolean;
};

function DeleteConfirmModal({
  isOpen,
  sectionName,
  onConfirm,
  onCancel,
  isDeleting,
}: DeleteModalProps): JSX.Element {
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
        onClick={handleClose}
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
            onClick={handleClose}
            disabled={isDeleting}
            className="px-5 py-2.5 bg-amber-200 text-gray-900 font-bold border-3 border-gray-900 rounded-full shadow-[3px_3px_0px_0px_rgba(31,41,55,1)] hover:shadow-[4px_4px_0px_0px_rgba(31,41,55,1)] active:shadow-[1px_1px_0px_0px_rgba(31,41,55,1)] transition-all disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
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

// View Section Modal
type ViewSectionModalProps = {
  isOpen: boolean;
  section: Section | null;
  onClose: () => void;
  onEdit: () => void;
};

function ViewSectionModal({
  isOpen,
  section,
  onClose,
  onEdit,
}: ViewSectionModalProps): JSX.Element | null {
  const { modalRef, backdropRef, isVisible, handleClose } = useAnimatedModal(
    isOpen,
    onClose
  );
  if (isVisible === false || section === null || section === undefined)
    return null;

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
        onClick={handleClose}
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
            onClick={handleClose}
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
                  section.description !== null &&
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
                            student.email)[0]?.toUpperCase() ?? ""}
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
            onClick={handleClose}
            className="px-5 py-2.5 bg-amber-200 text-gray-900 font-bold border-3 border-gray-900 rounded-full shadow-[3px_3px_0px_0px_rgba(31,41,55,1)] hover:shadow-[4px_4px_0px_0px_rgba(31,41,55,1)] active:shadow-[1px_1px_0px_0px_rgba(31,41,55,1)] transition-all"
          >
            Close
          </button>
          <button
            onClick={onEdit}
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

// Edit Section Modal
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

function EditSectionModal({
  isOpen,
  section,
  onClose,
  onSave,
  idToken,
}: EditSectionModalProps): JSX.Element {
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
    if (section !== null && section !== undefined && isOpen === true) {
      setName(section.name);
      setDescription(section.description ?? "");
      setStudents(section.students);
      setSearchTerm("");
      setSearchResults([]);
      setError(null);
    }
  }, [section, isOpen]);

  const handleStudentSearch = async (): Promise<void> => {
    if (
      idToken === null ||
      idToken === undefined ||
      searchTerm.trim().length === 0
    )
      return;
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
        const studentsData = data as { students: Student[] };
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
    if (section === null || section === undefined || name.trim().length === 0)
      return;
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
        onClick={handleClose}
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
            onClick={handleClose}
            className="w-8 h-8 bg-cyan-300 border-2 border-gray-900 rounded-full flex items-center justify-center hover:bg-cyan-200 transition-colors"
          >
            <span className="material-icons-outlined text-gray-900 text-lg">
              close
            </span>
          </button>
        </div>
        <div className="p-6 flex flex-col gap-5 overflow-y-auto">
          {error && (
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
                  onKeyDown={(e) => e.key === "Enter" && handleStudentSearch()}
                  placeholder="Search students to add..."
                  className="flex-1 px-3 py-2 bg-transparent text-gray-900 font-medium placeholder:text-gray-500 focus:outline-none text-sm"
                />
              </div>
              <button
                onClick={handleStudentSearch}
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
                              student.email)[0]?.toUpperCase() ?? ""}
                          </span>
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 text-xs">
                            {student.displayName || student.email}
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
                              student.email)[0]?.toUpperCase() ?? ""}
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
            onClick={handleClose}
            className="px-5 py-2.5 bg-amber-200 text-gray-900 font-bold border-3 border-gray-900 rounded-full shadow-[3px_3px_0px_0px_rgba(31,41,55,1)] hover:shadow-[4px_4px_0px_0px_rgba(31,41,55,1)] active:shadow-[1px_1px_0px_0px_rgba(31,41,55,1)] transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
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

type CreateSectionModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onCreateSection: (e: React.FormEvent) => void;
  sectionName: string;
  setSectionName: (name: string) => void;
  sectionDescription: string;
  setSectionDescription: (desc: string) => void;
  studentSearchTerm: string;
  setStudentSearchTerm: (term: string) => void;
  searchResults: Student[];
  selectedStudents: Student[];
  searching: boolean;
  creating: boolean;
  onStudentSearch: (e?: React.FormEvent | React.MouseEvent) => void;
  onAddStudent: (student: Student) => void;
  onRemoveStudent: (studentId: string) => void;
};

function CreateSectionModal({
  isOpen,
  onClose,
  onCreateSection,
  sectionName,
  setSectionName,
  sectionDescription,
  setSectionDescription,
  studentSearchTerm,
  setStudentSearchTerm,
  searchResults,
  selectedStudents,
  searching,
  creating,
  onStudentSearch,
  onAddStudent,
  onRemoveStudent,
}: CreateSectionModalProps): JSX.Element | null {
  const modalRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  // Handle open animation
  useEffect(() => {
    if (isOpen === true && isVisible === false) {
      requestAnimationFrame(() => {
        setIsVisible(true);
        setIsClosing(false);
      });
    }
  }, [isOpen, isVisible]);

  // Run entrance animation when visible
  useEffect(() => {
    if (
      isVisible === true &&
      isClosing === false &&
      modalRef.current !== null &&
      backdropRef.current !== null
    ) {
      // Animate backdrop
      gsap.fromTo(
        backdropRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.3, ease: "power2.out" }
      );

      // Animate modal with masonry-like effect
      gsap.fromTo(
        modalRef.current,
        {
          opacity: 0,
          y: 100,
          scale: 0.9,
          filter: "blur(10px)",
        },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          filter: "blur(0px)",
          duration: 0.5,
          ease: "power3.out",
          delay: 0.1,
        }
      );
    }
  }, [isVisible, isClosing]);

  // Handle close with animation
  const handleClose = (): void => {
    if (isClosing === true) return;
    setIsClosing(true);

    if (modalRef.current !== null && backdropRef.current !== null) {
      // Animate modal out
      gsap.to(modalRef.current, {
        opacity: 0,
        y: 50,
        scale: 0.95,
        filter: "blur(8px)",
        duration: 0.3,
        ease: "power2.in",
      });

      // Animate backdrop out
      gsap.to(backdropRef.current, {
        opacity: 0,
        duration: 0.3,
        ease: "power2.in",
        onComplete: () => {
          setIsVisible(false);
          setIsClosing(false);
          onClose();
        },
      });
    } else {
      setIsVisible(false);
      setIsClosing(false);
      onClose();
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        ref={backdropRef}
        className="absolute inset-0 bg-black/50"
        onClick={handleClose}
      />
      <div
        ref={modalRef}
        className="relative bg-amber-100 border-4 border-gray-900 rounded-2xl shadow-[8px_8px_0px_0px_rgba(31,41,55,1)] w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Modal Header */}
        <div className="bg-amber-200 border-b-4 border-gray-900 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">
              <div className="w-4 h-4 bg-red-500 rounded-full border-2 border-gray-900"></div>
              <div className="w-4 h-4 bg-yellow-500 rounded-full border-2 border-gray-900"></div>
              <div className="w-4 h-4 bg-green-500 rounded-full border-2 border-gray-900"></div>
            </div>
            <h3 className="text-xl font-black text-gray-900 ml-2">
              Create New Section
            </h3>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 bg-amber-100 border-2 border-gray-900 rounded-full flex items-center justify-center hover:bg-amber-300 transition-colors"
          >
            <span className="material-icons-outlined text-gray-900 text-lg">
              close
            </span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 flex flex-col gap-5 overflow-y-auto">
          {/* Section Details */}
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-black text-gray-900">
                Section Name *
              </label>
              <input
                type="text"
                value={sectionName}
                onChange={(e) => setSectionName(e.target.value)}
                className="px-4 py-3 border-3 border-gray-900 rounded-xl bg-white font-medium placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-400"
                placeholder="e.g., Grade 10 - Section A"
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-black text-gray-900">
                Description
              </label>
              <textarea
                value={sectionDescription}
                onChange={(e) => setSectionDescription(e.target.value)}
                className="px-4 py-3 border-3 border-gray-900 rounded-xl bg-white font-medium placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
                placeholder="Optional description for this section..."
                rows={2}
              />
            </div>
          </div>

          {/* Student Search */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className="material-icons-outlined text-gray-900 text-lg">
                person_search
              </span>
              <h4 className="text-sm font-black text-gray-900">
                Add Students (Optional)
              </h4>
            </div>

            <div className="flex gap-2">
              <div className="flex-1 flex items-center bg-white border-3 border-gray-900 rounded-full">
                <span className="material-icons-outlined text-gray-500 text-lg pl-3">
                  search
                </span>
                <input
                  type="text"
                  value={studentSearchTerm}
                  onChange={(e) => setStudentSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && onStudentSearch(e)}
                  placeholder="Search by email or name..."
                  className="flex-1 px-3 py-2 bg-transparent text-gray-900 font-medium placeholder:text-gray-500 focus:outline-none text-sm"
                />
              </div>
              <button
                type="button"
                onClick={onStudentSearch}
                disabled={searching}
                className="px-4 py-2 bg-cyan-400 text-gray-900 font-bold text-sm border-3 border-gray-900 rounded-full shadow-[2px_2px_0px_0px_rgba(31,41,55,1)] hover:shadow-[3px_3px_0px_0px_rgba(31,41,55,1)] active:shadow-[1px_1px_0px_0px_rgba(31,41,55,1)] transition-all disabled:opacity-50"
              >
                {searching ? "..." : "Search"}
              </button>
            </div>

            {/* Search Results */}
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
                              student.email)[0]?.toUpperCase() ?? ""}
                          </span>
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 text-xs">
                            {student.displayName || student.email}
                          </p>
                          <p className="text-xs text-gray-500">
                            {student.email}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onAddStudent(student)}
                        className="px-2.5 py-1 bg-amber-200 text-gray-900 font-bold text-xs border-2 border-gray-900 rounded-full hover:bg-amber-300 transition-colors"
                      >
                        + Add
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Selected Students */}
            {selectedStudents.length > 0 && (
              <div className="bg-lime-100 border-3 border-gray-900 rounded-xl p-3">
                <p className="text-xs font-bold text-gray-600 mb-2">
                  Selected ({selectedStudents.length})
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {selectedStudents.map((student) => (
                    <div
                      key={student.id}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white border-2 border-gray-900 rounded-full"
                    >
                      <span className="font-bold text-gray-900 text-xs">
                        {student.displayName ?? student.email.split("@")[0]}
                      </span>
                      <button
                        type="button"
                        onClick={() => onRemoveStudent(student.id)}
                        className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center border border-gray-900 hover:bg-red-600 transition-colors"
                      >
                        <span className="text-white text-xs font-bold leading-none">
                          ×
                        </span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="border-t-4 border-gray-900 px-6 py-4 bg-amber-50 flex gap-3 justify-end">
          <button
            type="button"
            onClick={handleClose}
            className="px-5 py-2.5 bg-amber-200 text-gray-900 font-bold border-3 border-gray-900 rounded-full shadow-[3px_3px_0px_0px_rgba(31,41,55,1)] hover:shadow-[4px_4px_0px_0px_rgba(31,41,55,1)] active:shadow-[1px_1px_0px_0px_rgba(31,41,55,1)] transition-all"
          >
            Cancel
          </button>
          <button
            onClick={onCreateSection}
            disabled={creating === true || sectionName.trim().length === 0}
            className="px-5 py-2.5 bg-amber-200 text-gray-900 font-bold border-3 border-gray-900 rounded-full shadow-[3px_3px_0px_0px_rgba(31,41,55,1)] hover:shadow-[4px_4px_0px_0px_rgba(31,41,55,1)] active:shadow-[1px_1px_0px_0px_rgba(31,41,55,1)] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {creating ? (
              <>
                <div className="w-4 h-4 border-2 border-gray-900 border-t-transparent rounded-full animate-spin"></div>
                <span>Creating...</span>
              </>
            ) : (
              <>
                <span className="material-icons-outlined text-lg">add</span>
                <span>Create Section</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TeacherSectionsContent(): JSX.Element {
  const [idToken, setIdToken] = useState<string | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [sectionName, setSectionName] = useState("");
  const [sectionDescription, setSectionDescription] = useState("");
  const [studentSearchTerm, setStudentSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<Student[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<Student[]>([]);
  const [searching, setSearching] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    sectionId: string;
    sectionName: string;
  }>({
    isOpen: false,
    sectionId: "",
    sectionName: "",
  });
  const [isDeleting, setIsDeleting] = useState(false);
  const [viewModal, setViewModal] = useState<{
    isOpen: boolean;
    section: Section | null;
  }>({ isOpen: false, section: null });
  const [editModal, setEditModal] = useState<{
    isOpen: boolean;
    section: Section | null;
  }>({ isOpen: false, section: null });
  const itemsPerPage = 6;

  const filters = [
    { id: "all", label: "All", icon: "apps" },
    { id: "large", label: "Large", icon: "groups" },
    { id: "small", label: "Small", icon: "person" },
    { id: "recent", label: "Recent", icon: "schedule" },
  ];

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser !== null && currentUser !== undefined) {
        void currentUser
          .getIdToken()
          .then((token) => {
            setIdToken(token);
          })
          .catch((error) => {
            console.error("Error getting token:", error);
          });
      } else {
        setIdToken(null);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchSections = async (): Promise<void> => {
      if (idToken === null || idToken === undefined) return;

      try {
        setLoading(true);
        setError(null);

        const response = await fetch("/api/teacher/sections", {
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        });

        const data = (await response.json()) as {
          error?: string;
          sections?: Section[];
        };

        if (response.ok === false) {
          const errorData = data as { error?: string };
          throw new Error(errorData.error ?? "Failed to fetch sections");
        }

        const sectionsData = data as { sections: Section[] };
        setSections(sectionsData.sections ?? []);
      } catch (err) {
        console.error("Error fetching sections:", err);
        setError(
          err instanceof Error ? err.message : "Failed to load sections"
        );
      } finally {
        setLoading(false);
      }
    };

    void fetchSections();
  }, [idToken]);

  // Filter sections based on search and filter
  const filteredSections = sections.filter((section) => {
    const matchesSearch =
      section.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (section.description !== undefined && section.description !== null
        ? section.description.toLowerCase()
        : ""
      ).includes(searchQuery.toLowerCase());

    if (activeFilter === "all") return matchesSearch;
    if (activeFilter === "large")
      return matchesSearch && section.students.length >= 10;
    if (activeFilter === "small")
      return matchesSearch && section.students.length < 10;
    if (activeFilter === "recent") {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      return matchesSearch && new Date(section.createdAt) > oneWeekAgo;
    }
    return matchesSearch;
  });

  // Pagination
  const totalPages = Math.ceil(filteredSections.length / itemsPerPage);
  const paginatedSections = filteredSections.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeFilter]);

  const handleSearch = (e: React.FormEvent): void => {
    e.preventDefault();
  };

  const handleCreateSection = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (
      idToken === null ||
      idToken === undefined ||
      sectionName.trim().length === 0
    )
      return;

    try {
      setCreating(true);
      setError(null);

      const { apiPost } = await import("../../../lib/api");
      const response = await apiPost("/api/teacher/sections", {
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: sectionName.trim(),
          description: sectionDescription.trim(),
          studentIds: selectedStudents.map((s) => s.id),
        }),
        idToken,
      });

      const data = (await response.json()) as { error?: string };

      if (response.ok === false) {
        const errorData = data as { error?: string };
        throw new Error(errorData.error ?? "Failed to create section");
      }

      const sectionsResponse = await fetch("/api/teacher/sections", {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });

      const sectionsData = (await sectionsResponse.json()) as {
        sections?: Section[];
      };
      if (sectionsResponse.ok === true) {
        const sectionsResponseData = sectionsData as { sections: Section[] };
        setSections(sectionsResponseData.sections ?? []);
      }

      setSectionName("");
      setSectionDescription("");
      setSelectedStudents([]);
      setShowCreateForm(false);
    } catch (err) {
      console.error("Error creating section:", err);
      setError(err instanceof Error ? err.message : "Failed to create section");
    } finally {
      setCreating(false);
    }
  };

  const handleStudentSearch = async (
    e?: React.FormEvent | React.MouseEvent
  ): Promise<void> => {
    if (e !== undefined && e !== null) {
      e.preventDefault();
    }
    if (
      idToken === null ||
      idToken === undefined ||
      studentSearchTerm.trim().length === 0
    )
      return;

    try {
      setSearching(true);
      setError(null);

      const response = await fetch(
        `/api/teacher/students/search?q=${encodeURIComponent(studentSearchTerm.trim())}`,
        {
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        }
      );

      const data = (await response.json()) as {
        error?: string;
        students?: Student[];
      };

      if (response.ok === false) {
        const errorData = data as { error?: string };
        throw new Error(errorData.error ?? "Failed to search students");
      }

      const studentsData = data as { students: Student[] };
      setSearchResults(studentsData.students ?? []);
    } catch (err) {
      console.error("Error searching students:", err);
      setError(
        err instanceof Error ? err.message : "Failed to search students"
      );
    } finally {
      setSearching(false);
    }
  };

  const handleAddStudentToSelection = (student: Student): void => {
    if (selectedStudents.find((s) => s.id === student.id) === undefined) {
      setSelectedStudents([...selectedStudents, student]);
    }
    setSearchResults([]);
    setStudentSearchTerm("");
  };

  const handleRemoveStudentFromSelection = (studentId: string): void => {
    setSelectedStudents(selectedStudents.filter((s) => s.id !== studentId));
  };

  const handleDeleteClick = (
    sectionId: string,
    sectionName: string,
    e: React.MouseEvent
  ): void => {
    e.stopPropagation();
    setDeleteModal({ isOpen: true, sectionId, sectionName });
  };

  const handleDeleteConfirm = async (): Promise<void> => {
    if (
      idToken === null ||
      idToken === undefined ||
      deleteModal.sectionId === null ||
      deleteModal.sectionId === undefined ||
      deleteModal.sectionId === ""
    )
      return;

    setIsDeleting(true);
    try {
      const { apiDelete } = await import("../../../lib/api");
      const response = await apiDelete(
        `/api/teacher/sections/${deleteModal.sectionId}`,
        {
          idToken,
        }
      );

      if (response.ok === true) {
        setSections((prev) =>
          prev.filter((s) => s.id !== deleteModal.sectionId)
        );
        setDeleteModal({ isOpen: false, sectionId: "", sectionName: "" });
      } else {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error ?? "Failed to delete section");
      }
    } catch (error) {
      console.error("Error deleting section:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCancel = (): void => {
    setDeleteModal({ isOpen: false, sectionId: "", sectionName: "" });
  };

  const handleViewSection = (section: Section, e: React.MouseEvent): void => {
    e.stopPropagation();
    setViewModal({ isOpen: true, section });
  };

  const handleEditSection = (section: Section, e?: React.MouseEvent): void => {
    if (e !== undefined && e !== null) e.stopPropagation();
    setEditModal({ isOpen: true, section });
  };

  const handleSaveSection = async (
    sectionId: string,
    name: string,
    description: string,
    studentIds: string[]
  ): Promise<void> => {
    if (idToken === null || idToken === undefined) return;

    try {
      const { apiPut } = await import("../../../lib/api");
      const response = await apiPut(`/api/teacher/sections/${sectionId}`, {
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, studentIds }),
        idToken,
      });

      if (response.ok === false) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error ?? "Failed to update section");
      }

      // Refresh sections list
      const sectionsResponse = await fetch("/api/teacher/sections", {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      const sectionsData = (await sectionsResponse.json()) as {
        sections?: Section[];
      };
      if (sectionsResponse.ok === true) {
        const sectionsResponseData = sectionsData as { sections: Section[] };
        setSections(sectionsResponseData.sections ?? []);
      }
    } catch (err) {
      console.error("Error updating section:", err);
      throw err;
    }
  };

  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    } catch {
      return "Unknown";
    }
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return formatDate(dateString);
  };

  // Single color for section cards (consistent with quizzes)
  const cardColor = "bg-amber-100";

  return (
    <div className="flex flex-col items-center min-h-[60vh] relative">
      <div className="w-full max-w-2xl px-4 flex flex-col gap-6">
        {/* Title Section */}
        <div className="text-center">
          <h1 className="text-5xl font-black text-gray-900 tracking-tight mb-3">
            My Sections
          </h1>
          <div className="flex gap-1 justify-center mb-2">
            <p className="w-5 h-5 bg-red-500 border-2 border-gray-800 rounded-full"></p>
            <p className="w-5 h-5 bg-orange-500 rounded-full border-2 border-gray-800"></p>
            <p className="w-5 h-5 bg-green-500 rounded-full border-2 border-gray-800"></p>
          </div>
          <p className="text-lg font-medium text-gray-700">
            Organize your classes and manage student groups. Your classroom
            structure starts here.
          </p>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearch}>
          <div className="flex items-center bg-amber-100 border-3 border-gray-900 rounded-full shadow-[4px_4px_0px_0px_rgba(31,41,55,1)]">
            <span className="material-icons-outlined text-gray-900 text-xl pl-4">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search sections..."
              className="flex-1 px-3 py-3 bg-transparent text-gray-900 font-medium placeholder:text-gray-500 focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="pr-2"
              >
                <span className="material-icons-outlined text-gray-500 hover:text-gray-900 transition-colors text-xl">
                  close
                </span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={`mr-2 w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
                showFilters
                  ? "bg-amber-300 text-gray-900"
                  : "bg-transparent text-gray-900 hover:bg-amber-200"
              }`}
            >
              <span className="material-icons-outlined text-lg">tune</span>
            </button>
          </div>
        </form>

        {/* Filter Pills */}
        <div
          className={`flex justify-end overflow-hidden transition-all duration-300 ease-out ${
            showFilters ? "max-h-20 opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <div className="flex items-center gap-2 bg-amber-100 border-3 border-gray-900 rounded-full p-1.5">
            {filters.map((filter) => (
              <button
                key={filter.id}
                type="button"
                onClick={() => setActiveFilter(filter.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-bold text-sm transition-all ${
                  activeFilter === filter.id
                    ? "bg-amber-400 text-gray-900 border-2 border-gray-900"
                    : "bg-amber-200 text-gray-900 hover:bg-amber-300 border-2 border-gray-900"
                }`}
              >
                <span className="material-icons-outlined text-base">
                  {filter.icon}
                </span>
                <span>{filter.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <div className="w-full max-w-6xl px-4 mt-4">
          <div className="bg-red-400 border-4 border-gray-900 rounded-2xl p-4 shadow-[4px_4px_0px_0px_rgba(31,41,55,1)]">
            <div className="flex items-center gap-3">
              <span className="material-icons-outlined text-gray-900">
                error
              </span>
              <p className="font-bold text-gray-900">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Section Cards */}
      <div className="w-full max-w-6xl px-4 mt-8">
        <div className="relative">
          {/* Vertical Pagination - Left Side */}
          {!loading && filteredSections.length > 0 && (
            <div className="absolute -left-16 top-0 flex-col gap-2 hidden xl:flex">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className={`w-10 h-10 rounded-full border-3 border-gray-900 flex items-center justify-center transition-all ${
                  currentPage === 1
                    ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                    : "bg-amber-100 text-gray-900 hover:bg-amber-200 shadow-[3px_3px_0px_0px_rgba(17,24,39,1)] hover:shadow-[4px_4px_0px_0px_rgba(17,24,39,1)]"
                }`}
              >
                <span className="material-icons-outlined text-lg">
                  expand_less
                </span>
              </button>

              {Array.from(
                { length: Math.max(1, totalPages) },
                (_, i) => i + 1
              ).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-10 h-10 rounded-full border-3 border-gray-900 flex items-center justify-center font-bold transition-all ${
                    currentPage === page
                      ? "bg-amber-400 text-gray-900"
                      : "bg-amber-100 text-gray-900 hover:bg-amber-200 shadow-[3px_3px_0px_0px_rgba(17,24,39,1)] hover:shadow-[4px_4px_0px_0px_rgba(17,24,39,1)]"
                  }`}
                >
                  {page}
                </button>
              ))}

              <button
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage === totalPages || totalPages <= 1}
                className={`w-10 h-10 rounded-full border-3 border-gray-900 flex items-center justify-center transition-all ${
                  currentPage === totalPages || totalPages <= 1
                    ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                    : "bg-amber-100 text-gray-900 hover:bg-amber-200 shadow-[3px_3px_0px_0px_rgba(17,24,39,1)] hover:shadow-[4px_4px_0px_0px_rgba(17,24,39,1)]"
                }`}
              >
                <span className="material-icons-outlined text-lg">
                  expand_more
                </span>
              </button>
            </div>
          )}

          {/* Sections Header */}
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-gray-900">All Sections</h2>
              <span className="px-2 py-0.5 bg-amber-200 border-2 border-gray-900 rounded-full text-xs font-bold">
                {filteredSections.length}
              </span>
            </div>
            <button
              onClick={() => setShowCreateForm(true)}
              className="px-4 py-2 font-bold border-3 border-gray-900 rounded-full shadow-[3px_3px_0px_0px_rgba(31,41,55,1)] hover:shadow-[4px_4px_0px_0px_rgba(31,41,55,1)] active:shadow-[1px_1px_0px_0px_rgba(31,41,55,1)] transition-all flex items-center gap-2 bg-amber-200 text-gray-900"
            >
              <span className="material-icons-outlined text-lg">add</span>
              <span>New Section</span>
            </button>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="bg-amber-100 border-3 border-gray-900 rounded-2xl shadow-[4px_4px_0px_0px_rgba(17,24,39,1)] overflow-hidden animate-pulse"
                  style={{ height: "240px" }}
                >
                  <div className="flex items-center justify-between px-3 py-2.5 border-b-2 border-gray-900">
                    <div className="flex gap-1.5">
                      <div className="w-4 h-4 bg-gray-300 rounded-full border-2 border-gray-900"></div>
                      <div className="w-4 h-4 bg-gray-300 rounded-full border-2 border-gray-900"></div>
                      <div className="w-4 h-4 bg-gray-300 rounded-full border-2 border-gray-900"></div>
                    </div>
                    <div className="w-16 h-5 bg-gray-300 rounded-full border-2 border-gray-900"></div>
                  </div>
                  <div className="p-4 flex flex-col gap-3">
                    <div className="h-5 bg-gray-300 rounded-full border-2 border-gray-900 w-3/4"></div>
                    <div className="h-4 bg-gray-300 rounded-full border-2 border-gray-900 w-full"></div>
                    <div className="h-4 bg-gray-300 rounded-full border-2 border-gray-900 w-2/3"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredSections.length === 0 ? (
            <div className="bg-amber-200 border-4 border-gray-900 rounded-2xl p-12 shadow-[4px_4px_0px_0px_rgba(31,41,55,1)] flex flex-col items-center justify-center gap-4">
              <div className="w-20 h-20 bg-cyan-400 rounded-full flex items-center justify-center border-3 border-gray-900">
                <span className="material-icons-outlined text-gray-900 text-4xl">
                  school
                </span>
              </div>
              <p className="text-xl font-black text-gray-900 text-center">
                {searchQuery ? "No sections found" : "No sections yet"}
              </p>
              <p className="text-base font-medium text-gray-700 text-center">
                {searchQuery
                  ? "Try adjusting your search or filters."
                  : "Create your first section to organize your students!"}
              </p>
              {!searchQuery && (
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="mt-2 px-5 py-3 bg-amber-100 text-gray-900 font-bold border-3 border-gray-900 rounded-full shadow-[4px_4px_0px_0px_rgba(31,41,55,1)] hover:shadow-[5px_5px_0px_0px_rgba(31,41,55,1)] transition-all flex items-center gap-2"
                >
                  <span className="w-6 h-6 bg-gray-900 rounded-full flex items-center justify-center">
                    <span className="material-icons-outlined text-amber-100 text-sm">
                      add
                    </span>
                  </span>
                  <span>Create Section</span>
                </button>
              )}
            </div>
          ) : (
            <>
              <Masonry
                items={paginatedSections.map((section): MasonryItem => {
                  const hasDescription =
                    section.description && section.description.length > 0;

                  return {
                    id: section.id,
                    height: hasDescription ? 260 : 220,
                    content: (
                      <div className="cursor-pointer h-full group">
                        <TiltedCard
                          altText={section.name}
                          captionText={`${section.students.length} students`}
                          containerHeight="100%"
                          containerWidth="100%"
                          imageHeight="100%"
                          imageWidth="100%"
                          scaleOnHover={1.05}
                          rotateAmplitude={12}
                          showMobileWarning={false}
                          showTooltip={true}
                          displayOverlayContent={true}
                          overlayContent={
                            <div
                              className={`${cardColor} border-3 border-gray-900 rounded-2xl relative w-full h-full overflow-hidden flex flex-col shadow-[4px_4px_0px_0px_rgba(17,24,39,1)]`}
                            >
                              {/* macOS Traffic Lights */}
                              <div className="absolute top-3 left-3 flex gap-1.5 z-10">
                                <div className="w-4 h-4 bg-red-500 rounded-full border-2 border-black"></div>
                                <div className="w-4 h-4 bg-yellow-500 rounded-full border-2 border-black"></div>
                                <div className="w-4 h-4 bg-green-500 rounded-full border-2 border-black"></div>
                              </div>
                              {/* Header Right - Student Count & Date */}
                              <div className="absolute top-2 right-3 flex items-center gap-2 z-10">
                                <div className="flex items-center gap-1 px-2 py-0.5 bg-white/80 border-2 border-black rounded-full">
                                  <span className="material-icons-outlined text-black text-xs">
                                    groups
                                  </span>
                                  <span className="font-bold text-black text-xs">
                                    {section.students.length}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1 px-2 py-0.5 bg-white/80 border-2 border-black rounded-full">
                                  <span className="material-icons-outlined text-black text-xs">
                                    schedule
                                  </span>
                                  <span className="font-bold text-black text-xs">
                                    {getTimeAgo(section.createdAt)}
                                  </span>
                                </div>
                              </div>
                              {/* Separator Line */}
                              <div className="absolute top-11 left-0 right-0 h-0.5 bg-black z-10"></div>

                              {/* Content */}
                              <div className="pt-14 px-4 pb-2 text-left flex-1">
                                <h3 className="text-base font-black text-gray-900 mb-1">
                                  {section.name}
                                </h3>
                                {section.description && (
                                  <p
                                    className="text-sm font-medium text-gray-700 line-clamp-2"
                                    style={{
                                      fontFamily:
                                        "'Google Sans Mono', monospace",
                                    }}
                                  >
                                    {section.description}
                                  </p>
                                )}
                              </div>

                              {/* Students Preview */}
                              <div className="px-4 pb-3">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-xs font-bold text-gray-600">
                                    Students
                                  </span>
                                </div>
                                {section.students.length > 0 ? (
                                  <div className="flex -space-x-3">
                                    {section.students
                                      .slice(0, 3)
                                      .map((student, idx) => (
                                        <div
                                          key={student.id}
                                          className="w-8 h-8 bg-amber-200 rounded-full flex items-center justify-center border-2 border-black shadow-sm"
                                          style={{ zIndex: 3 - idx }}
                                          title={
                                            student.displayName || student.email
                                          }
                                        >
                                          <span className="text-xs font-black text-gray-900">
                                            {(student.displayName ||
                                              student.email)[0].toUpperCase()}
                                          </span>
                                        </div>
                                      ))}
                                    {section.students.length > 3 && (
                                      <div
                                        className="w-8 h-8 bg-amber-200 rounded-full flex items-center justify-center border-2 border-black shadow-sm"
                                        style={{ zIndex: 0 }}
                                      >
                                        <span className="text-xs font-bold text-gray-900">
                                          {section.students.length - 3 > 9
                                            ? "9+"
                                            : `+${section.students.length - 3}`}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <p className="text-xs font-medium text-gray-500">
                                    No students yet
                                  </p>
                                )}
                              </div>

                              {/* Hover Overlay */}
                              <div className="absolute inset-0 bg-gradient-to-t from-amber-100/95 via-amber-50/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl flex items-end justify-end p-4 z-20">
                                <div className="flex gap-2 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                                  {/* View Button */}
                                  <button
                                    className="w-11 h-11 bg-amber-100 border-3 border-black rounded-full flex items-center justify-center shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 transition-all"
                                    onClick={(e) =>
                                      handleViewSection(section, e)
                                    }
                                    title="View"
                                  >
                                    <span className="material-icons-outlined text-black text-lg">
                                      visibility
                                    </span>
                                  </button>
                                  {/* Edit Button */}
                                  <button
                                    className="w-11 h-11 bg-amber-100 border-3 border-black rounded-full flex items-center justify-center shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 transition-all"
                                    onClick={(e) =>
                                      handleEditSection(section, e)
                                    }
                                    title="Edit"
                                  >
                                    <span className="material-icons-outlined text-black text-lg">
                                      edit
                                    </span>
                                  </button>
                                  {/* Delete Button */}
                                  <button
                                    className="w-11 h-11 bg-amber-100 border-3 border-black rounded-full flex items-center justify-center shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 transition-all"
                                    onClick={(e) =>
                                      handleDeleteClick(
                                        section.id,
                                        section.name,
                                        e
                                      )
                                    }
                                    title="Delete"
                                  >
                                    <span className="material-icons-outlined text-black text-lg">
                                      delete
                                    </span>
                                  </button>
                                </div>
                              </div>
                            </div>
                          }
                        />
                      </div>
                    ),
                  };
                })}
                animateFrom="bottom"
                stagger={0.08}
                blurToFocus={true}
                gap={32}
                animationKey={`sections-${currentPage}`}
              />

              {/* Mobile Pagination */}
              {filteredSections.length > 0 && totalPages > 1 && (
                <div className="flex flex-col items-center gap-2 mt-8 xl:hidden">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className={`w-10 h-10 rounded-full border-3 border-gray-900 flex items-center justify-center transition-all ${
                        currentPage === 1
                          ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                          : "bg-amber-100 text-gray-900 hover:bg-amber-200 shadow-[3px_3px_0px_0px_rgba(17,24,39,1)] hover:shadow-[4px_4px_0px_0px_rgba(17,24,39,1)]"
                      }`}
                    >
                      <span className="material-icons-outlined text-lg">
                        chevron_left
                      </span>
                    </button>

                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                      (page) => (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`w-10 h-10 rounded-full border-3 border-gray-900 flex items-center justify-center font-bold transition-all ${
                            currentPage === page
                              ? "bg-amber-400 text-gray-900"
                              : "bg-amber-100 text-gray-900 hover:bg-amber-200 shadow-[3px_3px_0px_0px_rgba(17,24,39,1)] hover:shadow-[4px_4px_0px_0px_rgba(17,24,39,1)]"
                          }`}
                        >
                          {page}
                        </button>
                      )
                    )}

                    <button
                      onClick={() =>
                        setCurrentPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={currentPage === totalPages}
                      className={`w-10 h-10 rounded-full border-3 border-gray-900 flex items-center justify-center transition-all ${
                        currentPage === totalPages
                          ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                          : "bg-amber-100 text-gray-900 hover:bg-amber-200 shadow-[3px_3px_0px_0px_rgba(17,24,39,1)] hover:shadow-[4px_4px_0px_0px_rgba(17,24,39,1)]"
                      }`}
                    >
                      <span className="material-icons-outlined text-lg">
                        chevron_right
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteModal.isOpen}
        sectionName={deleteModal.sectionName}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
        isDeleting={isDeleting}
      />

      {/* View Section Modal */}
      <ViewSectionModal
        isOpen={viewModal.isOpen}
        section={viewModal.section}
        onClose={() => setViewModal({ isOpen: false, section: null })}
        onEdit={() => {
          // Capture the section before closing the view modal
          const sectionToEdit = viewModal.section;
          setViewModal({ isOpen: false, section: null });
          if (sectionToEdit) {
            // Small delay to let view modal close animation complete
            setTimeout(() => {
              setEditModal({ isOpen: true, section: sectionToEdit });
            }, 350);
          }
        }}
      />

      {/* Edit Section Modal */}
      <EditSectionModal
        isOpen={editModal.isOpen}
        section={editModal.section}
        onClose={() => setEditModal({ isOpen: false, section: null })}
        onSave={handleSaveSection}
        idToken={idToken}
      />

      {/* Create Section Modal */}
      <CreateSectionModal
        isOpen={showCreateForm}
        onClose={() => {
          setShowCreateForm(false);
          setSectionName("");
          setSectionDescription("");
          setSelectedStudents([]);
          setSearchResults([]);
          setStudentSearchTerm("");
        }}
        onCreateSection={handleCreateSection}
        sectionName={sectionName}
        setSectionName={setSectionName}
        sectionDescription={sectionDescription}
        setSectionDescription={setSectionDescription}
        studentSearchTerm={studentSearchTerm}
        setStudentSearchTerm={setStudentSearchTerm}
        searchResults={searchResults}
        selectedStudents={selectedStudents}
        searching={searching}
        creating={creating}
        onStudentSearch={handleStudentSearch}
        onAddStudent={handleAddStudentToSelection}
        onRemoveStudent={handleRemoveStudentFromSelection}
      />
    </div>
  );
}
