"use client";

import { useState } from "react";
import AuthGuard from "../components/auth/AuthGuard";
import DashboardLayout from "../components/layout/DashboardLayout";
import CreateCardGrid from "../components/create/CreateCardGrid";

export default function CreatePage() {
  const [user, setUser] = useState<any>(null);

  return (
    <AuthGuard requiredRole="teacher" onAuthSuccess={setUser}>
      <DashboardLayout
        title="QuizChe - Create"
        userEmail={user?.email}
        userRole="teacher"
      >
        <div className="flex flex-col gap-8">
          <h2 className="text-3xl font-light text-black">Create New</h2>
          <CreateCardGrid />
        </div>
      </DashboardLayout>
    </AuthGuard>
  );
}
