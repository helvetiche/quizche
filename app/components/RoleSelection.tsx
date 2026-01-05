"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import RoleButton from "./auth/RoleButton";
import ErrorMessage from "./ui/ErrorMessage";

interface RoleSelectionProps {
  userId: string;
  idToken: string;
}

const RoleSelection = ({ userId, idToken }: RoleSelectionProps) => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRoleSelection = async (role: "student" | "teacher") => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ idToken, role }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Registration failed");
      }

      const user = auth.currentUser;
      if (user) {
        await user.getIdToken(true);
      }

      router.push(`/${role}`);
    } catch (err: any) {
      console.error("Role selection error:", err);
      setError(err.message || "Failed to set role");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-6">
      <h2 className="text-2xl font-light text-black">Select your role</h2>
      <div className="flex flex-col gap-4 w-full max-w-md">
        <RoleButton
          role="teacher"
          onClick={() => handleRoleSelection("teacher")}
          loading={loading}
        />
        <RoleButton
          role="student"
          onClick={() => handleRoleSelection("student")}
          loading={loading}
        />
      </div>
      {error && <ErrorMessage message={error} />}
    </div>
  );
};

export default RoleSelection;
