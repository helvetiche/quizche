"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import AuthGuard from "../components/auth/AuthGuard";
import TabDashboardLayout from "../components/layout/TabDashboardLayout";
import TeacherDashboard from "../components/dashboard/TeacherDashboard";
import Loading from "../components/ui/Loading";

function TeacherPageContent() {
  const [user, setUser] = useState<any>(null);
  const searchParams = useSearchParams();

  // Parse tab and quiz view from URL params
  const tab = searchParams.get("tab");
  const quizView = searchParams.get("quizView");
  const quizId = searchParams.get("quizId");

  // Determine initial quiz view based on URL params
  let initialQuizView = undefined;
  if (quizView && quizId) {
    const validViews = ["detail", "settings", "results", "live"];
    if (validViews.includes(quizView) && /^[a-zA-Z0-9_-]+$/.test(quizId)) {
      initialQuizView = { type: quizView, quizId };
    }
  }
  // Note: "create" view is now handled by /teacher/composer page

  // Determine initial tab - if quizView is set, default to quizzes tab
  const initialTab =
    tab === "quizzes" || tab === "sections"
      ? tab
      : quizView
        ? "quizzes"
        : "home";

  return (
    <AuthGuard requiredRole="teacher" onAuthSuccess={setUser}>
      <TabDashboardLayout
        title="QuizChe - Teacher"
        userEmail={user?.email}
        userRole="teacher"
        initialTab={initialTab}
      >
        <TeacherDashboard user={user} initialQuizView={initialQuizView} />
      </TabDashboardLayout>
    </AuthGuard>
  );
}

export default function TeacherPage() {
  return (
    <Suspense fallback={<Loading />}>
      <TeacherPageContent />
    </Suspense>
  );
}
