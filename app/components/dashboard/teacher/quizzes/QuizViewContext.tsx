"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";

export type QuizView =
  | { type: "list" }
  | { type: "create" }
  | { type: "detail"; quizId: string }
  | { type: "settings"; quizId: string }
  | { type: "results"; quizId: string }
  | { type: "live"; quizId: string };

type QuizViewContextType = {
  currentView: QuizView;
  setView: (view: QuizView) => void;
  goToList: () => void;
  goToCreate: () => void;
  goToDetail: (quizId: string) => void;
  goToSettings: (quizId: string) => void;
  goToResults: (quizId: string) => void;
  goToLive: (quizId: string) => void;
};

const QuizViewContext = createContext<QuizViewContextType | undefined>(
  undefined
);

type QuizViewProviderProps = {
  children: ReactNode;
  initialView?: QuizView;
};

export function QuizViewProvider({
  children,
  initialView = { type: "list" },
}: QuizViewProviderProps) {
  const [currentView, setCurrentView] = useState<QuizView>(initialView);
  const router = useRouter();

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

  // Navigation functions - use URL-based routing for standalone pages
  const goToList = useCallback(() => {
    router.push("/teacher?tab=quizzes");
  }, [router]);

  const goToCreate = useCallback(() => {
    router.push("/teacher/composer");
  }, [router]);

  const goToDetail = useCallback(
    (quizId: string) => {
      if (!/^[a-zA-Z0-9_-]+$/.test(quizId)) return;
      router.push(`/teacher/quiz/${quizId}`);
    },
    [router]
  );

  const goToSettings = useCallback(
    (quizId: string) => {
      if (!/^[a-zA-Z0-9_-]+$/.test(quizId)) return;
      router.push(`/teacher/quiz/${quizId}?view=settings`);
    },
    [router]
  );

  const goToResults = useCallback(
    (quizId: string) => {
      if (!/^[a-zA-Z0-9_-]+$/.test(quizId)) return;
      router.push(`/teacher/quiz/${quizId}?view=results`);
    },
    [router]
  );

  const goToLive = useCallback(
    (quizId: string) => {
      if (!/^[a-zA-Z0-9_-]+$/.test(quizId)) return;
      router.push(`/teacher/quiz/${quizId}?view=live`);
    },
    [router]
  );

  return (
    <QuizViewContext.Provider
      value={{
        currentView,
        setView,
        goToList,
        goToCreate,
        goToDetail,
        goToSettings,
        goToResults,
        goToLive,
      }}
    >
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
