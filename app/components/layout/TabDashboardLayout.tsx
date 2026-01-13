"use client";

import { useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useEffect } from "react";
import TabNavigation from "../navigation/TabNavigation";
import PDFUploadModal from "../create/PDFUploadModal";
import { useNavigationBadges } from "@/app/hooks/useNavigationBadges";
import { TabProvider, DashboardTab, TeacherTab, StudentTab } from "../dashboard/TabContext";

interface TabDashboardLayoutProps {
  title: string;
  userEmail?: string;
  userRole: "teacher" | "student";
  children: React.ReactNode;
  initialTab?: DashboardTab;
}

function TabDashboardLayoutInner({
  title,
  userEmail,
  userRole,
  children,
}: Omit<TabDashboardLayoutProps, "initialTab">) {
  const { badges } = useNavigationBadges(userRole);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [idToken, setIdToken] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        try {
          const token = await currentUser.getIdToken();
          setIdToken(token);
        } catch (error) {
          console.error("Error getting token:", error);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    setMousePos({ x: e.clientX, y: e.clientY });
  }, []);

  const handleAIClick = () => {
    setIsAIModalOpen(true);
  };

  const handleAISave = async (quiz: any) => {
    if (!idToken) return;
    
    try {
      const quizData = {
        title: quiz.title.trim(),
        description: quiz.description.trim(),
        isActive: true,
        questions: quiz.questions.map((q: any) => {
          const questionData: any = {
            question: q.question.trim(),
            type: q.type,
            answer: q.answer.trim(),
          };
          if (q.type === "multiple_choice" && q.choices && Array.isArray(q.choices)) {
            const filteredChoices = q.choices
              .filter((c: string) => c.trim().length > 0)
              .map((c: string) => c.trim());
            if (filteredChoices.length > 0) {
              questionData.choices = filteredChoices;
            }
          }
          return questionData;
        }),
      };

      const { apiPost } = await import("../../lib/api");
      const response = await apiPost("/api/quizzes", {
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(quizData),
        idToken,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create quiz");
      }

      alert("Quiz created successfully!");
      setIsAIModalOpen(false);
      window.location.href = `/teacher?tab=quizzes&quizView=detail&quizId=${data.id}`;
    } catch (error) {
      console.error("Error creating quiz:", error);
      alert(error instanceof Error ? error.message : "Failed to create quiz. Please try again.");
    }
  };

  return (
    <div 
      className="min-h-screen pb-28 relative"
      onMouseMove={handleMouseMove}
      style={{
        backgroundImage: `
          radial-gradient(circle 150px at ${mousePos.x}px ${mousePos.y}px, rgba(251,191,36,0.3), transparent),
          linear-gradient(to right, rgba(17,24,39,0.08) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(17,24,39,0.08) 1px, transparent 1px),
          linear-gradient(to bottom right, rgb(254 243 199), rgb(253 230 138))
        `,
        backgroundSize: "100% 100%, 48px 48px, 48px 48px, 100% 100%",
        backgroundAttachment: "fixed, scroll, scroll, fixed",
      }}
    >
      {/* Corner Plus Signs */}
      <div className="absolute top-8 left-8 w-16 h-16 flex items-center justify-center z-20">
        <span className="text-gray-900 text-8xl font-black">+</span>
      </div>
      <div className="absolute top-8 right-8 w-16 h-16 flex items-center justify-center z-20">
        <span className="text-gray-900 text-8xl font-black">+</span>
      </div>
      
      {/* Main Content */}
      <main className="relative z-10 container mx-auto px-6 py-8">{children}</main>
      
      <TabNavigation userRole={userRole} badges={badges} onAIClick={handleAIClick} />

      {/* AI PDF Upload Modal */}
      {idToken && (
        <PDFUploadModal
          isOpen={isAIModalOpen}
          onClose={() => setIsAIModalOpen(false)}
          onSave={handleAISave}
          onEdit={handleAISave}
          idToken={idToken}
        />
      )}
    </div>
  );
}

export default function TabDashboardLayout({
  title,
  userEmail,
  userRole,
  children,
  initialTab = "home",
}: TabDashboardLayoutProps) {
  const searchParams = useSearchParams();
  const tabFromUrl = searchParams.get("tab");
  
  // Validate and use tab from URL if valid
  let effectiveInitialTab: DashboardTab = initialTab;
  
  if (tabFromUrl) {
    const validTeacherTabs: TeacherTab[] = ["home", "quizzes", "sections", "profile"];
    const validStudentTabs: StudentTab[] = ["home", "quizzes", "flashcards", "history", "connections", "profile"];
    
    if (userRole === "teacher" && validTeacherTabs.includes(tabFromUrl as TeacherTab)) {
      effectiveInitialTab = tabFromUrl as TeacherTab;
    } else if (userRole === "student" && validStudentTabs.includes(tabFromUrl as StudentTab)) {
      effectiveInitialTab = tabFromUrl as StudentTab;
    }
  }

  return (
    <TabProvider initialTab={effectiveInitialTab} initialRole={userRole}>
      <TabDashboardLayoutInner
        title={title}
        userEmail={userEmail}
        userRole={userRole}
      >
        {children}
      </TabDashboardLayoutInner>
    </TabProvider>
  );
}
