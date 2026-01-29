"use client";

import { useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useEffect } from "react";
import TabNavigation from "../navigation/TabNavigation";
import PDFUploadModal from "../create/PDFUploadModal";
import ProfileModal from "../dashboard/shared/ProfileModal";
import { useNavigationBadges } from "@/app/hooks/useNavigationBadges";
import {
  TabProvider,
  type DashboardTab,
  type TeacherTab,
  type StudentTab,
} from "../dashboard/TabContext";

type TabDashboardLayoutProps = {
  title: string;
  userEmail?: string;
  userRole: "teacher" | "student";
  children: React.ReactNode;
  initialTab?: DashboardTab;
};

function TabDashboardLayoutInner({
  title,
  userEmail,
  userRole,
  children,
}: Omit<TabDashboardLayoutProps, "initialTab">) {
  const { badges } = useNavigationBadges(userRole);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [userInfo, setUserInfo] = useState<{
    displayName: string | null;
    photoURL: string | null;
    fullName: string | null;
    tier: string | null;
  }>({
    displayName: null,
    photoURL: null,
    fullName: null,
    tier: null,
  });

  // Circular progress data for usage counter
  const progressData = [
    { label: "Quiz Completion", value: 75, icon: "auto_awesome", badge: 3 },
    { label: "Student Engagement", value: 62, icon: "school", badge: 5 },
  ];

  // Get color based on percentage (0 = green, 100 = red)
  const getProgressColor = (value: number) => {
    if (value <= 33) return "#22c55e"; // green
    if (value <= 66) return "#f59e0b"; // amber/orange
    return "#ef4444"; // red
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        try {
          const token = await currentUser.getIdToken();
          setIdToken(token);

          // Get custom claims for tier
          const tokenResult = await currentUser.getIdTokenResult();
          const tier = (tokenResult.claims.tier as string) || "free";

          setUserInfo({
            displayName: currentUser.displayName,
            photoURL: currentUser.photoURL,
            fullName: null,
            tier: tier,
          });

          // Fetch full name from profile API
          try {
            const profileResponse = await fetch("/api/profile", {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (profileResponse.ok) {
              const profileData = await profileResponse.json();
              if (profileData.profile?.fullName) {
                setUserInfo((prev) => ({
                  ...prev,
                  fullName: profileData.profile.fullName,
                }));
              }
            }
          } catch (profileError) {
            console.error("Error fetching profile:", profileError);
          }
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

  const handleProfileUpdate = (profileData: {
    fullName: string;
    photoUrl: string | null;
  }) => {
    setUserInfo((prev) => ({
      ...prev,
      fullName: profileData.fullName,
      photoURL: profileData.photoUrl,
    }));
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
          if (
            q.type === "multiple_choice" &&
            q.choices &&
            Array.isArray(q.choices)
          ) {
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
      window.location.href = `/teacher/quiz/${data.id}`;
    } catch (error) {
      console.error("Error creating quiz:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Failed to create quiz. Please try again."
      );
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
      {/* Amber Vignette Effect */}
      <div
        className="fixed inset-0 pointer-events-none z-30"
        style={{
          background: `radial-gradient(ellipse at center, transparent 40%, rgba(251, 191, 36, 0.15) 70%, rgba(251, 191, 36, 0.35) 100%)`,
        }}
      />

      {/* Circular Progress Bars - Right Side (Usage Counter) */}
      {userRole === "teacher" && (
        <div className="fixed right-8 top-40 flex-col gap-4 hidden xl:flex z-40">
          {progressData.map((item, index) => {
            const circumference = 2 * Math.PI * 36;
            const strokeDashoffset =
              circumference - (item.value / 100) * circumference;

            return (
              <div
                key={index}
                className="w-18 h-18 relative"
                style={{ width: "72px", height: "72px" }}
              >
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  {/* Outer border */}
                  <circle
                    cx="50"
                    cy="50"
                    r="42"
                    fill="none"
                    stroke="#111827"
                    strokeWidth="3"
                  />
                  {/* Inner border */}
                  <circle
                    cx="50"
                    cy="50"
                    r="30"
                    fill="none"
                    stroke="#111827"
                    strokeWidth="3"
                  />
                  {/* Background track */}
                  <circle
                    cx="50"
                    cy="50"
                    r="36"
                    fill="none"
                    stroke="#fffbeb"
                    strokeWidth="8"
                  />
                  {/* Progress arc */}
                  <circle
                    cx="50"
                    cy="50"
                    r="36"
                    fill="none"
                    stroke={getProgressColor(item.value)}
                    strokeWidth="8"
                    strokeLinecap="butt"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                  />
                </svg>
                {item.icon && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="material-icons text-gray-900 text-base">
                      {item.icon}
                    </span>
                  </div>
                )}
                {/* Badge */}
                <div className="absolute bottom-2 right-0 w-5 h-5 bg-red-500 border-2 border-gray-900 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">?</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Profile Card - Bottom Left */}
      <div className="fixed left-8 bottom-8 hidden xl:flex z-[60]">
        <div className="bg-amber-100 border-3 border-gray-900 rounded-2xl shadow-[4px_4px_0px_0px_rgba(31,41,55,1)] p-4 flex flex-col gap-3">
          <div className="flex items-center gap-3">
            {/* Profile Picture */}
            <div className="relative">
              <div className="w-12 h-12 rounded-full border-3 border-gray-900 overflow-hidden bg-amber-200 flex-shrink-0">
                {userInfo.photoURL ? (
                  <img
                    src={userInfo.photoURL}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="material-icons-outlined text-gray-900 text-2xl">
                      person
                    </span>
                  </div>
                )}
              </div>
              {/* Online Status Badge */}
              <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 border-2 border-gray-900 rounded-full"></div>
            </div>
            {/* Name and Role */}
            <div className="flex flex-col">
              <span className="font-black text-gray-900 text-sm leading-tight">
                {userInfo.fullName ||
                  userInfo.displayName ||
                  userEmail?.split("@")[0] ||
                  "User"}
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-medium text-gray-600">
                  {userRole === "teacher" ? "Educator" : "Student"}
                </span>
                <span className="text-xs text-gray-400">•</span>
                <span className="text-xs font-bold text-amber-600 capitalize">
                  {userInfo.tier || "Free"}
                </span>
              </div>
            </div>
          </div>
          {/* Edit Profile Button */}
          <button
            onClick={() => setIsProfileModalOpen(true)}
            className="w-full px-3 py-1.5 bg-amber-200 text-gray-900 font-bold text-xs border-2 border-gray-900 rounded-full shadow-[2px_2px_0px_0px_rgba(31,41,55,1)] hover:shadow-[3px_3px_0px_0px_rgba(31,41,55,1)] hover:-translate-y-0.5 active:shadow-[1px_1px_0px_0px_rgba(31,41,55,1)] active:translate-y-0.5 transition-all flex items-center justify-center gap-1"
          >
            <span className="material-icons-outlined text-sm">edit</span>
            <span>Edit Profile</span>
          </button>
        </div>
      </div>

      {/* Corner Plus Signs */}
      <div className="absolute top-8 left-8 w-16 h-16 flex items-center justify-center z-20">
        <span className="text-gray-900 text-8xl font-black">+</span>
      </div>
      <div className="absolute top-8 right-8 w-16 h-16 flex items-center justify-center z-20">
        <span className="text-gray-900 text-8xl font-black">+</span>
      </div>

      {/* Main Content */}
      <main className="relative z-10 container mx-auto px-6 py-8">
        {children}
      </main>

      <TabNavigation
        userRole={userRole}
        badges={badges}
        onAIClick={handleAIClick}
      />

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

      {/* Profile Modal */}
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        onProfileUpdate={handleProfileUpdate}
      />
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
    const validTeacherTabs: TeacherTab[] = ["home", "quizzes", "sections"];
    const validStudentTabs: StudentTab[] = [
      "home",
      "quizzes",
      "flashcards",
      "history",
      "connections",
    ];

    if (
      userRole === "teacher" &&
      validTeacherTabs.includes(tabFromUrl as TeacherTab)
    ) {
      effectiveInitialTab = tabFromUrl as TeacherTab;
    } else if (
      userRole === "student" &&
      validStudentTabs.includes(tabFromUrl as StudentTab)
    ) {
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
