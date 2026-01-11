"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import AuthGuard from "../components/auth/AuthGuard";
import TabDashboardLayout from "../components/layout/TabDashboardLayout";
import StudentDashboard from "../components/dashboard/StudentDashboard";
import { StudentTab } from "../components/dashboard/TabContext";
import Loading from "../components/ui/Loading";

function StudentPageContent() {
  const [user, setUser] = useState<any>(null);
  const searchParams = useSearchParams();
  
  // Parse tab from URL params
  const tab = searchParams.get("tab");
  
  // Validate and determine initial tab
  const validTabs: StudentTab[] = ["home", "quizzes", "flashcards", "history", "connections", "profile"];
  const initialTab = tab && validTabs.includes(tab as StudentTab) ? tab as StudentTab : "home";

  return (
    <AuthGuard requiredRole="student" onAuthSuccess={setUser}>
      <TabDashboardLayout
        title="QuizChe - Student Dashboard"
        userEmail={user?.email}
        userRole="student"
        initialTab={initialTab}
      >
        <StudentDashboard user={user} />
      </TabDashboardLayout>
    </AuthGuard>
  );
}

export default function StudentPage() {
  return (
    <Suspense fallback={<Loading />}>
      <StudentPageContent />
    </Suspense>
  );
}
