/* eslint-disable @typescript-eslint/no-misused-promises, react/no-unescaped-entities */
/* eslint-disable @typescript-eslint/strict-boolean-expressions, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unnecessary-condition, @typescript-eslint/prefer-nullish-coalescing, @typescript-eslint/explicit-function-return-type, @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import type { ReactElement } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import ErrorMessage from "./ui/ErrorMessage";

type RoleSelectionProps = {
  idToken: string;
};

const RoleSelection = ({ idToken }: RoleSelectionProps): ReactElement => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<
    "student" | "teacher" | null
  >(null);
  const [error, setError] = useState<string | null>(null);

  const handleRoleSelection = async (role: "student" | "teacher") => {
    try {
      setLoading(true);
      setSelectedRole(role);
      setError(null);

      const { apiPost } = await import("../lib/api");
      const response = await apiPost("/api/auth/register", {
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ idToken, role }),
        idToken: idToken,
        requireCSRF: false,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Registration failed");
      }

      const user = auth.currentUser;
      if (user !== undefined && user !== null) {
        await user.getIdToken(true);
      }

      router.push(`/${role}`);
    } catch (err: any) {
      console.error("Role selection error:", err);
      setError(err.message || "Failed to set role");
      setSelectedRole(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-8 w-full max-w-3xl mx-auto px-4">
      {/* Header */}
      <div className="text-center">
        <div className="flex gap-1.5 justify-center mb-4">
          <span className="w-4 h-4 bg-red-500 border-2 border-gray-900 rounded-full"></span>
          <span className="w-4 h-4 bg-yellow-500 border-2 border-gray-900 rounded-full"></span>
          <span className="w-4 h-4 bg-green-500 border-2 border-gray-900 rounded-full"></span>
        </div>
        <h2 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight mb-3">
          Welcome to QuizChe
        </h2>
        <p className="text-lg font-medium text-gray-600">
          How will you be using the platform?
        </p>
      </div>

      {/* Role Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
        {/* Teacher Card */}
        <button
          onClick={() => handleRoleSelection("teacher")}
          disabled={loading}
          className={`group relative bg-amber-100 border-4 border-gray-900 rounded-2xl p-6 text-left transition-all duration-200 ${
            loading && selectedRole === "teacher"
              ? "shadow-[2px_2px_0px_0px_rgba(17,24,39,1)] translate-x-1 translate-y-1"
              : "shadow-[6px_6px_0px_0px_rgba(17,24,39,1)] hover:shadow-[8px_8px_0px_0px_rgba(17,24,39,1)] hover:-translate-x-0.5 hover:-translate-y-0.5"
          } disabled:cursor-not-allowed`}
        >
          {/* Icon */}
          <div className="w-14 h-14 bg-gray-900 border-3 border-gray-900 rounded-xl flex items-center justify-center mb-4">
            <span className="material-icons-outlined text-amber-100 text-2xl">
              school
            </span>
          </div>

          {/* Content */}
          <h3 className="text-2xl font-black text-gray-900 mb-2">
            I'm a Teacher
          </h3>
          <p className="text-base font-medium text-gray-600 mb-4">
            Create quizzes, manage your sections, and track student progress.
          </p>

          {/* Feature Pills */}
          <div className="flex flex-wrap gap-2 mb-5">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-200 border-2 border-gray-900 rounded-full text-sm font-bold text-gray-900">
              <span className="material-icons-outlined text-sm">edit_note</span>
              Create Quizzes
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-200 border-2 border-gray-900 rounded-full text-sm font-bold text-gray-900">
              <span className="material-icons-outlined text-sm">bar_chart</span>
              Analytics
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-200 border-2 border-gray-900 rounded-full text-sm font-bold text-gray-900">
              <span className="material-icons-outlined text-sm">groups</span>
              Sections
            </span>
          </div>

          {/* CTA */}
          <div
            className={`flex items-center gap-2 font-bold text-gray-900 ${loading && selectedRole === "teacher" ? "" : "group-hover:gap-3"} transition-all`}
          >
            {loading && selectedRole === "teacher" ? (
              <>
                <div className="w-5 h-5 border-3 border-gray-900 border-t-transparent rounded-full animate-spin"></div>
                <span>Setting up...</span>
              </>
            ) : (
              <>
                <span>Continue as Teacher</span>
                <span className="material-icons-outlined text-xl">
                  arrow_forward
                </span>
              </>
            )}
          </div>
        </button>

        {/* Student Card */}
        <button
          onClick={() => handleRoleSelection("student")}
          disabled={loading}
          className={`group relative bg-amber-100 border-4 border-gray-900 rounded-2xl p-6 text-left transition-all duration-200 ${
            loading && selectedRole === "student"
              ? "shadow-[2px_2px_0px_0px_rgba(17,24,39,1)] translate-x-1 translate-y-1"
              : "shadow-[6px_6px_0px_0px_rgba(17,24,39,1)] hover:shadow-[8px_8px_0px_0px_rgba(17,24,39,1)] hover:-translate-x-0.5 hover:-translate-y-0.5"
          } disabled:cursor-not-allowed`}
        >
          {/* Icon */}
          <div className="w-14 h-14 bg-gray-900 border-3 border-gray-900 rounded-xl flex items-center justify-center mb-4">
            <span className="material-icons-outlined text-amber-100 text-2xl">
              person
            </span>
          </div>

          {/* Content */}
          <h3 className="text-2xl font-black text-gray-900 mb-2">
            I'm a Student
          </h3>
          <p className="text-base font-medium text-gray-600 mb-5">
            Join sections, take quizzes, and create flashcards to study.
          </p>

          {/* CTA */}
          <div
            className={`flex items-center gap-2 font-bold text-gray-900 ${loading && selectedRole === "student" ? "" : "group-hover:gap-3"} transition-all`}
          >
            {loading && selectedRole === "student" ? (
              <>
                <div className="w-5 h-5 border-3 border-gray-900 border-t-transparent rounded-full animate-spin"></div>
                <span>Setting up...</span>
              </>
            ) : (
              <>
                <span>Continue as Student</span>
                <span className="material-icons-outlined text-xl">
                  arrow_forward
                </span>
              </>
            )}
          </div>
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="w-full max-w-md">
          <ErrorMessage message={error} />
        </div>
      )}
    </div>
  );
};

export default RoleSelection;
