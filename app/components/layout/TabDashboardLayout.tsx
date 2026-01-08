"use client";

import { useSearchParams } from "next/navigation";
import TabNavigation from "../navigation/TabNavigation";
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

  return (
    <div 
      className="min-h-screen pb-28 relative"
      style={{
        background: "linear-gradient(to bottom right, rgb(254 243 199), rgb(253 230 138))",
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
      
      <TabNavigation userRole={userRole} badges={badges} />
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
