"use client";

import { useMemo } from "react";
import { useTabContext, type TeacherTab } from "./TabContext";
import TeacherHomeContent from "./teacher/TeacherHomeContent";
import TeacherQuizzesContent from "./teacher/quizzes/TeacherQuizzesContent";
import TeacherSectionsContent from "./teacher/TeacherSectionsContent";

type TeacherDashboardProps = {
  user: any;
  initialQuizView?: any;
};

export default function TeacherDashboard({
  user,
  initialQuizView,
}: TeacherDashboardProps) {
  const { activeTab } = useTabContext();

  // Memoize content to prevent unnecessary re-renders
  const content = useMemo(() => {
    const tab = activeTab as TeacherTab;

    switch (tab) {
      case "home":
        return <TeacherHomeContent userEmail={user?.email} />;
      case "quizzes":
        return <TeacherQuizzesContent initialView={initialQuizView} />;
      case "sections":
        return <TeacherSectionsContent />;
      default:
        return <TeacherHomeContent userEmail={user?.email} />;
    }
  }, [activeTab, user?.email, initialQuizView]);

  return (
    <div className="transition-opacity duration-200 ease-in-out">{content}</div>
  );
}
