/* eslint-disable @typescript-eslint/no-unnecessary-condition */
"use client";

import type { ReactElement } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type BadgeCounts = {
  quizzes?: number;
  sections?: number;
  flashcards?: number;
  history?: number;
  connections?: number;
};

type BottomNavigationProps = {
  userRole?: "teacher" | "student" | null;
  badges?: BadgeCounts;
};

const Badge = ({
  count,
  color,
}: {
  count: number;
  color: string;
}): ReactElement | null => {
  if (typeof count !== "number" || !Number.isFinite(count) || count <= 0) {
    return null;
  }

  const safeCount = Math.max(0, Math.min(Math.floor(count), 9999));
  const displayCount = safeCount > 9 ? "9+" : safeCount.toString();

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

const BottomNavigation = ({
  userRole,
  badges = {},
}: BottomNavigationProps): ReactElement | null => {
  const pathname = usePathname();

  // Hide bottom navigation on flashcard edit page
  if (pathname?.match(/^\/student\/flashcards\/[^/]+\/edit$/)) {
    return null;
  }

  const homePath = userRole === "teacher" ? "/teacher" : "/student";
  const profilePath =
    userRole === "teacher" ? "/teacher?tab=profile" : "/student?tab=profile";
  const quizzesPath =
    userRole === "teacher" ? "/teacher?tab=quizzes" : "/student?tab=quizzes";
  const sectionsPath = "/teacher?tab=sections";
  const flashcardsPath = "/student?tab=flashcards";
  const historyPath = "/student?tab=history";
  const connectionsPath = "/student?tab=connections";

  const isHomeActive = (): boolean => {
    return pathname === "/teacher" || pathname === "/student";
  };

  return (
    <>
      {/* Bottom Fade Overlay */}
      <div className="fixed bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/50 to-transparent pointer-events-none z-40"></div>

      <nav className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
        <div className="flex items-center gap-1 bg-amber-100 border-2 border-gray-800 rounded-full px-2 py-2 shadow-[4px_4px_0px_0px_rgba(31,41,55,1)]">
          {/* Home */}
          <Link
            href={homePath}
            className={`relative flex items-center gap-2 px-4 py-2 rounded-full transition-all ${
              isHomeActive()
                ? "bg-gray-900 text-amber-100"
                : "text-gray-800 hover:bg-amber-200"
            }`}
          >
            <span className="material-icons-outlined text-xl">cottage</span>
            <span className="text-sm font-medium">Home</span>
          </Link>

          {userRole === "teacher" && (
            <>
              <Link
                href={quizzesPath}
                className={`relative flex items-center gap-2 px-4 py-2 rounded-full transition-all ${
                  pathname?.startsWith("/teacher/quizzes")
                    ? "bg-gray-900 text-amber-100"
                    : "text-gray-800 hover:bg-amber-200"
                }`}
              >
                <span className="material-icons-outlined text-xl">
                  assignment
                </span>
                <span className="text-sm font-medium">Quizzes</span>
                <Badge count={badges.quizzes ?? 0} color="bg-cyan-400" />
              </Link>

              <Link
                href={sectionsPath}
                className={`relative flex items-center gap-2 px-4 py-2 rounded-full transition-all ${
                  pathname === "/teacher/sections"
                    ? "bg-gray-900 text-amber-100"
                    : "text-gray-800 hover:bg-amber-200"
                }`}
              >
                <span className="material-icons-outlined text-xl">school</span>
                <span className="text-sm font-medium">Sections</span>
                <Badge count={badges.sections ?? 0} color="bg-purple-400" />
              </Link>
            </>
          )}

          {userRole === "student" && (
            <>
              <Link
                href={quizzesPath}
                className={`relative flex items-center gap-2 px-4 py-2 rounded-full transition-all ${
                  pathname?.startsWith("/student/quizzes")
                    ? "bg-gray-900 text-amber-100"
                    : "text-gray-800 hover:bg-amber-200"
                }`}
              >
                <span className="material-icons-outlined text-xl">
                  assignment
                </span>
                <span className="text-sm font-medium">Quizzes</span>
                <Badge count={badges.quizzes ?? 0} color="bg-cyan-400" />
              </Link>

              <Link
                href={flashcardsPath}
                className={`relative flex items-center gap-2 px-4 py-2 rounded-full transition-all ${
                  pathname?.startsWith("/student/flashcards")
                    ? "bg-gray-900 text-amber-100"
                    : "text-gray-800 hover:bg-amber-200"
                }`}
              >
                <span className="material-icons-outlined text-xl">layers</span>
                <span className="text-sm font-medium">Cards</span>
                <Badge count={badges.flashcards ?? 0} color="bg-lime-400" />
              </Link>

              <Link
                href={historyPath}
                className={`relative flex items-center gap-2 px-4 py-2 rounded-full transition-all ${
                  pathname?.startsWith("/student/history")
                    ? "bg-gray-900 text-amber-100"
                    : "text-gray-800 hover:bg-amber-200"
                }`}
              >
                <span className="material-icons-outlined text-xl">
                  insights
                </span>
                <span className="text-sm font-medium">History</span>
                <Badge count={badges.history ?? 0} color="bg-orange-400" />
              </Link>

              <Link
                href={connectionsPath}
                className={`relative flex items-center gap-2 px-4 py-2 rounded-full transition-all ${
                  pathname === "/student/connections"
                    ? "bg-gray-900 text-amber-100"
                    : "text-gray-800 hover:bg-amber-200"
                }`}
              >
                <span className="material-icons-outlined text-xl">
                  group_add
                </span>
                <span className="text-sm font-medium">Connect</span>
                <Badge count={badges.connections ?? 0} color="bg-pink-400" />
              </Link>
            </>
          )}

          <Link
            href={profilePath}
            className="relative flex items-center gap-2 px-4 py-2 rounded-full transition-all text-gray-800 hover:bg-amber-200"
          >
            <span className="material-icons-outlined text-xl">
              account_circle
            </span>
            <span className="text-sm font-medium">Profile</span>
          </Link>
        </div>
      </nav>
    </>
  );
};

export default BottomNavigation;
