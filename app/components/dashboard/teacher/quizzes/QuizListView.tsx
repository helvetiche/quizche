/* eslint-disable @typescript-eslint/no-misused-promises */
/* eslint-disable @typescript-eslint/strict-boolean-expressions, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unnecessary-condition, @typescript-eslint/prefer-nullish-coalescing, @typescript-eslint/explicit-function-return-type, @typescript-eslint/no-floating-promises */
"use client";

import { useState, useEffect } from "react";
import type { ReactElement } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useQuizView } from "./QuizViewContext";
import QuizListHeader from "./quiz-list/QuizListHeader";
import QuizListDrafts from "./quiz-list/QuizListDrafts";
import QuizListQuizzes from "./quiz-list/QuizListQuizzes";
import QuizDeleteModal from "./quiz-list/QuizDeleteModal";
import type { Quiz, Draft, FilterOption } from "./quiz-list/types";

export default function QuizListView(): ReactElement {
  const router = useRouter();
  const { goToDetail } = useQuizView();
  const [idToken, setIdToken] = useState<string | null>(null);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingDrafts, setLoadingDrafts] = useState(true);
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

  const filters: FilterOption[] = [
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
    const fetchQuizzes = async (): Promise<void> => {
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

        setQuizzes(data.quizzes ?? []);
      } catch (err) {
        console.error("Error fetching quizzes:", err);
        setError(err instanceof Error ? err.message : "Failed to load quizzes");
      } finally {
        setLoading(false);
      }
    };

    const fetchDrafts = async (): Promise<void> => {
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

        setDrafts(data.drafts ?? []);
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

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeFilter]);

  // Filter drafts based on search
  const filteredDrafts = drafts.filter((draft) => {
    return (
      draft.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      draft.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  // Drafts pagination
  const totalDraftPages = Math.ceil(filteredDrafts.length / itemsPerPage);

  // Reset draft page when search changes
  useEffect(() => {
    setDraftPage(1);
  }, [searchQuery]);

  const handleSearch = (e: React.FormEvent): void => {
    e.preventDefault();
  };

  const handleContinueDraft = (draftId: string): void => {
    router.push(`/teacher/composer?draft=${draftId}`);
  };

  const handleEditQuiz = (quizId: string): void => {
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

  const handleDeleteConfirm = async (): Promise<void> => {
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

  const handleDeleteCancel = (): void => {
    setDeleteModal({ isOpen: false, quizId: "", quizTitle: "" });
  };

  return (
    <div className="flex flex-col items-center min-h-[60vh] relative">
      <QuizListHeader
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        showFilters={showFilters}
        setShowFilters={setShowFilters}
        activeFilter={activeFilter}
        setActiveFilter={setActiveFilter}
        filters={filters}
        onSearch={handleSearch}
      />

      <QuizListDrafts
        drafts={filteredDrafts}
        loading={loadingDrafts}
        showDrafts={showDrafts}
        setShowDrafts={setShowDrafts}
        draftPage={draftPage}
        setDraftPage={setDraftPage}
        itemsPerPage={itemsPerPage}
        totalDraftPages={totalDraftPages}
        onContinueDraft={handleContinueDraft}
      />

      <QuizListQuizzes
        quizzes={filteredQuizzes}
        loading={loading}
        error={error}
        showQuizzes={showQuizzes}
        setShowQuizzes={setShowQuizzes}
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        itemsPerPage={itemsPerPage}
        totalPages={totalPages}
        searchQuery={searchQuery}
        onEditQuiz={handleEditQuiz}
        onDeleteQuiz={handleDeleteClick}
        onGoToDetail={goToDetail}
        onGoToCreate={goToCreate}
      />

      <QuizDeleteModal
        isOpen={deleteModal.isOpen}
        quizTitle={deleteModal.quizTitle}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
        isDeleting={isDeleting}
      />
    </div>
  );
}
