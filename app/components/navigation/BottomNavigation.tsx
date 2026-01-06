"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface BottomNavigationProps {
  userRole?: "teacher" | "student" | null;
}

const BottomNavigation = ({ userRole }: BottomNavigationProps) => {
  const pathname = usePathname();
  const homePath = userRole === "teacher" ? "/teacher" : "/student";

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-black z-50">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-center gap-8">
          <Link
            href={homePath}
            className={`flex flex-col items-center gap-1 px-4 py-2 transition-colors ${
              pathname === "/teacher" || pathname === "/student"
                ? "text-black font-medium"
                : "text-gray-600 hover:text-black"
            }`}
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
            <span className="text-xs">Home</span>
          </Link>

          {userRole === "teacher" && (
            <>
              <Link
                href="/teacher/quizzes"
                className={`flex flex-col items-center gap-1 px-4 py-2 transition-colors ${
                  pathname === "/teacher/quizzes" || pathname?.startsWith("/teacher/quizzes")
                    ? "text-black font-medium"
                    : "text-gray-600 hover:text-black"
                }`}
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <span className="text-xs">My Quizzes</span>
              </Link>

              <Link
                href="/teacher/sections"
                className={`flex flex-col items-center gap-1 px-4 py-2 transition-colors ${
                  pathname === "/teacher/sections" || pathname?.startsWith("/teacher/sections")
                    ? "text-black font-medium"
                    : "text-gray-600 hover:text-black"
                }`}
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  />
                </svg>
                <span className="text-xs">Sections</span>
              </Link>

              <Link
                href="/create"
                className="flex flex-col items-center gap-1 px-4 py-2 transition-colors"
              >
                <div
                  className={`w-12 h-12 rounded-full bg-black text-white flex items-center justify-center text-2xl font-light hover:bg-gray-800 transition-colors ${
                    pathname === "/create" || pathname?.startsWith("/create")
                      ? "ring-2 ring-black ring-offset-2"
                      : ""
                  }`}
                >
                  +
                </div>
              </Link>
            </>
          )}

          {userRole === "student" && (
            <>
              <Link
                href="/student/quizzes"
                className={`flex flex-col items-center gap-1 px-4 py-2 transition-colors ${
                  pathname === "/student/quizzes" ||
                  pathname?.startsWith("/student/quizzes")
                    ? "text-black font-medium"
                    : "text-gray-600 hover:text-black"
                }`}
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <span className="text-xs">Quizzes</span>
              </Link>

              <Link
                href="/student/flashcards"
                className={`flex flex-col items-center gap-1 px-4 py-2 transition-colors ${
                  pathname === "/student/flashcards" ||
                  pathname?.startsWith("/student/flashcards")
                    ? "text-black font-medium"
                    : "text-gray-600 hover:text-black"
                }`}
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  />
                </svg>
                <span className="text-xs">Flashcards</span>
              </Link>

              <Link
                href="/student/history"
                className={`flex flex-col items-center gap-1 px-4 py-2 transition-colors ${
                  pathname === "/student/history" ||
                  pathname?.startsWith("/student/history")
                    ? "text-black font-medium"
                    : "text-gray-600 hover:text-black"
                }`}
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
                <span className="text-xs">History</span>
              </Link>

              <Link
                href="/student/connections"
                className={`flex flex-col items-center gap-1 px-4 py-2 transition-colors ${
                  pathname === "/student/connections" ||
                  pathname?.startsWith("/student/connections")
                    ? "text-black font-medium"
                    : "text-gray-600 hover:text-black"
                }`}
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
                <span className="text-xs">Connections</span>
              </Link>
            </>
          )}

          <Link
            href="/profile"
            className={`flex flex-col items-center gap-1 px-4 py-2 transition-colors ${
              pathname === "/profile"
                ? "text-black font-medium"
                : "text-gray-600 hover:text-black"
            }`}
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
            <span className="text-xs">Profile</span>
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default BottomNavigation;
