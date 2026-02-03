"use client";

import { Suspense } from "react";
import { useRouter } from "next/navigation";
import PDFUploadModal from "@/app/components/create/PDFUploadModal";
import ComposerHeader from "@/app/components/dashboard/teacher/composer/ComposerHeader";
import ComposerSidebar from "@/app/components/dashboard/teacher/composer/ComposerSidebar";
import ComposerQuestionEditor from "@/app/components/dashboard/teacher/composer/ComposerQuestionEditor";
import ComposerPagination from "@/app/components/dashboard/teacher/composer/ComposerPagination";
import ComposerSettingsModal from "@/app/components/dashboard/teacher/composer/ComposerSettingsModal";
import { useComposer } from "@/app/components/dashboard/teacher/composer/useComposer";

function ComposerPageContent(): React.ReactNode {
  const router = useRouter();
  const {
    loading,
    savingDraft,
    draftId,
    showSettingsModal,
    showAIModal,
    settings,
    sidebarCollapsed,
    currentQuestionIndex,
    questions,
    initialLoading,
    loadingProgress,
    loadingDone,
    fadeOut,
    searchQuery,
    searchFilter,
    showExplanations,
    paginationRef,
    currentQuestion,
    editMode,
    idToken,
    duplicateIndices,
    setShowSettingsModal,
    setShowAIModal,
    setSidebarCollapsed,
    setCurrentQuestionIndex,
    setSearchQuery,
    setSearchFilter,
    setShowExplanations,
    handleSettingChange,
    handleAIGenerated,
    handleAddQuestion,
    handleDuplicateQuestion,
    handleRemoveQuestion,
    handleQuestionChange,
    handleChoiceChange,
    handleAddChoice,
    handleRemoveChoice,
    handleImageSelect,
    handleChoiceExplanationChange,
    handleExplanationChange,
    handleRemoveImage,
    handlePublish,
    handleSaveAsDraft,
    formatLastSaved,
    hasDuplicateChoices,
  } = useComposer();

  return (
    <div className="fixed inset-0 flex flex-col bg-amber-100">
      {/* INITIAL LOADING OVERLAY */}
      {initialLoading && (
        <div
          className={`fixed inset-0 bg-amber-100 z-[100] flex items-center justify-center transition-opacity duration-500 ${fadeOut ? "opacity-0" : "opacity-100"}`}
        >
          <div className="flex flex-col items-center gap-6 max-w-md w-full px-8">
            {/* Text */}
            <div className="text-center">
              <h2 className="text-2xl font-black text-gray-900 mb-2">
                {loadingDone ? "Done" : "Preparing things for you"}
              </h2>
              <p className="text-gray-600 font-medium">
                {loadingDone
                  ? "Your composer is ready"
                  : "Setting up your quiz composer..."}
              </p>
            </div>

            {/* Progress Bar */}
            <div className="w-full">
              <div
                className={`h-4 rounded-full border-2 border-gray-900 overflow-hidden shadow-[2px_2px_0px_0px_rgba(17,24,39,1)] transition-colors duration-300 ${loadingDone ? "bg-green-200" : "bg-amber-200"}`}
              >
                <div
                  className={`h-full transition-all duration-100 ease-out ${loadingDone ? "bg-green-500" : "bg-amber-400"}`}
                  style={{ width: `${loadingProgress}%` }}
                />
              </div>
              <p
                className={`text-center text-sm font-bold mt-2 transition-colors duration-300 ${loadingDone ? "text-green-700" : "text-gray-700"}`}
              >
                {loadingDone ? "Complete" : `${loadingProgress}%`}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TOP HEADER */}
      <ComposerHeader
        title={settings.title}
        description={settings.description}
        editMode={editMode}
        draftId={draftId}
        lastSavedText={formatLastSaved()}
        onBack={() => router.push("/teacher?tab=quizzes")}
      />

      {/* MAIN CONTENT */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT SIDEBAR */}
        <ComposerSidebar
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          onAddQuestion={handleAddQuestion}
          onDuplicateQuestion={handleDuplicateQuestion}
          onRemoveQuestion={handleRemoveQuestion}
          onShowAIModal={() => setShowAIModal(true)}
          onShowSettingsModal={() => setShowSettingsModal(true)}
          onSaveDraft={() => void handleSaveAsDraft()}
          onPublish={() => void handlePublish()}
          isSavingDraft={savingDraft}
          isLoading={loading}
          editMode={editMode}
          currentQuestionId={currentQuestion.id}
          questionCount={questions.length}
        />

        {/* MAIN CANVAS */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Canvas Area */}
          <ComposerQuestionEditor
            currentQuestion={currentQuestion}
            currentQuestionIndex={currentQuestionIndex}
            totalQuestions={questions.length}
            onQuestionChange={handleQuestionChange}
            onImageSelect={handleImageSelect}
            onRemoveImage={handleRemoveImage}
            onChoiceChange={handleChoiceChange}
            onAddChoice={handleAddChoice}
            onRemoveChoice={handleRemoveChoice}
            onChoiceExplanationChange={handleChoiceExplanationChange}
            onExplanationChange={handleExplanationChange}
            showExplanations={showExplanations}
            onToggleExplanations={() => setShowExplanations(!showExplanations)}
            hasDuplicateChoices={hasDuplicateChoices}
            duplicateIndices={duplicateIndices}
          />

          {/* BOTTOM PAGINATION */}
          <ComposerPagination
            questions={questions}
            currentQuestionIndex={currentQuestionIndex}
            onQuestionIndexChange={setCurrentQuestionIndex}
            onAddQuestion={handleAddQuestion}
            onRemoveQuestion={handleRemoveQuestion}
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
            searchFilter={searchFilter}
            onSearchFilterChange={setSearchFilter}
            paginationRef={paginationRef}
          />
        </main>
      </div>

      {/* AI GENERATION MODAL */}
      {idToken !== null && (
        <PDFUploadModal
          isOpen={showAIModal}
          onClose={() => setShowAIModal(false)}
          onEdit={handleAIGenerated}
          onSave={handleAIGenerated}
          idToken={idToken}
        />
      )}

      {/* SETTINGS MODAL */}
      <ComposerSettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        settings={settings}
        onSettingChange={handleSettingChange}
      />
    </div>
  );
}

export default function ComposerPage(): React.ReactNode {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ComposerPageContent />
    </Suspense>
  );
}
