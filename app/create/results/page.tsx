"use client";

import { useState } from "react";
import AuthGuard from "../../components/auth/AuthGuard";
import DashboardLayout from "../../components/layout/DashboardLayout";

export default function ResultsPage() {
  const [user, setUser] = useState<any>(null);

  return (
    <AuthGuard requiredRole="teacher" onAuthSuccess={setUser}>
      <DashboardLayout
        title="QuizChe - Results"
        userEmail={user?.email}
        userRole="teacher"
      >
        <div className="flex flex-col gap-8">
          <h2 className="text-3xl font-light text-black">Quiz Results</h2>
          <p className="text-lg text-black">Results page coming soon...</p>
        </div>
      </DashboardLayout>
    </AuthGuard>
  );
}
