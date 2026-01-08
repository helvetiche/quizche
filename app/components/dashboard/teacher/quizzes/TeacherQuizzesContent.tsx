"use client";

import { useMemo } from "react";
import { QuizViewProvider, useQuizView, QuizView } from "./QuizViewContext";
import QuizListView from "./QuizListView";
import QuizCreateView from "./QuizCreateView";
import QuizDetailView from "./QuizDetailView";
import QuizEditView from "./QuizEditView";
import QuizSettingsView from "./QuizSettingsView";
import QuizResultsView from "./QuizResultsView";
import QuizLiveView from "./QuizLiveView";

interface TeacherQuizzesContentInnerProps {}

function TeacherQuizzesContentInner({}: TeacherQuizzesContentInnerProps) {
  const { currentView } = useQuizView();

  const content = useMemo(() => {
    switch (currentView.type) {
      case "list":
        return <QuizListView />;
      case "create":
        return <QuizCreateView />;
      case "detail":
        return <QuizDetailView quizId={currentView.quizId} />;
      case "edit":
        return <QuizEditView quizId={currentView.quizId} />;
      case "settings":
        return <QuizSettingsView quizId={currentView.quizId} />;
      case "results":
        return <QuizResultsView quizId={currentView.quizId} />;
      case "live":
        return <QuizLiveView quizId={currentView.quizId} />;
      default:
        return <QuizListView />;
    }
  }, [currentView]);

  return (
    <div className="transition-opacity duration-200 ease-in-out">
      {content}
    </div>
  );
}

interface TeacherQuizzesContentProps {
  initialView?: QuizView;
}

export default function TeacherQuizzesContent({ initialView }: TeacherQuizzesContentProps) {
  return (
    <QuizViewProvider initialView={initialView}>
      <TeacherQuizzesContentInner />
    </QuizViewProvider>
  );
}
