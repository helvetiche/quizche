/* eslint-disable @typescript-eslint/no-misused-promises */
/* eslint-disable @typescript-eslint/strict-boolean-expressions, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unnecessary-condition */
"use client";

import { useState, useEffect } from "react";
import type { ReactElement } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import Masonry, { type MasonryItem } from "@/components/Masonry";

import type { Section } from "./sections/types";
import DeleteConfirmModal from "./sections/modals/DeleteConfirmModal";
import ViewSectionModal from "./sections/modals/ViewSectionModal";
import EditSectionModal from "./sections/modals/EditSectionModal";
import CreateSectionModal from "./sections/modals/CreateSectionModal";
import SectionCard from "./sections/SectionCard";

export default function TeacherSectionsContent(): ReactElement {
  const [idToken, setIdToken] = useState<string | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
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
        setSections(sectionsData.sections ?? ([] as never[]));
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

  const handleCreateSection = async (
    name: string,
    description: string,
    studentIds: string[]
  ): Promise<void> => {
    if (idToken === null || idToken === undefined) return;

    try {
      const { apiPost } = await import("../../../lib/api");
      const response = await apiPost("/api/teacher/sections", {
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          description,
          studentIds,
        }),
        idToken,
      });

      const data = (await response.json()) as { error?: string };

      if (response.ok === false) {
        const errorData = data as { error?: string };
        throw new Error(errorData.error ?? "Failed to create section");
      }

      // Refresh sections
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
        setSections(sectionsResponseData.sections ?? ([] as never[]));
      }

      setShowCreateForm(false);
    } catch (err) {
      console.error("Error creating section:", err);
      throw err; // Let the modal handle the error display
    }
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
        setSections(sectionsResponseData.sections ?? ([] as never[]));
      }
    } catch (err) {
      console.error("Error updating section:", err);
      throw err;
    }
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
        <form onSubmit={(e) => void handleSearch(e)}>
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
                  : "Create your first section to organize your students"}
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
                      <SectionCard
                        section={section}
                        cardColor={cardColor}
                        onView={handleViewSection}
                        onEdit={handleEditSection}
                        onDelete={handleDeleteClick}
                      />
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

      {/* Modals */}
      <CreateSectionModal
        isOpen={showCreateForm}
        onClose={() => setShowCreateForm(false)}
        onCreate={handleCreateSection}
        idToken={idToken}
      />

      <EditSectionModal
        isOpen={editModal.isOpen}
        section={editModal.section}
        onClose={() => setEditModal({ isOpen: false, section: null })}
        onSave={handleSaveSection}
        idToken={idToken}
      />

      <ViewSectionModal
        isOpen={viewModal.isOpen}
        section={viewModal.section}
        onClose={() => setViewModal({ isOpen: false, section: null })}
        onEdit={() => {
          if (viewModal.section) {
            handleEditSection(viewModal.section);
            setViewModal({ isOpen: false, section: null });
          }
        }}
      />

      <DeleteConfirmModal
        isOpen={deleteModal.isOpen}
        sectionName={deleteModal.sectionName}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
        isDeleting={isDeleting}
      />
    </div>
  );
}
