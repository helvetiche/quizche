"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  useTabContext,
  type TeacherTab,
  type StudentTab,
  type DashboardTab,
} from "../dashboard/TabContext";

type BadgeCounts = {
  quizzes?: number;
  sections?: number;
  flashcards?: number;
  history?: number;
  connections?: number;
};

type TabNavigationProps = {
  userRole?: "teacher" | "student" | null;
  badges?: BadgeCounts;
  onAIClick?: () => void;
};

const Badge = ({ count, color }: { count: number; color: string }) => {
  // Validate count is a safe number
  if (typeof count !== "number" || !Number.isFinite(count) || count <= 0) {
    return null;
  }

  // Sanitize count display (max 9+)
  const safeCount = Math.max(0, Math.min(Math.floor(count), 9999));
  const displayCount = safeCount > 9 ? "9+" : safeCount.toString();

  // Whitelist allowed colors to prevent CSS injection
  const allowedColors = [
    "bg-cyan-400",
    "bg-purple-400",
    "bg-lime-400",
    "bg-orange-400",
    "bg-pink-400",
  ];
  const safeColor = allowedColors.includes(color) ? color : "bg-gray-400";

  return (
    <span
      className={`absolute -top-2 -right-2 min-w-5 h-5 flex items-center justify-center text-xs font-bold text-gray-900 rounded-full border-2 border-gray-800 px-1 z-10 ${safeColor}`}
    >
      {displayCount}
    </span>
  );
};

export default function TabNavigation({
  userRole,
  badges = {},
  onAIClick,
}: TabNavigationProps) {
  const { activeTab, setActiveTab } = useTabContext();
  const router = useRouter();
  const [showAICredits, setShowAICredits] = useState(false);
  const [showQuizLimit, setShowQuizLimit] = useState(false);

  // TODO: Replace with actual credits from API/state
  const aiCreditsUsed = 3;
  const aiCreditsTotal = 10;
  const aiCreditsRemaining = aiCreditsTotal - aiCreditsUsed;
  const creditsPercentage = (aiCreditsRemaining / aiCreditsTotal) * 100;

  // Quiz limit - based on badges.quizzes count
  const quizzesCreated = badges.quizzes || 0;
  const quizLimit = 10;
  const quizRemaining = Math.max(0, quizLimit - quizzesCreated);
  const quizPercentage = (quizRemaining / quizLimit) * 100;

  const isActive = (tab: DashboardTab) => activeTab === tab;

  const teacherTabs: {
    tab: TeacherTab;
    label: string;
    icon: string;
    badgeKey?: keyof BadgeCounts;
    badgeColor?: string;
  }[] = [
    { tab: "home", label: "Home", icon: "cottage" },
    {
      tab: "quizzes",
      label: "Quizzes",
      icon: "assignment",
      badgeKey: "quizzes",
      badgeColor: "bg-cyan-400",
    },
    {
      tab: "sections",
      label: "Sections",
      icon: "school",
      badgeKey: "sections",
      badgeColor: "bg-purple-400",
    },
  ];

  const studentTabs: {
    tab: StudentTab;
    label: string;
    icon: string;
    badgeKey?: keyof BadgeCounts;
    badgeColor?: string;
  }[] = [
    { tab: "home", label: "Home", icon: "cottage" },
    {
      tab: "quizzes",
      label: "Quizzes",
      icon: "assignment",
      badgeKey: "quizzes",
      badgeColor: "bg-cyan-400",
    },
    {
      tab: "flashcards",
      label: "Cards",
      icon: "layers",
      badgeKey: "flashcards",
      badgeColor: "bg-lime-400",
    },
    {
      tab: "history",
      label: "History",
      icon: "insights",
      badgeKey: "history",
      badgeColor: "bg-orange-400",
    },
    {
      tab: "connections",
      label: "Connect",
      icon: "group_add",
      badgeKey: "connections",
      badgeColor: "bg-pink-400",
    },
  ];

  const tabs = userRole === "teacher" ? teacherTabs : studentTabs;

  const handleCreateClick = () => {
    // Navigate to the new composer page
    router.push("/teacher/composer");
  };

  return (
    <nav className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
      <div className="flex items-center gap-3">
        {/* Main Navigation */}
        <div className="flex items-center gap-1 bg-amber-100 border-2 border-gray-800 rounded-full px-2 py-2 shadow-[4px_4px_0px_0px_rgba(31,41,55,1)]">
          {tabs.map((item) => (
            <button
              key={item.tab}
              onClick={() => setActiveTab(item.tab)}
              className={`relative flex items-center gap-2 px-4 py-2 rounded-full transition-all ${
                isActive(item.tab)
                  ? "bg-gray-900 text-amber-100"
                  : "text-gray-800 hover:bg-amber-200"
              }`}
              aria-label={item.label}
              aria-current={isActive(item.tab) ? "page" : undefined}
            >
              <span className="material-icons-outlined text-xl">
                {item.icon}
              </span>
              <span className="text-sm font-medium">{item.label}</span>
              {item.badgeKey && item.badgeColor && (
                <Badge
                  count={badges[item.badgeKey] || 0}
                  color={item.badgeColor}
                />
              )}
            </button>
          ))}
        </div>

        {/* Create Button - Separate Circle */}
        {userRole === "teacher" && (
          <div className="relative">
            <button
              onClick={handleCreateClick}
              onMouseEnter={() => setShowQuizLimit(true)}
              onMouseLeave={() => setShowQuizLimit(false)}
              className="w-14 h-14 bg-amber-100 border-2 border-gray-800 rounded-full flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(31,41,55,1)] hover:shadow-[5px_5px_0px_0px_rgba(31,41,55,1)] hover:-translate-x-0.5 hover:-translate-y-0.5 active:shadow-[2px_2px_0px_0px_rgba(31,41,55,1)] active:translate-x-0.5 active:translate-y-0.5 transition-all"
              aria-label="Create new quiz"
            >
              <span className="material-icons-outlined text-gray-900 text-3xl">
                add
              </span>
            </button>

            {/* Quiz Limit Popover */}
            <div
              className={`absolute bottom-full mb-3 left-1/2 -translate-x-1/2 bg-amber-100 border-2 border-gray-800 rounded-xl p-3 shadow-[4px_4px_0px_0px_rgba(31,41,55,1)] whitespace-nowrap transition-all duration-200 ${showQuizLimit ? "opacity-100 visible" : "opacity-0 invisible"}`}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="material-icons-outlined text-gray-900 text-sm">
                  assignment
                </span>
                <span className="font-bold text-gray-900 text-sm">
                  Quiz Limit
                </span>
              </div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-gray-700">
                  {quizzesCreated}/{quizLimit} created
                </span>
              </div>
              <div className="w-32 h-2 bg-gray-200 rounded-full border border-gray-800 overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${quizPercentage > 50 ? "bg-green-500" : quizPercentage > 20 ? "bg-yellow-500" : "bg-red-500"}`}
                  style={{ width: `${100 - quizPercentage}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {quizRemaining} remaining
              </p>
              {/* Arrow */}
              <div className="absolute top-full left-1/2 -translate-x-1/2 w-3 h-3 bg-amber-100 border-r-2 border-b-2 border-gray-800 transform rotate-45 -mt-1.5"></div>
            </div>
          </div>
        )}

        {/* AI Generate Button */}
        {userRole === "teacher" && (
          <div className="relative">
            <button
              onMouseEnter={() => setShowAICredits(true)}
              onMouseLeave={() => setShowAICredits(false)}
              onClick={onAIClick}
              className="w-14 h-14 bg-amber-100 border-2 border-gray-800 rounded-full flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(31,41,55,1)] hover:shadow-[5px_5px_0px_0px_rgba(31,41,55,1)] hover:-translate-x-0.5 hover:-translate-y-0.5 active:shadow-[2px_2px_0px_0px_rgba(31,41,55,1)] active:translate-x-0.5 active:translate-y-0.5 transition-all"
              aria-label="Generate with AI"
            >
              <span className="material-icons-outlined text-gray-900 text-3xl">
                auto_awesome
              </span>
            </button>

            {/* Credits Popover */}
            <div
              className={`absolute bottom-full mb-3 left-1/2 -translate-x-1/2 bg-amber-100 border-2 border-gray-800 rounded-xl p-3 shadow-[4px_4px_0px_0px_rgba(31,41,55,1)] whitespace-nowrap transition-all duration-200 ${showAICredits ? "opacity-100 visible" : "opacity-0 invisible"}`}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="material-icons-outlined text-gray-900 text-sm">
                  auto_awesome
                </span>
                <span className="font-bold text-gray-900 text-sm">
                  AI Credits
                </span>
              </div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-gray-700">
                  {aiCreditsRemaining}/{aiCreditsTotal} remaining
                </span>
              </div>
              <div className="w-32 h-2 bg-gray-200 rounded-full border border-gray-800 overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${creditsPercentage > 50 ? "bg-green-500" : creditsPercentage > 20 ? "bg-yellow-500" : "bg-red-500"}`}
                  style={{ width: `${creditsPercentage}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-500 mt-1">Resets monthly</p>
              {/* Arrow */}
              <div className="absolute top-full left-1/2 -translate-x-1/2 w-3 h-3 bg-amber-100 border-r-2 border-b-2 border-gray-800 transform rotate-45 -mt-1.5"></div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
