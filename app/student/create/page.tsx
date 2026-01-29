"use client";

import { useState } from "react";
import AuthGuard from "../../components/auth/AuthGuard";
import DashboardLayout from "../../components/layout/DashboardLayout";
import CreateCard from "../../components/create/CreateCard";

export default function StudentCreatePage() {
  const [user, setUser] = useState<any>(null);

  const flashcardCard = {
    title: "Create Flashcard",
    description: "Create a new flashcard set for studying",
    href: "/create/flashcard",
    icon: (
      <svg
        className="w-16 h-16"
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
    ),
  };

  return (
    <AuthGuard requiredRole="student" onAuthSuccess={setUser}>
      <DashboardLayout
        title="QuizChe - Create"
        userEmail={user?.email}
        userRole="student"
      >
        <div className="flex flex-col gap-8">
          <h2 className="text-3xl font-light text-black">
            Create Study Materials
          </h2>
          <p className="text-lg text-gray-600">
            Build your own flashcard sets to enhance your learning experience.
          </p>

          <div className="flex justify-center">
            <div className="max-w-md w-full">
              <CreateCard
                title={flashcardCard.title}
                description={flashcardCard.description}
                href={flashcardCard.href}
                icon={flashcardCard.icon}
              />
            </div>
          </div>

          <div className="text-center mt-8">
            <p className="text-sm text-gray-500">
              Want to create quizzes? Ask your teacher to create them for you!
            </p>
          </div>
        </div>
      </DashboardLayout>
    </AuthGuard>
  );
}
