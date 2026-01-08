"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";

export type QuizView = 
  | { type: "list" }
  | { type: "create" }
  | { type: "detail"; quizId: string }
  | { type: "edit"; quizId: string }
  | { type: "settings"; quizId: string }
  | { type: "results"; quizId: string }
  | { type: "live"; quizId: string };

interface QuizViewContextType {
  currentView: QuizView;
  setView: (view: QuizView) => void;
  goToList: () => void;
  goToCreate: () => void;
  goToDetail: (quizId: string) => void;
  goToEdit: (quizId: string) => void;
  goToSettings: (quizId: string) => void;
  goToResults: (quizId: string) => void;
  goToLive: (quizId: string) => void;
}

const QuizViewContext = createContext<QuizViewContextType | undefined>(undefined);

interface QuizViewProviderProps {
  children: ReactNode;
  initialView?: QuizView;
}

export function QuizViewProvider({ children, initialView = { type: "list" } }: QuizViewProviderProps) {
  const [currentView, setCurrentView] = useState<QuizView>(initialView);

  const setView = useCallback((view: QuizView) => {
    // Validate quizId if present to prevent injection
    if ("quizId" in view && view.quizId) {
      // Only allow alphanumeric and common ID characters
      if (!/^[a-zA-Z0-9_-]+$/.test(view.quizId)) {
        console.warn("Invalid quizId format");
        return;
      }
    }
    setCurrentView(view);
  }, []);

  const goToList = useCallback(() => setView({ type: "list" }), [setView]);
  const goToCreate = useCallback(() => setView({ type: "create" }), [setView]);
  const goToDetail = useCallback((quizId: string) => setView({ type: "detail", quizId }), [setView]);
  const goToEdit = useCallback((quizId: string) => setView({ type: "edit", quizId }), [setView]);
  const goToSettings = useCallback((quizId: string) => setView({ type: "settings", quizId }), [setView]);
  const goToResults = useCallback((quizId: string) => setView({ type: "results", quizId }), [setView]);
  const goToLive = useCallback((quizId: string) => setView({ type: "live", quizId }), [setView]);

  return (
    <QuizViewContext.Provider value={{
      currentView,
      setView,
      goToList,
      goToCreate,
      goToDetail,
      goToEdit,
      goToSettings,
      goToResults,
      goToLive,
    }}>
      {children}
    </QuizViewContext.Provider>
  );
}

export function useQuizView() {
  const context = useContext(QuizViewContext);
  if (context === undefined) {
    throw new Error("useQuizView must be used within a QuizViewProvider");
  }
  return context;
}
