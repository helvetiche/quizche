"use client";

import { useState } from "react";
import AuthGuard from "../../components/auth/AuthGuard";
import DashboardLayout from "../../components/layout/DashboardLayout";

export default function CreateFlashcardPage() {
  const [user, setUser] = useState<any>(null);

  return (
    <AuthGuard requiredRole="teacher" onAuthSuccess={setUser}>
      <DashboardLayout
        title="QuizChe - Create Flashcard"
        userEmail={user?.email}
        userRole="teacher"
      >
        <div className="flex flex-col gap-8">
          <h2 className="text-3xl font-light text-black">Create Flashcard Set</h2>
          <p className="text-lg text-black">Flashcard creation page coming soon...</p>
        </div>
      </DashboardLayout>
    </AuthGuard>
  );
}
