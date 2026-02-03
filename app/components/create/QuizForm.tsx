"use client";

import QuizFormSidebar from "./quiz-form/QuizFormSidebar";
import QuizFormQuestionEditor from "./quiz-form/QuizFormQuestionEditor";
import QuizFormPagination from "./quiz-form/QuizFormPagination";
import { type GeneratedQuizData } from "./quiz-form/types";
import { useQuizForm } from "./quiz-form/useQuizForm";

type QuizFormProps = {
  idToken: string;
  quizId?: string;
  draftId?: string;
  initialData?: GeneratedQuizData;
  title?: string;
  description?: string;
  onOpenSettings?: () => void;
  onOpenAIGenerate?: () => void;
  onDraftSaved?: (draftId: string) => void;
};

const QuizForm = ({
  idToken,
  quizId,
  draftId: initialDraftId,
  initialData,
  title: propTitle,
  description: propDescription,
  onOpenSettings,
  onOpenAIGenerate,
  onDraftSaved,
}: QuizFormProps) => {
  const {
    loading,
    savingDraft,
    loadingQuiz,
    sidebarCollapsed,
    questions,
    showExplanations,
    currentQuestionIndex,
    currentQuestion,
    duplicateIndices,
    hasDuplicateChoices,
    setSidebarCollapsed,
    setCurrentQuestionIndex,
    setShowExplanations,
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
    handleSaveAsDraft,
    handleSubmit,
  } = useQuizForm({
    idToken,
    quizId,
    draftId: initialDraftId,
    initialData,
    title: propTitle,
    description: propDescription,
    onDraftSaved,
  });

  if (loadingQuiz) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-900">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
          <span className="font-bold text-white">Loading quiz...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex overflow-hidden">
      <QuizFormSidebar
        sidebarCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        onAddQuestion={handleAddQuestion}
        onOpenAIGenerate={onOpenAIGenerate}
        onOpenSettings={onOpenSettings}
        onDuplicateQuestion={handleDuplicateQuestion}
        onRemoveQuestion={handleRemoveQuestion}
        onSaveDraft={() => void handleSaveAsDraft()}
        onPublish={() => void handleSubmit()}
        savingDraft={savingDraft}
        loading={loading}
        quizId={quizId}
        questions={questions}
        currentQuestionId={currentQuestion?.id}
      />

      {/* MAIN CANVAS - Question Editor */}
      <div className="flex-1 flex flex-col bg-gradient-to-br from-gray-800 to-gray-900 overflow-hidden">
        <QuizFormQuestionEditor
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
        <QuizFormPagination
          questions={questions}
          currentQuestionIndex={currentQuestionIndex}
          onQuestionIndexChange={setCurrentQuestionIndex}
          onAddQuestion={handleAddQuestion}
        />
      </div>
    </div>
  );
};

export default QuizForm;
