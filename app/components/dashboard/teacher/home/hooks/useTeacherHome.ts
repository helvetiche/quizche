/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import type { Quiz } from "../types";

export function useTeacherHome() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [idToken, setIdToken] = useState<string | null>(null);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
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
  const [currentPage, setCurrentPage] = useState(1);

  const handleSetSearchQuery = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
  };

  const handleSetActiveFilter = (filter: string) => {
    setActiveFilter(filter);
    setCurrentPage(1);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser !== null) {
        currentUser
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
    const fetchQuizzes = async (): Promise<void> => {
      if (idToken === null) return;

      try {
        setLoading(true);
        const response = await fetch("/api/quizzes", {
          headers: { Authorization: `Bearer ${idToken}` },
        });

        const data = (await response.json()) as { quizzes?: Quiz[] };

        if (response.ok) {
          setQuizzes(data.quizzes ?? []);
        }
      } catch (err) {
        console.error("Error fetching quizzes:", err);
      } finally {
        setLoading(false);
      }
    };

    void fetchQuizzes();
  }, [idToken]);

  // Filter quizzes based on search and filter
  const filteredQuizzes = quizzes.filter((quiz) => {
    const matchesSearch =
      quiz.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (quiz.description?.toLowerCase().includes(searchQuery.toLowerCase()) ??
        false);

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

  const handleDeleteClick = (
    quizId: string,
    quizTitle: string,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    setDeleteModal({ isOpen: true, quizId, quizTitle });
  };

  const handleDeleteConfirm = async (): Promise<void> => {
    if (idToken === null || deleteModal.quizId === "") return;

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

  const handleSearch = (e: React.FormEvent): void => {
    e.preventDefault();
    console.warn("Searching for:", searchQuery, "Filter:", activeFilter);
  };

  return {
    searchQuery,
    setSearchQuery: handleSetSearchQuery,
    showFilters,
    setShowFilters,
    activeFilter,
    setActiveFilter: handleSetActiveFilter,
    loading,
    filteredQuizzes,
    deleteModal,
    isDeleting,
    handleDeleteClick,
    handleDeleteConfirm,
    handleDeleteCancel,
    handleSearch,
    currentPage,
    setCurrentPage,
  };
}
