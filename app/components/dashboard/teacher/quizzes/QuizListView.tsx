"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useQuizView } from "./QuizViewContext";
import TiltedCard from "@/components/TiltedCard";
import Masonry, { type MasonryItem } from "@/components/Masonry";

type Quiz = {
  id: string;
  title: string;
  description: string;
  totalQuestions: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  deadline?: string;
  duration?: number | null;
};

type Draft = {
  id: string;
  title: string;
  description: string;
  totalQuestions: number;
  createdAt: string;
  updatedAt: string;
};

export default function QuizListView() {
  const router = useRouter();
  const { goToDetail } = useQuizView();
  const [idToken, setIdToken] = useState<string | null>(null);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingDrafts, setLoadingDrafts] = useState(true);
  const [deletingDraft, setDeletingDraft] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [showDrafts, setShowDrafts] = useState(true);
  const [showQuizzes, setShowQuizzes] = useState(true);
  const [draftPage, setDraftPage] = useState(1);
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    quizId: string;
    quizTitle: string;
  }>({
    isOpen: false,
    quizId: "",
    quizTitle: "",
  });
  const [isDeleting, setIsDeleting] = useState(false);
  const itemsPerPage = 6;

  const filters = [
    { id: "all", label: "All", icon: "apps" },
    { id: "active", label: "Active", icon: "play_circle" },
    { id: "inactive", label: "Inactive", icon: "pause_circle" },
    { id: "recent", label: "Recent", icon: "schedule" },
  ];

  const goToCreate = () => router.push("/teacher/composer");

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
    const fetchQuizzes = async () => {
      if (!idToken) return;

      try {
        setLoading(true);
        setError(null);

        const response = await fetch("/api/quizzes", {
          headers: { Authorization: `Bearer ${idToken}` },
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to fetch quizzes");
        }

        setQuizzes(data.quizzes || []);
      } catch (err) {
        console.error("Error fetching quizzes:", err);
        setError(err instanceof Error ? err.message : "Failed to load quizzes");
      } finally {
        setLoading(false);
      }
    };

    const fetchDrafts = async () => {
      if (!idToken) return;

      try {
        setLoadingDrafts(true);

        const response = await fetch("/api/quizzes/drafts", {
          headers: { Authorization: `Bearer ${idToken}` },
        });

        const data = await response.json();

        if (!response.ok) {
          console.error("Failed to fetch drafts:", data.error);
          return;
        }

        setDrafts(data.drafts || []);
      } catch (err) {
        console.error("Error fetching drafts:", err);
      } finally {
        setLoadingDrafts(false);
      }
    };

    fetchQuizzes();
    fetchDrafts();
  }, [idToken]);

  // Filter quizzes based on search and filter
  const filteredQuizzes = quizzes.filter((quiz) => {
    const matchesSearch =
      quiz.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      quiz.description?.toLowerCase().includes(searchQuery.toLowerCase());

    if (activeFilter === "all") return matchesSearch;
    if (activeFilter === "active") return matchesSearch && quiz.isActive;
    if (activeFilter === "inactive") return matchesSearch && !quiz.isActive;
    if (activeFilter === "recent") {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      return matchesSearch && new Date(quiz.createdAt) > oneWeekAgo;
    }
    return matchesSearch;
  });

  // Pagination
  const totalPages = Math.ceil(filteredQuizzes.length / itemsPerPage);
  const paginatedQuizzes = filteredQuizzes.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeFilter]);

  const formatDate = (dateString: string) => {
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

  // Calculate deadline progress
  const getDeadlineProgress = (createdAt: string, deadline?: string) => {
    const now = new Date();
    const created = new Date(createdAt);
    const deadlineDate = deadline
      ? new Date(deadline)
      : new Date(created.getTime() + 7 * 24 * 60 * 60 * 1000);

    const totalDuration = deadlineDate.getTime() - created.getTime();
    const elapsed = now.getTime() - created.getTime();
    const remaining = Math.max(0, 100 - (elapsed / totalDuration) * 100);

    return Math.min(100, Math.max(0, remaining));
  };

  const getTimeRemainingText = (createdAt: string, deadline?: string) => {
    const now = new Date();
    const created = new Date(createdAt);
    const deadlineDate = deadline
      ? new Date(deadline)
      : new Date(created.getTime() + 7 * 24 * 60 * 60 * 1000);

    const diff = deadlineDate.getTime() - now.getTime();

    if (diff <= 0) return "Expired";

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) return `${days}d ${hours}h left`;
    if (hours > 0) return `${hours}h left`;
    return "< 1h left";
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
  };

  const handleContinueDraft = (draftId: string) => {
    router.push(`/teacher/composer?draft=${draftId}`);
  };

  const handleEditQuiz = (quizId: string) => {
    router.push(`/teacher/composer?edit=${quizId}`);
  };

  const handleDeleteClick = (
    quizId: string,
    quizTitle: string,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    setDeleteModal({ isOpen: true, quizId, quizTitle });
  };

  const handleDeleteConfirm = async () => {
    if (!idToken || !deleteModal.quizId) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/quizzes/${deleteModal.quizId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${idToken}` },
      });

      if (response.ok) {
        setQuizzes((prev) => prev.filter((q) => q.id !== deleteModal.quizId));
        setDeleteModal({ isOpen: false, quizId: "", quizTitle: "" });
      } else {
        console.error("Failed to delete quiz");
      }
    } catch (error) {
      console.error("Error deleting quiz:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteModal({ isOpen: false, quizId: "", quizTitle: "" });
  };

  const handleDeleteDraft = async (draftId: string) => {
    if (!idToken) return;
    if (!confirm("Are you sure you want to delete this draft?")) return;

    setDeletingDraft(draftId);
    try {
      const { apiDelete } = await import("@/app/lib/api");
      const response = await apiDelete(`/api/quizzes/drafts/${draftId}`, {
        idToken,
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete draft");
      }

      setDrafts(drafts.filter((d) => d.id !== draftId));
    } catch (err) {
      console.error("Error deleting draft:", err);
      alert(err instanceof Error ? err.message : "Failed to delete draft");
    } finally {
      setDeletingDraft(null);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  // Filter drafts based on search
  const filteredDrafts = drafts.filter((draft) => {
    return (
      draft.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      draft.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  // Drafts pagination
  const totalDraftPages = Math.ceil(filteredDrafts.length / itemsPerPage);
  const paginatedDrafts = filteredDrafts.slice(
    (draftPage - 1) * itemsPerPage,
    draftPage * itemsPerPage
  );

  // Reset draft page when search changes
  useEffect(() => {
    setDraftPage(1);
  }, [searchQuery]);

  return (
    <div className="flex flex-col items-center min-h-[60vh] relative">
      <div className="w-full max-w-2xl px-4 flex flex-col gap-6">
        {/* Title Section */}
        <div className="text-center">
          <h1 className="text-5xl font-black text-gray-900 tracking-tight mb-3">
            My Quizzes
          </h1>
          <div className="flex gap-1 justify-center mb-2">
            <p className="w-5 h-5 bg-red-500 border-2 border-gray-800 rounded-full"></p>
            <p className="w-5 h-5 bg-orange-500 rounded-full border-2 border-gray-800"></p>
            <p className="w-5 h-5 bg-green-500 rounded-full border-2 border-gray-800"></p>
          </div>
          <p className="text-lg font-medium text-gray-700">
            Create, manage, and track your assessments. Your teaching toolkit
            starts here.
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
              placeholder="Search quizzes..."
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
                  ? "bg-gray-900 text-amber-100"
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
                    ? "bg-gray-900 text-amber-100"
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

        {/* Action Buttons */}
        <div className="flex justify-center gap-3"></div>
      </div>

      {/* Drafts Section */}
      {(filteredDrafts.length > 0 || loadingDrafts) && (
        <div className="w-full max-w-6xl px-4 mt-8">
          <div className="mb-4">
            <button
              onClick={() => setShowDrafts(!showDrafts)}
              className="flex items-center gap-2 text-gray-900 hover:text-gray-700 transition-colors"
            >
              <span className="material-icons-outlined text-lg">
                {showDrafts ? "expand_more" : "chevron_right"}
              </span>
              <h2 className="text-lg font-black">Drafts</h2>
              <span className="px-2 py-0.5 bg-sky-300 border-2 border-gray-900 rounded-full text-xs font-bold">
                {filteredDrafts.length}
              </span>
            </button>
            <p className="text-sm text-gray-600 mt-1 ml-7">
              Unfinished quizzes waiting to be completed
            </p>
          </div>

          {showDrafts && (
            <div className="relative">
              {/* Vertical Pagination - Left Side */}
              {!loadingDrafts && filteredDrafts.length > 0 && (
                <div className="absolute -left-16 top-0 flex-col gap-2 hidden xl:flex z-10">
                  {/* Up Button */}
                  <button
                    onClick={() => setDraftPage((p) => Math.max(1, p - 1))}
                    disabled={draftPage === 1}
                    className={`w-10 h-10 rounded-full border-3 border-gray-900 flex items-center justify-center transition-all ${
                      draftPage === 1
                        ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                        : "bg-sky-100 text-gray-900 hover:bg-sky-200 shadow-[3px_3px_0px_0px_rgba(17,24,39,1)] hover:shadow-[4px_4px_0px_0px_rgba(17,24,39,1)]"
                    }`}
                  >
                    <span className="material-icons-outlined text-lg">
                      expand_less
                    </span>
                  </button>

                  {/* Page Numbers */}
                  {Array.from(
                    { length: Math.max(1, totalDraftPages) },
                    (_, i) => i + 1
                  ).map((page) => (
                    <button
                      key={page}
                      onClick={() => setDraftPage(page)}
                      className={`w-10 h-10 rounded-full border-3 border-gray-900 flex items-center justify-center font-bold transition-all ${
                        draftPage === page
                          ? "bg-gray-900 text-sky-100"
                          : "bg-sky-100 text-gray-900 hover:bg-sky-200 shadow-[3px_3px_0px_0px_rgba(17,24,39,1)] hover:shadow-[4px_4px_0px_0px_rgba(17,24,39,1)]"
                      }`}
                    >
                      {page}
                    </button>
                  ))}

                  {/* Down Button */}
                  <button
                    onClick={() =>
                      setDraftPage((p) => Math.min(totalDraftPages, p + 1))
                    }
                    disabled={
                      draftPage === totalDraftPages || totalDraftPages <= 1
                    }
                    className={`w-10 h-10 rounded-full border-3 border-gray-900 flex items-center justify-center transition-all ${
                      draftPage === totalDraftPages || totalDraftPages <= 1
                        ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                        : "bg-sky-100 text-gray-900 hover:bg-sky-200 shadow-[3px_3px_0px_0px_rgba(17,24,39,1)] hover:shadow-[4px_4px_0px_0px_rgba(17,24,39,1)]"
                    }`}
                  >
                    <span className="material-icons-outlined text-lg">
                      expand_more
                    </span>
                  </button>
                </div>
              )}
              {loadingDrafts ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {[...Array(3)].map((_, i) => (
                    <div
                      key={i}
                      className="bg-sky-200 border-3 border-gray-900 rounded-2xl shadow-[4px_4px_0px_0px_rgba(17,24,39,1)] overflow-hidden animate-pulse"
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
              ) : (
                <>
                  <Masonry
                    items={paginatedDrafts.map((draft): MasonryItem => {
                      const hasDescription =
                        draft.description && draft.description.length > 0;

                      return {
                        id: draft.id,
                        height: hasDescription ? 240 : 200,
                        content: (
                          <div
                            onClick={() => handleContinueDraft(draft.id)}
                            className="cursor-pointer h-full group"
                          >
                            <TiltedCard
                              altText={draft.title || "Untitled Draft"}
                              captionText={`${draft.totalQuestions} questions`}
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
                                <div className="bg-sky-200 border-3 border-gray-900 rounded-2xl relative w-full h-full overflow-hidden flex flex-col shadow-[4px_4px_0px_0px_rgba(17,24,39,1)] group/draft">
                                  {/* macOS Traffic Lights */}
                                  <div className="absolute top-3 left-3 flex gap-1.5 z-10">
                                    <div className="w-4 h-4 bg-red-500 rounded-full border-2 border-black"></div>
                                    <div className="w-4 h-4 bg-yellow-500 rounded-full border-2 border-black"></div>
                                    <div className="w-4 h-4 bg-green-500 rounded-full border-2 border-black"></div>
                                  </div>
                                  {/* Header Right - Draft badge & Question Count */}
                                  <div className="absolute top-2 right-3 flex items-center gap-2 z-10">
                                    <div className="flex items-center gap-1 px-2 py-0.5 bg-sky-300 border-2 border-black rounded-full">
                                      <span className="material-icons-outlined text-black text-xs">
                                        edit_note
                                      </span>
                                      <span className="font-bold text-black text-xs">
                                        Draft
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1 px-2 py-0.5 bg-sky-300 border-2 border-black rounded-full">
                                      <span className="material-icons-outlined text-black text-xs">
                                        help_outline
                                      </span>
                                      <span className="font-bold text-black text-xs">
                                        {draft.totalQuestions}
                                      </span>
                                    </div>
                                  </div>
                                  {/* Separator Line */}
                                  <div className="absolute top-11 left-0 right-0 h-0.5 bg-black z-10"></div>

                                  {/* Content */}
                                  <div className="pt-14 px-4 pb-2 text-left flex-1">
                                    <h3 className="text-base font-black text-gray-900 mb-1">
                                      {draft.title || "Untitled Draft"}
                                    </h3>
                                    {draft.description && (
                                      <p
                                        className="text-sm font-medium text-gray-700 line-clamp-2"
                                        style={{
                                          fontFamily:
                                            "'Google Sans Mono', monospace",
                                        }}
                                      >
                                        {draft.description}
                                      </p>
                                    )}
                                  </div>

                                  {/* Last Updated */}
                                  <div className="px-4 pb-3">
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="text-xs font-bold text-gray-600">
                                        Last edited
                                      </span>
                                      <span className="text-xs font-bold text-gray-900">
                                        {formatTimeAgo(draft.updatedAt)}
                                      </span>
                                    </div>
                                    <div className="h-2 bg-sky-300 rounded-full border border-black overflow-hidden">
                                      <div className="h-full bg-sky-500 w-full"></div>
                                    </div>
                                  </div>

                                  {/* Hover Overlay */}
                                  <div className="absolute inset-0 bg-gradient-to-t from-sky-300/95 via-sky-200/80 to-sky-100/60 opacity-0 group-hover/draft:opacity-100 transition-opacity duration-300 rounded-2xl flex items-end justify-end p-4 z-20">
                                    <button
                                      className="px-4 py-2 bg-sky-100 border-3 border-black rounded-full flex items-center justify-center gap-2 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 transition-all transform translate-y-4 group-hover/draft:translate-y-0"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleContinueDraft(draft.id);
                                      }}
                                    >
                                      <span className="material-icons-outlined text-black text-lg">
                                        edit
                                      </span>
                                      <span className="font-bold text-black text-sm">
                                        Continue
                                      </span>
                                    </button>
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
                    animationKey={`drafts-${draftPage}-${showDrafts}`}
                  />

                  {/* Mobile Drafts Pagination */}
                  {filteredDrafts.length > 0 && (
                    <div className="flex flex-col items-center gap-2 mt-8 xl:hidden">
                      <div className="flex items-center gap-2">
                        {/* Previous Button */}
                        <button
                          onClick={() =>
                            setDraftPage((p) => Math.max(1, p - 1))
                          }
                          disabled={draftPage === 1}
                          className={`w-10 h-10 rounded-full border-3 border-gray-900 flex items-center justify-center transition-all ${
                            draftPage === 1
                              ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                              : "bg-sky-100 text-gray-900 hover:bg-sky-200 shadow-[3px_3px_0px_0px_rgba(17,24,39,1)] hover:shadow-[4px_4px_0px_0px_rgba(17,24,39,1)]"
                          }`}
                        >
                          <span className="material-icons-outlined text-lg">
                            chevron_left
                          </span>
                        </button>

                        {/* Page Numbers */}
                        {Array.from(
                          { length: Math.max(1, totalDraftPages) },
                          (_, i) => i + 1
                        ).map((page) => (
                          <button
                            key={page}
                            onClick={() => setDraftPage(page)}
                            className={`w-10 h-10 rounded-full border-3 border-gray-900 flex items-center justify-center font-bold transition-all ${
                              draftPage === page
                                ? "bg-gray-900 text-sky-100"
                                : "bg-sky-100 text-gray-900 hover:bg-sky-200 shadow-[3px_3px_0px_0px_rgba(17,24,39,1)] hover:shadow-[4px_4px_0px_0px_rgba(17,24,39,1)]"
                            }`}
                          >
                            {page}
                          </button>
                        ))}

                        {/* Next Button */}
                        <button
                          onClick={() =>
                            setDraftPage((p) =>
                              Math.min(totalDraftPages, p + 1)
                            )
                          }
                          disabled={
                            draftPage === totalDraftPages ||
                            totalDraftPages <= 1
                          }
                          className={`w-10 h-10 rounded-full border-3 border-gray-900 flex items-center justify-center transition-all ${
                            draftPage === totalDraftPages ||
                            totalDraftPages <= 1
                              ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                              : "bg-sky-100 text-gray-900 hover:bg-sky-200 shadow-[3px_3px_0px_0px_rgba(17,24,39,1)] hover:shadow-[4px_4px_0px_0px_rgba(17,24,39,1)]"
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
          )}
        </div>
      )}

      {/* Quiz Cards */}
      <div className="w-full max-w-6xl px-4 mt-8">
        <div className="relative">
          {/* Vertical Pagination - Left Side (aligned with header) */}
          {!loading && filteredQuizzes.length > 0 && showQuizzes && (
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
                      ? "bg-gray-900 text-amber-100"
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

          {/* Quizzes Header */}
          <div className="mb-4">
            <button
              onClick={() => setShowQuizzes(!showQuizzes)}
              className="flex items-center gap-2 text-gray-900 hover:text-gray-700 transition-colors"
            >
              <span className="material-icons-outlined text-lg">
                {showQuizzes ? "expand_more" : "chevron_right"}
              </span>
              <h2 className="text-lg font-black">My Quizzes</h2>
              <span className="px-2 py-0.5 bg-amber-200 border-2 border-gray-900 rounded-full text-xs font-bold">
                {filteredQuizzes.length}
              </span>
            </button>
            <p className="text-sm text-gray-600 mt-1 ml-7">
              Published quizzes ready for your students
            </p>
          </div>

          {showQuizzes && (
            <div>
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
                        <div className="h-4 bg-gray-200 rounded-full border-2 border-gray-900 w-full"></div>
                        <div className="h-4 bg-gray-200 rounded-full border-2 border-gray-900 w-2/3"></div>
                      </div>
                      <div className="px-4 pb-3 mt-auto">
                        <div className="h-2 bg-gray-200 rounded-full border border-gray-900 w-full"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : error ? (
                <div className="bg-red-400 border-4 border-gray-900 rounded-2xl p-8 shadow-[4px_4px_0px_0px_rgba(31,41,55,1)] flex flex-col items-center justify-center gap-4">
                  <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center border-3 border-gray-900">
                    <span className="material-icons-outlined text-red-500 text-3xl">
                      error
                    </span>
                  </div>
                  <p className="text-lg font-bold text-gray-900">{error}</p>
                  <button
                    onClick={() => window.location.reload()}
                    className="px-6 py-3 bg-white text-gray-900 font-bold border-3 border-gray-900 rounded-full shadow-[3px_3px_0px_0px_rgba(31,41,55,1)] hover:shadow-[4px_4px_0px_0px_rgba(31,41,55,1)] transition-all"
                  >
                    Retry
                  </button>
                </div>
              ) : filteredQuizzes.length === 0 ? (
                <div className="bg-amber-200 border-4 border-gray-900 rounded-2xl p-12 shadow-[4px_4px_0px_0px_rgba(31,41,55,1)] flex flex-col items-center justify-center gap-4">
                  <div className="w-20 h-20 bg-cyan-400 rounded-full flex items-center justify-center border-3 border-gray-900">
                    <span className="material-icons-outlined text-gray-900 text-4xl">
                      quiz
                    </span>
                  </div>
                  <p className="text-xl font-black text-gray-900 text-center">
                    {searchQuery ? "No quizzes found" : "No quizzes yet"}
                  </p>
                  <p className="text-base font-medium text-gray-700 text-center">
                    {searchQuery
                      ? "Try adjusting your search or filters."
                      : "Create your first quiz to get started!"}
                  </p>
                  {!searchQuery && (
                    <button
                      onClick={goToCreate}
                      className="mt-2 px-5 py-3 bg-amber-100 text-gray-900 font-bold border-3 border-gray-900 rounded-full shadow-[4px_4px_0px_0px_rgba(31,41,55,1)] hover:shadow-[5px_5px_0px_0px_rgba(31,41,55,1)] transition-all flex items-center gap-2"
                    >
                      <span className="w-6 h-6 bg-gray-900 rounded-full flex items-center justify-center">
                        <span className="material-icons-outlined text-amber-100 text-sm">
                          add
                        </span>
                      </span>
                      <span>Create Quiz</span>
                    </button>
                  )}
                </div>
              ) : (
                <>
                  <Masonry
                    items={paginatedQuizzes.map((quiz): MasonryItem => {
                      const hasDescription =
                        quiz.description && quiz.description.length > 0;
                      const deadlineProgress = getDeadlineProgress(
                        quiz.createdAt,
                        quiz.deadline
                      );
                      const timeRemaining = getTimeRemainingText(
                        quiz.createdAt,
                        quiz.deadline
                      );
                      const progressBarColor =
                        deadlineProgress > 50
                          ? "bg-green-500"
                          : deadlineProgress > 20
                            ? "bg-yellow-500"
                            : "bg-red-500";

                      return {
                        id: quiz.id,
                        height: hasDescription ? 240 : 200,
                        content: (
                          <div
                            onClick={() => goToDetail(quiz.id)}
                            className="cursor-pointer h-full group"
                          >
                            <TiltedCard
                              altText={quiz.title}
                              captionText={`${quiz.totalQuestions} questions`}
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
                                <div className="bg-amber-100 border-3 border-gray-900 rounded-2xl relative w-full h-full overflow-hidden flex flex-col shadow-[4px_4px_0px_0px_rgba(17,24,39,1)]">
                                  {/* macOS Traffic Lights */}
                                  <div className="absolute top-3 left-3 flex gap-1.5 z-10">
                                    <div className="w-4 h-4 bg-red-500 rounded-full border-2 border-black"></div>
                                    <div className="w-4 h-4 bg-yellow-500 rounded-full border-2 border-black"></div>
                                    <div className="w-4 h-4 bg-green-500 rounded-full border-2 border-black"></div>
                                  </div>
                                  {/* Header Right - Duration & Question Count */}
                                  <div className="absolute top-2 right-3 flex items-center gap-2 z-10">
                                    <div className="flex items-center gap-1 px-2 py-0.5 bg-amber-200 border-2 border-black rounded-full">
                                      <span className="material-icons-outlined text-black text-xs">
                                        schedule
                                      </span>
                                      <span className="font-bold text-black text-xs">
                                        {quiz.duration
                                          ? `${quiz.duration}m`
                                          : "∞"}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1 px-2 py-0.5 bg-amber-200 border-2 border-black rounded-full">
                                      <span className="material-icons-outlined text-black text-xs">
                                        help_outline
                                      </span>
                                      <span className="font-bold text-black text-xs">
                                        {quiz.totalQuestions}
                                      </span>
                                    </div>
                                  </div>
                                  {/* Separator Line */}
                                  <div className="absolute top-11 left-0 right-0 h-0.5 bg-black z-10"></div>

                                  {/* Content */}
                                  <div className="pt-14 px-4 pb-2 text-left flex-1">
                                    <h3 className="text-base font-black text-gray-900 mb-1">
                                      {quiz.title}
                                    </h3>
                                    {quiz.description && (
                                      <p
                                        className="text-sm font-medium text-gray-700 line-clamp-2"
                                        style={{
                                          fontFamily:
                                            "'Google Sans Mono', monospace",
                                        }}
                                      >
                                        {quiz.description}
                                      </p>
                                    )}
                                  </div>

                                  {/* Deadline Progress Bar */}
                                  <div className="px-4 pb-3">
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="text-xs font-bold text-gray-600">
                                        Deadline
                                      </span>
                                      <span className="text-xs font-bold text-gray-900">
                                        {timeRemaining}
                                      </span>
                                    </div>
                                    <div className="h-2 bg-gray-200 rounded-full border border-black overflow-hidden">
                                      <div
                                        className={`h-full ${progressBarColor} transition-all duration-300`}
                                        style={{
                                          width: `${deadlineProgress}%`,
                                        }}
                                      ></div>
                                    </div>
                                  </div>

                                  {/* Hover Overlay */}
                                  <div className="absolute inset-0 bg-gradient-to-t from-amber-100/95 via-amber-50/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl flex items-end justify-end p-4 z-20">
                                    <div className="flex gap-2 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                                      {/* View Button */}
                                      <button
                                        className="w-11 h-11 bg-amber-100 border-3 border-black rounded-full flex items-center justify-center shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 transition-all"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          goToDetail(quiz.id);
                                        }}
                                        title="View"
                                      >
                                        <span className="material-icons-outlined text-black text-lg">
                                          visibility
                                        </span>
                                      </button>
                                      {/* Edit Button */}
                                      <button
                                        className="w-11 h-11 bg-amber-100 border-3 border-black rounded-full flex items-center justify-center shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 transition-all"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleEditQuiz(quiz.id);
                                        }}
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
                                            quiz.id,
                                            quiz.title,
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
                    animationKey={`quizzes-${currentPage}-${showQuizzes}`}
                  />

                  {/* Mobile Pagination */}
                  {filteredQuizzes.length > 0 && totalPages > 1 && (
                    <div className="flex flex-col items-center gap-2 mt-8 xl:hidden">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() =>
                            setCurrentPage((p) => Math.max(1, p - 1))
                          }
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

                        {Array.from(
                          { length: totalPages },
                          (_, i) => i + 1
                        ).map((page) => (
                          <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            className={`w-10 h-10 rounded-full border-3 border-gray-900 flex items-center justify-center font-bold transition-all ${
                              currentPage === page
                                ? "bg-gray-900 text-amber-100"
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
          )}
        </div>
      </div>
    </div>
  );
}
