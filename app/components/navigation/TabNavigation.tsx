"use client";

import { useTabContext, TeacherTab, StudentTab, DashboardTab } from "../dashboard/TabContext";

interface BadgeCounts {
  quizzes?: number;
  sections?: number;
  flashcards?: number;
  history?: number;
  connections?: number;
}

interface TabNavigationProps {
  userRole?: "teacher" | "student" | null;
  badges?: BadgeCounts;
}

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
    <span className={`absolute -top-2 -right-2 min-w-5 h-5 flex items-center justify-center text-xs font-bold text-gray-900 rounded-full border-2 border-gray-800 px-1 z-10 ${safeColor}`}>
      {displayCount}
    </span>
  );
};

export default function TabNavigation({ userRole, badges = {} }: TabNavigationProps) {
  const { activeTab, setActiveTab } = useTabContext();

  const isActive = (tab: DashboardTab) => activeTab === tab;

  const teacherTabs: { tab: TeacherTab; label: string; icon: string; badgeKey?: keyof BadgeCounts; badgeColor?: string }[] = [
    { tab: "home", label: "Home", icon: "cottage" },
    { tab: "quizzes", label: "Quizzes", icon: "assignment", badgeKey: "quizzes", badgeColor: "bg-cyan-400" },
    { tab: "sections", label: "Sections", icon: "school", badgeKey: "sections", badgeColor: "bg-purple-400" },
    { tab: "profile", label: "Profile", icon: "account_circle" },
  ];

  const studentTabs: { tab: StudentTab; label: string; icon: string; badgeKey?: keyof BadgeCounts; badgeColor?: string }[] = [
    { tab: "home", label: "Home", icon: "cottage" },
    { tab: "quizzes", label: "Quizzes", icon: "assignment", badgeKey: "quizzes", badgeColor: "bg-cyan-400" },
    { tab: "flashcards", label: "Cards", icon: "layers", badgeKey: "flashcards", badgeColor: "bg-lime-400" },
    { tab: "history", label: "History", icon: "insights", badgeKey: "history", badgeColor: "bg-orange-400" },
    { tab: "connections", label: "Connect", icon: "group_add", badgeKey: "connections", badgeColor: "bg-pink-400" },
    { tab: "profile", label: "Profile", icon: "account_circle" },
  ];

  const tabs = userRole === "teacher" ? teacherTabs : studentTabs;

  return (
    <nav className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
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
            <span className="material-icons-outlined text-xl">{item.icon}</span>
            <span className="text-sm font-medium">{item.label}</span>
            {item.badgeKey && item.badgeColor && (
              <Badge count={badges[item.badgeKey] || 0} color={item.badgeColor} />
            )}
          </button>
        ))}
      </div>
    </nav>
  );
}
