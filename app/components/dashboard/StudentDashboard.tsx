"use client";

import { useMemo } from "react";
import { useTabContext, StudentTab } from "./TabContext";
import StudentHomeContent from "./student/StudentHomeContent";
import StudentQuizzesContent from "./student/StudentQuizzesContent";
import StudentFlashcardsContent from "./student/StudentFlashcardsContent";
import StudentHistoryContent from "./student/StudentHistoryContent";
import StudentConnectionsContent from "./student/StudentConnectionsContent";
import ProfileContent from "./shared/ProfileContent";

interface StudentDashboardProps {
  user: any;
}

export default function StudentDashboard({ user }: StudentDashboardProps) {
  const { activeTab } = useTabContext();

  // Memoize content to prevent unnecessary re-renders
  const content = useMemo(() => {
    const tab = activeTab as StudentTab;
    
    switch (tab) {
      case "home":
        return <StudentHomeContent user={user} />;
      case "quizzes":
        return <StudentQuizzesContent user={user} />;
      case "flashcards":
        return <StudentFlashcardsContent user={user} />;
      case "history":
        return <StudentHistoryContent user={user} />;
      case "connections":
        return <StudentConnectionsContent user={user} />;
      case "profile":
        return <ProfileContent />;
      default:
        return <StudentHomeContent user={user} />;
    }
  }, [activeTab, user]);

  return (
    <div className="transition-opacity duration-200 ease-in-out">
      {content}
    </div>
  );
}
