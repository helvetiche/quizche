"use client";

import { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";

interface Student {
  id: string;
  email: string;
  displayName?: string;
  role: string;
}

interface Section {
  id: string;
  name: string;
  description?: string;
  teacherId: string;
  students: Student[];
  createdAt: string;
  updatedAt: string;
}

export default function TeacherSectionsContent() {
  const [idToken, setIdToken] = useState<string | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [sectionName, setSectionName] = useState("");
  const [sectionDescription, setSectionDescription] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<Student[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<Student[]>([]);
  const [searching, setSearching] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        try {
          const token = await currentUser.getIdToken();
          setIdToken(token);
        } catch (error) {
          console.error("Error getting token:", error);
        }
      } else {
        setIdToken(null);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchSections = async () => {
      if (!idToken) return;

      try {
        setLoading(true);
        setError(null);

        const response = await fetch("/api/teacher/sections", {
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to fetch sections");
        }

        setSections(data.sections || []);
      } catch (err) {
        console.error("Error fetching sections:", err);
        setError(err instanceof Error ? err.message : "Failed to load sections");
      } finally {
        setLoading(false);
      }
    };

    fetchSections();
  }, [idToken]);

  const handleCreateSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idToken || !sectionName.trim()) return;

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
          studentIds: selectedStudents.map(s => s.id),
        }),
        idToken,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create section");
      }

      const sectionsResponse = await fetch("/api/teacher/sections", {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });

      const sectionsData = await sectionsResponse.json();
      if (sectionsResponse.ok) {
        setSections(sectionsData.sections || []);
      }

      setSectionName("");
      setSectionDescription("");
      setSelectedStudents([]);
      setShowCreateForm(false);

      alert("Section created successfully!");
    } catch (err) {
      console.error("Error creating section:", err);
      setError(err instanceof Error ? err.message : "Failed to create section");
    } finally {
      setCreating(false);
    }
  };

  const handleSearch = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e) {
      e.preventDefault();
    }
    if (!idToken || !searchTerm.trim()) return;

    try {
      setSearching(true);
      setError(null);

      const response = await fetch(`/api/teacher/students/search?q=${encodeURIComponent(searchTerm.trim())}`, {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to search students");
      }

      setSearchResults(data.students || []);
    } catch (err) {
      console.error("Error searching students:", err);
      setError(err instanceof Error ? err.message : "Failed to search students");
    } finally {
      setSearching(false);
    }
  };

  const handleAddStudentToSelection = (student: Student) => {
    if (!selectedStudents.find(s => s.id === student.id)) {
      setSelectedStudents([...selectedStudents, student]);
    }
    setSearchResults([]);
    setSearchTerm("");
  };

  const handleRemoveStudentFromSelection = (studentId: string) => {
    setSelectedStudents(selectedStudents.filter(s => s.id !== studentId));
  };

  const handleDeleteSection = async (sectionId: string) => {
    if (!idToken) return;

    if (!confirm("Are you sure you want to delete this section? This action cannot be undone.")) {
      return;
    }

    try {
      const { apiDelete } = await import("../../../lib/api");
      const response = await apiDelete(`/api/teacher/sections/${sectionId}`, {
        idToken,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete section");
      }

      const sectionsResponse = await fetch("/api/teacher/sections", {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });

      const sectionsData = await sectionsResponse.json();
      if (sectionsResponse.ok) {
        setSections(sectionsData.sections || []);
      }

      alert("Section deleted successfully!");
    } catch (err) {
      console.error("Error deleting section:", err);
      alert(err instanceof Error ? err.message : "Failed to delete section");
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return "Unknown date";
    }
  };

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-purple-400 rounded-xl flex items-center justify-center border-3 border-gray-900 shadow-[3px_3px_0px_0px_rgba(31,41,55,1)]">
            <span className="material-icons-outlined text-gray-900 text-2xl">school</span>
          </div>
          <div>
            <h2 className="text-3xl font-black text-gray-900">My Sections</h2>
            <p className="text-sm font-bold text-gray-600">[ organize your classes ]</p>
          </div>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className={`px-6 py-3 font-bold border-3 border-gray-900 shadow-[4px_4px_0px_0px_rgba(31,41,55,1)] hover:shadow-[6px_6px_0px_0px_rgba(31,41,55,1)] hover:-translate-x-0.5 hover:-translate-y-0.5 active:shadow-[2px_2px_0px_0px_rgba(31,41,55,1)] active:translate-x-0.5 active:translate-y-0.5 transition-all ${
            showCreateForm 
              ? "bg-gray-200 text-gray-900" 
              : "bg-gray-900 text-amber-100"
          }`}
        >
          {showCreateForm ? "Cancel" : "+ Create Section"}
        </button>
      </div>

      {error && (
        <div className="bg-red-400 border-4 border-gray-900 p-4 shadow-[4px_4px_0px_0px_rgba(31,41,55,1)]">
          <div className="flex items-center gap-3">
            <span className="material-icons-outlined text-gray-900">error</span>
            <p className="font-bold text-gray-900">{error}</p>
          </div>
        </div>
      )}

      {/* Create Section Form */}
      {showCreateForm && (
        <div className="bg-white border-4 border-gray-900 shadow-[6px_6px_0px_0px_rgba(31,41,55,1)]">
          {/* Form Header */}
          <div className="bg-purple-400 border-b-4 border-gray-900 px-6 py-4">
            <div className="flex items-center gap-2">
              <div className="flex gap-2">
                <div className="w-4 h-4 bg-red-500 rounded-full border-2 border-gray-900"></div>
                <div className="w-4 h-4 bg-yellow-500 rounded-full border-2 border-gray-900"></div>
                <div className="w-4 h-4 bg-green-500 rounded-full border-2 border-gray-900"></div>
              </div>
              <h3 className="text-xl font-black text-gray-900 ml-4">Create New Section</h3>
            </div>
          </div>

          <div className="p-6 flex flex-col gap-6">
            {/* Student Search */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <span className="material-icons-outlined text-gray-900">person_search</span>
                <h4 className="text-lg font-black text-gray-900">Add Students</h4>
              </div>

              <div className="flex gap-3">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch(e)}
                  placeholder="Search by email or name..."
                  className="flex-1 px-4 py-3 border-3 border-gray-900 bg-amber-50 font-medium placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
                <button
                  onClick={handleSearch}
                  disabled={searching}
                  className="px-6 py-3 bg-cyan-400 text-gray-900 font-bold border-3 border-gray-900 shadow-[3px_3px_0px_0px_rgba(31,41,55,1)] hover:shadow-[4px_4px_0px_0px_rgba(31,41,55,1)] active:shadow-[1px_1px_0px_0px_rgba(31,41,55,1)] active:translate-x-0.5 active:translate-y-0.5 transition-all disabled:opacity-50"
                >
                  {searching ? "..." : "Search"}
                </button>
              </div>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="bg-amber-50 border-3 border-gray-900 p-4">
                  <p className="text-sm font-bold text-gray-700 mb-3">Search Results</p>
                  <div className="flex flex-col gap-2 max-h-40 overflow-y-auto">
                    {searchResults.map((student) => (
                      <div
                        key={student.id}
                        className="flex items-center justify-between p-3 bg-white border-2 border-gray-900"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-lime-400 rounded-full flex items-center justify-center border-2 border-gray-900">
                            <span className="text-sm font-black text-gray-900">
                              {(student.displayName || student.email)[0].toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-bold text-gray-900 text-sm">
                              {student.displayName || student.email}
                            </p>
                            <p className="text-xs text-gray-600">{student.email}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleAddStudentToSelection(student)}
                          className="px-3 py-1 bg-gray-900 text-amber-100 font-bold text-sm border-2 border-gray-900 hover:bg-gray-800 transition-colors"
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
                <div className="bg-lime-100 border-3 border-gray-900 p-4">
                  <p className="text-sm font-bold text-gray-700 mb-3">
                    Selected Students ({selectedStudents.length})
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {selectedStudents.map((student) => (
                      <div
                        key={student.id}
                        className="flex items-center gap-2 px-3 py-2 bg-white border-2 border-gray-900"
                      >
                        <span className="font-bold text-gray-900 text-sm">
                          {student.displayName || student.email}
                        </span>
                        <button
                          onClick={() => handleRemoveStudentFromSelection(student.id)}
                          className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center border border-gray-900 hover:bg-red-600 transition-colors"
                        >
                          <span className="text-white text-xs font-bold">×</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Section Details Form */}
            <form onSubmit={handleCreateSection} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-black text-gray-900">Section Name *</label>
                <input
                  type="text"
                  value={sectionName}
                  onChange={(e) => setSectionName(e.target.value)}
                  className="px-4 py-3 border-3 border-gray-900 bg-amber-50 font-medium placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-400"
                  placeholder="e.g., Grade 10 - Section A"
                  required
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-black text-gray-900">Description</label>
                <textarea
                  value={sectionDescription}
                  onChange={(e) => setSectionDescription(e.target.value)}
                  className="px-4 py-3 border-3 border-gray-900 bg-amber-50 font-medium placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none"
                  placeholder="Optional description for this section..."
                  rows={3}
                />
              </div>

              <div className="flex gap-4 pt-2">
                <button
                  type="submit"
                  disabled={creating || !sectionName.trim()}
                  className="px-6 py-3 bg-purple-400 text-gray-900 font-bold border-3 border-gray-900 shadow-[4px_4px_0px_0px_rgba(31,41,55,1)] hover:shadow-[5px_5px_0px_0px_rgba(31,41,55,1)] active:shadow-[2px_2px_0px_0px_rgba(31,41,55,1)] active:translate-x-0.5 active:translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creating ? "Creating..." : "Create Section"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
                    setSectionName("");
                    setSectionDescription("");
                    setSelectedStudents([]);
                    setSearchResults([]);
                    setSearchTerm("");
                  }}
                  className="px-6 py-3 bg-gray-200 text-gray-900 font-bold border-3 border-gray-900 shadow-[4px_4px_0px_0px_rgba(31,41,55,1)] hover:shadow-[5px_5px_0px_0px_rgba(31,41,55,1)] active:shadow-[2px_2px_0px_0px_rgba(31,41,55,1)] active:translate-x-0.5 active:translate-y-0.5 transition-all"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sections List */}
      <div className="flex flex-col gap-4">
        {loading ? (
          <div className="bg-white border-4 border-gray-900 p-12 shadow-[4px_4px_0px_0px_rgba(31,41,55,1)] flex items-center justify-center">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 border-3 border-gray-900 border-t-transparent rounded-full animate-spin"></div>
              <span className="font-bold text-gray-900">Loading sections...</span>
            </div>
          </div>
        ) : sections.length === 0 ? (
          <div className="bg-amber-200 border-4 border-gray-900 p-12 shadow-[4px_4px_0px_0px_rgba(31,41,55,1)] flex flex-col items-center justify-center gap-4">
            <div className="w-16 h-16 bg-purple-400 rounded-full flex items-center justify-center border-3 border-gray-900">
              <span className="material-icons-outlined text-gray-900 text-3xl">folder_open</span>
            </div>
            <p className="text-lg font-bold text-gray-900 text-center">
              No sections yet. Create your first section to get started!
            </p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="px-6 py-3 bg-gray-900 text-amber-100 font-bold border-3 border-gray-900 shadow-[4px_4px_0px_0px_rgba(31,41,55,1)] hover:shadow-[5px_5px_0px_0px_rgba(31,41,55,1)] active:shadow-[2px_2px_0px_0px_rgba(31,41,55,1)] transition-all"
            >
              + Create Section
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {sections.map((section, index) => {
              const colors = ["bg-cyan-400", "bg-pink-400", "bg-lime-400", "bg-orange-400", "bg-purple-400"];
              const bgColor = colors[index % colors.length];
              
              return (
                <div
                  key={section.id}
                  className="bg-white border-4 border-gray-900 shadow-[5px_5px_0px_0px_rgba(31,41,55,1)] overflow-hidden"
                >
                  {/* Card Header */}
                  <div className={`${bgColor} border-b-4 border-gray-900 px-5 py-4`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-xl font-black text-gray-900">{section.name}</h3>
                        {section.description && (
                          <p className="text-sm font-medium text-gray-800 mt-1 line-clamp-1">
                            {section.description}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => handleDeleteSection(section.id)}
                        className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center border-2 border-gray-900 hover:bg-red-600 transition-colors"
                      >
                        <span className="material-icons-outlined text-white text-lg">delete</span>
                      </button>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-5">
                    {/* Stats */}
                    <div className="flex items-center gap-4 mb-4">
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-100 border-2 border-gray-900 rounded-full">
                        <span className="material-icons-outlined text-gray-900 text-sm">groups</span>
                        <span className="font-bold text-gray-900 text-sm">{section.students.length} students</span>
                      </div>
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-100 border-2 border-gray-900 rounded-full">
                        <span className="material-icons-outlined text-gray-900 text-sm">calendar_today</span>
                        <span className="font-bold text-gray-900 text-sm">{formatDate(section.createdAt)}</span>
                      </div>
                    </div>

                    {/* Students List */}
                    {section.students.length > 0 && (
                      <div className="bg-amber-50 border-2 border-gray-900 p-3">
                        <p className="text-xs font-bold text-gray-700 mb-2">STUDENTS</p>
                        <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                          {section.students.slice(0, 8).map((student) => (
                            <div
                              key={student.id}
                              className="flex items-center gap-1.5 px-2 py-1 bg-white border border-gray-900 rounded-full"
                            >
                              <div className="w-5 h-5 bg-lime-400 rounded-full flex items-center justify-center border border-gray-900">
                                <span className="text-xs font-black text-gray-900">
                                  {(student.displayName || student.email)[0].toUpperCase()}
                                </span>
                              </div>
                              <span className="text-xs font-medium text-gray-900 max-w-20 truncate">
                                {student.displayName || student.email.split("@")[0]}
                              </span>
                            </div>
                          ))}
                          {section.students.length > 8 && (
                            <div className="flex items-center px-2 py-1 bg-gray-900 text-amber-100 border border-gray-900 rounded-full">
                              <span className="text-xs font-bold">+{section.students.length - 8} more</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
