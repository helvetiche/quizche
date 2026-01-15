"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";

export type TeacherTab = "home" | "quizzes" | "sections";
export type StudentTab = "home" | "quizzes" | "flashcards" | "history" | "connections";
export type DashboardTab = TeacherTab | StudentTab;

interface TabContextType {
  activeTab: DashboardTab;
  setActiveTab: (tab: DashboardTab) => void;
  userRole: "teacher" | "student" | null;
  setUserRole: (role: "teacher" | "student" | null) => void;
}

const TabContext = createContext<TabContextType | undefined>(undefined);

interface TabProviderProps {
  children: ReactNode;
  initialTab?: DashboardTab;
  initialRole?: "teacher" | "student" | null;
}

export function TabProvider({ children, initialTab = "home", initialRole = null }: TabProviderProps) {
  const [activeTab, setActiveTabState] = useState<DashboardTab>(initialTab);
  const [userRole, setUserRole] = useState<"teacher" | "student" | null>(initialRole);

  const setActiveTab = useCallback((tab: DashboardTab) => {
    // Validate tab based on role to prevent unauthorized access
    if (userRole === "teacher") {
      const validTeacherTabs: TeacherTab[] = ["home", "quizzes", "sections"];
      if (!validTeacherTabs.includes(tab as TeacherTab)) {
        console.warn(`Invalid tab "${tab}" for teacher role`);
        return;
      }
    } else if (userRole === "student") {
      const validStudentTabs: StudentTab[] = ["home", "quizzes", "flashcards", "history", "connections"];
      if (!validStudentTabs.includes(tab as StudentTab)) {
        console.warn(`Invalid tab "${tab}" for student role`);
        return;
      }
    }
    setActiveTabState(tab);
  }, [userRole]);

  return (
    <TabContext.Provider value={{ activeTab, setActiveTab, userRole, setUserRole }}>
      {children}
    </TabContext.Provider>
  );
}

export function useTabContext() {
  const context = useContext(TabContext);
  if (context === undefined) {
    throw new Error("useTabContext must be used within a TabProvider");
  }
  return context;
}
