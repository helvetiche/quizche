"use client";

import { useState } from "react";
import AuthGuard from "../components/auth/AuthGuard";
import DashboardLayout from "../components/layout/DashboardLayout";

export default function StudentPage() {
  const [user, setUser] = useState<any>(null);

  return (
    <AuthGuard requiredRole="student" onAuthSuccess={setUser}>
      <DashboardLayout
        title="QuizChe - Student"
        userEmail={user?.email}
        userRole="student"
      >
        <div className="flex flex-col gap-8">
          <h2 className="text-3xl font-light text-black">Welcome, Student</h2>
          <p className="text-lg text-black">Student dashboard coming soon...</p>
        </div>
      </DashboardLayout>
    </AuthGuard>
  );
}
