/* eslint-disable @typescript-eslint/explicit-function-return-type */

"use client";

import { useMemo } from "react";
import {
  QuizViewProvider,
  useQuizView,
  type QuizView,
} from "./QuizViewContext";
import QuizListView from "./QuizListView";
import QuizCreateView from "./QuizCreateView";
import QuizDetailView from "./QuizDetailView";
import QuizSettingsView from "./QuizSettingsView";
import QuizResultsView from "./QuizResultsView";
import QuizLiveView from "./QuizLiveView";

type TeacherQuizzesContentInnerProps = Record<string, never>;

function TeacherQuizzesContentInner(_props: TeacherQuizzesContentInnerProps) {
  const { currentView } = useQuizView();

  const content = useMemo(() => {
    switch (currentView.type) {
      case "list":
        return <QuizListView />;
      case "create":
        return <QuizCreateView />;
      case "detail":
        return <QuizDetailView quizId={currentView.quizId} />;
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
    <div className="transition-opacity duration-200 ease-in-out">{content}</div>
  );
}

type TeacherQuizzesContentProps = {
  initialView?: QuizView;
};

export default function TeacherQuizzesContent({
  initialView,
}: TeacherQuizzesContentProps) {
  return (
    <QuizViewProvider initialView={initialView}>
      <TeacherQuizzesContentInner />
    </QuizViewProvider>
  );
}
