"use client";

import { useState, Suspense, useMemo } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import AuthGuard from "../../../components/auth/AuthGuard";
import Loading from "../../../components/ui/Loading";
import { QuizViewProvider, useQuizView, QuizView } from "../../../components/dashboard/teacher/quizzes/QuizViewContext";
import QuizDetailView from "../../../components/dashboard/teacher/quizzes/QuizDetailView";
import QuizSettingsView from "../../../components/dashboard/teacher/quizzes/QuizSettingsView";
import QuizResultsView from "../../../components/dashboard/teacher/quizzes/QuizResultsView";
import QuizLiveView from "../../../components/dashboard/teacher/quizzes/QuizLiveView";

function QuizPageHeader({ userEmail, quizId }: { userEmail?: string; quizId: string }) {
  const router = useRouter();
  const { currentView } = useQuizView();

  const handleBack = () => {
    if (currentView.type === "detail") {
      router.push("/teacher?tab=quizzes");
    } else {
      router.push(`/teacher/quiz/${quizId}`);
    }
  };

  const getViewConfig = () => {
    switch (currentView.type) {
      case "settings": return { title: "Quiz Settings", icon: "settings", color: "bg-amber-400" };
      case "results": return { title: "Quiz Results", icon: "analytics", color: "bg-purple-400" };
      case "live": return { title: "Live Session", icon: "play_circle", color: "bg-red-500" };
      default: return { title: "Quiz Details", icon: "quiz", color: "bg-cyan-400" };
    }
  };

  const config = getViewConfig();

  return (
    <header className="sticky top-0 z-50 bg-amber-100 border-b-3 border-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left: Back + Title */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleBack}
              className="w-10 h-10 bg-amber-200 rounded-xl flex items-center justify-center border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(17,24,39,1)] hover:shadow-[3px_3px_0px_0px_rgba(17,24,39,1)] hover:-translate-y-0.5 active:shadow-[1px_1px_0px_0px_rgba(17,24,39,1)] active:translate-y-0.5 transition-all"
            >
              <span className="material-icons-outlined text-gray-900">arrow_back</span>
            </button>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 ${config.color} rounded-xl flex items-center justify-center border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(17,24,39,1)]`}>
                <span className="material-icons-outlined text-gray-900 text-xl">{config.icon}</span>
              </div>
              <div>
                <h1 className="text-lg font-black text-gray-900">{config.title}</h1>
                <p className="text-xs font-medium text-gray-600">Manage your assessment</p>
              </div>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push("/teacher?tab=quizzes")}
              className="hidden sm:flex items-center gap-2 px-3 py-2 bg-amber-200 text-gray-900 font-bold text-sm border-2 border-gray-900 rounded-xl shadow-[2px_2px_0px_0px_rgba(17,24,39,1)] hover:shadow-[3px_3px_0px_0px_rgba(17,24,39,1)] hover:-translate-y-0.5 transition-all"
            >
              <span className="material-icons-outlined text-base">home</span>
              <span>Dashboard</span>
            </button>
            <button
              onClick={() => router.push("/teacher/composer")}
              className="hidden sm:flex items-center gap-2 px-3 py-2 bg-lime-400 text-gray-900 font-bold text-sm border-2 border-gray-900 rounded-xl shadow-[2px_2px_0px_0px_rgba(17,24,39,1)] hover:shadow-[3px_3px_0px_0px_rgba(17,24,39,1)] hover:-translate-y-0.5 transition-all"
            >
              <span className="material-icons-outlined text-base">add</span>
              <span>New Quiz</span>
            </button>
            
            {/* Mobile buttons */}
            <button
              onClick={() => router.push("/teacher?tab=quizzes")}
              className="sm:hidden w-10 h-10 bg-amber-200 rounded-xl flex items-center justify-center border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(17,24,39,1)]"
            >
              <span className="material-icons-outlined text-gray-900">home</span>
            </button>
            <button
              onClick={() => router.push("/teacher/composer")}
              className="sm:hidden w-10 h-10 bg-lime-400 rounded-xl flex items-center justify-center border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(17,24,39,1)]"
            >
              <span className="material-icons-outlined text-gray-900">add</span>
            </button>

            {/* User Avatar */}
            {userEmail && (
              <div className="w-10 h-10 bg-cyan-400 rounded-full flex items-center justify-center border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(17,24,39,1)]">
                <span className="font-black text-gray-900 text-sm">
                  {userEmail.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

function QuizPageContent({ quizId }: { quizId: string }) {
  const { currentView } = useQuizView();

  const content = useMemo(() => {
    switch (currentView.type) {
      case "detail":
        return <QuizDetailView quizId={quizId} />;
      case "settings":
        return <QuizSettingsView quizId={quizId} />;
      case "results":
        return <QuizResultsView quizId={quizId} />;
      case "live":
        return <QuizLiveView quizId={quizId} />;
      default:
        return <QuizDetailView quizId={quizId} />;
    }
  }, [currentView, quizId]);

  // QuizDetailView is a full-page fixed component, render it directly
  if (currentView.type === "detail") {
    return content;
  }

  return (
    <main className="flex-1 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {content}
      </div>
    </main>
  );
}


function QuizPageContentWrapper({ user, quizId }: { user: any; quizId: string }) {
  const { currentView } = useQuizView();

  // QuizDetailView is a full-page fixed component, render it directly without wrapper
  if (currentView.type === "detail") {
    return <QuizDetailView quizId={quizId} />;
  }

  // Other views use the standard layout with header
  return (
    <div className="min-h-screen bg-amber-50 flex flex-col">
      <QuizPageHeader userEmail={user?.email} quizId={quizId} />
      <QuizPageContent quizId={quizId} />
    </div>
  );
}

function QuizPageInner({ user, quizId }: { user: any; quizId: string }) {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Parse view from URL params (e.g., ?view=settings)
  const view = searchParams.get("view");

  // Determine initial view based on URL params
  let initialView: QuizView = { type: "detail", quizId };
  if (view) {
    const validViews = ["detail", "settings", "results", "live"];
    if (validViews.includes(view)) {
      initialView = { type: view as "detail" | "settings" | "results" | "live", quizId };
    }
  }

  // Validate quizId format
  if (!/^[a-zA-Z0-9_-]+$/.test(quizId)) {
    router.replace("/teacher?tab=quizzes");
    return <Loading />;
  }

  return (
    <QuizViewProvider initialView={initialView}>
      <QuizPageContentWrapper user={user} quizId={quizId} />
    </QuizViewProvider>
  );
}

function QuizPageWrapper() {
  const [user, setUser] = useState<any>(null);
  const params = useParams();
  const quizId = params.id as string;

  return (
    <AuthGuard requiredRole="teacher" onAuthSuccess={setUser}>
      <QuizPageInner user={user} quizId={quizId} />
    </AuthGuard>
  );
}

export default function QuizPage() {
  return (
    <Suspense fallback={<Loading />}>
      <QuizPageWrapper />
    </Suspense>
  );
}
