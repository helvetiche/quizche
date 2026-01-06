"use client";

import { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import AuthGuard from "../../components/auth/AuthGuard";
import DashboardLayout from "../../components/layout/DashboardLayout";
import Loading from "../../components/ui/Loading";

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

export default function SectionsPage() {
  const [user, setUser] = useState<any>(null);
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

      // Refresh sections list
      const sectionsResponse = await fetch("/api/teacher/sections", {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });

      const sectionsData = await sectionsResponse.json();
      if (sectionsResponse.ok) {
        setSections(sectionsData.sections || []);
      }

      // Reset form
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

      // Refresh sections list
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

  if (loading && !idToken) {
    return <Loading />;
  }

  return (
    <AuthGuard requiredRole="teacher" onAuthSuccess={setUser}>
      <DashboardLayout
        title="QuizChe - Sections"
        userEmail={user?.email}
        userRole="teacher"
      >
        <div className="flex flex-col gap-8">
          <div className="flex items-center justify-between">
            <h2 className="text-3xl font-light text-black">My Sections</h2>
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="px-6 py-3 bg-black text-white font-light hover:bg-gray-800 transition-colors"
            >
              {showCreateForm ? "Cancel" : "Create Section"}
            </button>
          </div>

          {error && (
            <div className="flex flex-col items-center justify-center py-4 gap-4">
              <p className="text-lg font-light text-red-600">{error}</p>
            </div>
          )}

          {/* Create Section Form */}
          {showCreateForm && (
            <div className="flex flex-col gap-6 p-6 border-2 border-black bg-white">
              <h3 className="text-xl font-light text-black">Create New Section</h3>

              {/* Student Search and Selection - Outside main form */}
              <div className="flex flex-col gap-4">
                <h4 className="text-lg font-light text-black">Add Students</h4>

                {/* Search Form */}
                <div className="flex gap-4">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search students by email or name..."
                    className="flex-1 px-4 py-3 border-2 border-black bg-white text-black font-light focus:outline-none focus:ring-2 focus:ring-black"
                  />
                  <button
                    onClick={handleSearch}
                    disabled={searching}
                    className="px-6 py-3 bg-black text-white font-light hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {searching ? "Searching..." : "Search"}
                  </button>
                </div>

                {/* Search Results */}
                {searchResults.length > 0 && (
                  <div className="flex flex-col gap-4">
                    <h5 className="text-sm font-light text-black">Search Results</h5>
                    <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
                      {searchResults.map((student) => (
                        <div
                          key={student.id}
                          className="flex items-center justify-between p-3 border-2 border-gray-300 bg-gray-50"
                        >
                          <div className="flex flex-col gap-1">
                            <span className="font-light text-black text-sm">
                              {student.displayName || student.email}
                            </span>
                            <span className="text-xs font-light text-gray-600">
                              {student.email}
                            </span>
                          </div>
                          <button
                            onClick={() => handleAddStudentToSelection(student)}
                            className="px-3 py-1 bg-black text-white font-light hover:bg-gray-800 transition-colors text-xs"
                          >
                            Add
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Selected Students */}
                {selectedStudents.length > 0 && (
                  <div className="flex flex-col gap-4">
                    <h5 className="text-sm font-light text-black">Selected Students ({selectedStudents.length})</h5>
                    <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
                      {selectedStudents.map((student) => (
                        <div
                          key={student.id}
                          className="flex items-center justify-between p-3 border-2 border-black bg-white"
                        >
                          <div className="flex flex-col gap-1">
                            <span className="font-light text-black text-sm">
                              {student.displayName || student.email}
                            </span>
                            <span className="text-xs font-light text-gray-600">
                              {student.email}
                            </span>
                          </div>
                          <button
                            onClick={() => handleRemoveStudentFromSelection(student.id)}
                            className="px-3 py-1 bg-red-600 text-white font-light hover:bg-red-700 transition-colors text-xs"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <form onSubmit={handleCreateSection} className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-light text-black">Section Name *</label>
                  <input
                    type="text"
                    value={sectionName}
                    onChange={(e) => setSectionName(e.target.value)}
                    className="px-4 py-3 border-2 border-black bg-white text-black font-light focus:outline-none focus:ring-2 focus:ring-black"
                    placeholder="Enter section name"
                    required
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-sm font-light text-black">Description</label>
                  <textarea
                    value={sectionDescription}
                    onChange={(e) => setSectionDescription(e.target.value)}
                    className="px-4 py-3 border-2 border-black bg-white text-black font-light focus:outline-none focus:ring-2 focus:ring-black resize-none"
                    placeholder="Enter section description (optional)"
                    rows={3}
                  />
                </div>

                <div className="flex gap-4">
                  <button
                    type="submit"
                    disabled={creating || !sectionName.trim()}
                    className="px-6 py-3 bg-black text-white font-light hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                    className="px-6 py-3 bg-gray-200 text-black font-light hover:bg-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Sections List */}
          <div className="flex flex-col gap-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-black font-light">Loading sections...</div>
              </div>
            ) : sections.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-4">
                <p className="text-lg font-light text-gray-600">
                  No sections yet. Create your first section to get started!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {sections.map((section) => (
                  <div
                    key={section.id}
                    className="flex flex-col gap-4 p-6 border-2 border-black bg-white"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex flex-col gap-2 flex-1">
                        <h3 className="text-xl font-light text-black">{section.name}</h3>
                        {section.description && (
                          <p className="text-sm font-light text-gray-600 line-clamp-2">
                            {section.description}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => handleDeleteSection(section.id)}
                        className="px-3 py-1 bg-red-600 text-white font-light hover:bg-red-700 transition-colors text-xs"
                      >
                        Delete
                      </button>
                    </div>

                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between text-sm font-light text-gray-600">
                        <span>Students: {section.students.length}</span>
                        <span>Created: {formatDate(section.createdAt)}</span>
                      </div>

                      {section.students.length > 0 && (
                        <div className="flex flex-col gap-2">
                          <h4 className="text-sm font-light text-black">Students:</h4>
                          <div className="max-h-32 overflow-y-auto">
                            {section.students.map((student) => (
                              <div
                                key={student.id}
                                className="text-sm font-light text-gray-600 py-1 border-b border-gray-200 last:border-b-0"
                              >
                                {student.displayName || student.email}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DashboardLayout>
    </AuthGuard>
  );
}