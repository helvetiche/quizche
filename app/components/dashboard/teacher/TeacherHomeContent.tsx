/* eslint-disable @typescript-eslint/no-misused-promises */
 
"use client";

import type { ReactElement } from "react";
import { useTabContext } from "../TabContext";
import DeleteConfirmModal from "./home/modals/DeleteConfirmModal";
import HomeHeader from "./home/HomeHeader";
import QuizGrid from "./home/QuizGrid";
import { useTeacherHome } from "./home/hooks/useTeacherHome";
import type { FilterOption } from "./home/types";

type TeacherHomeContentProps = {
  userEmail?: string;
};

export default function TeacherHomeContent({
  userEmail,
}: TeacherHomeContentProps): ReactElement {
  const { setActiveTab } = useTabContext();
  const itemsPerPage = 6;

  // Suppress unused variable warning
  void userEmail;

  const {
    searchQuery,
    setSearchQuery,
    showFilters,
    setShowFilters,
    activeFilter,
    setActiveFilter,
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
  } = useTeacherHome();

  const filters: FilterOption[] = [
    { id: "all", label: "All", icon: "apps" },
    { id: "active", label: "Active", icon: "play_circle" },
    { id: "inactive", label: "Inactive", icon: "pause_circle" },
    { id: "recent", label: "Recent", icon: "schedule" },
  ];

  // Pagination
  const totalPages = Math.ceil(filteredQuizzes.length / itemsPerPage);

  const handleViewQuiz = (quizId: string): void => {
    window.location.href = `/teacher/quiz/${quizId}`;
  };

  const handleEditQuiz = (quizId: string): void => {
    window.location.href = `/teacher/composer?edit=${quizId}`;
  };

  const handleCreateQuiz = (): void => {
    setActiveTab("quizzes");
  };

  return (
    <div className="flex flex-col items-center min-h-[60vh] relative">
      <HomeHeader
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        showFilters={showFilters}
        setShowFilters={setShowFilters}
        activeFilter={activeFilter}
        setActiveFilter={setActiveFilter}
        filters={filters}
        onSearch={handleSearch}
      />

      <QuizGrid
        quizzes={filteredQuizzes}
        loading={loading}
        searchQuery={searchQuery}
        currentPage={currentPage}
        totalPages={totalPages}
        itemsPerPage={itemsPerPage}
        setCurrentPage={setCurrentPage}
        onView={handleViewQuiz}
        onEdit={handleEditQuiz}
        onDelete={handleDeleteClick}
        onCreate={handleCreateQuiz}
        setActiveTab={setActiveTab}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteModal.isOpen}
        quizTitle={deleteModal.quizTitle}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
        isDeleting={isDeleting}
      />
    </div>
  );
}
