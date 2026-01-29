"use client";

import SignOutButton from "../ui/SignOutButton";
import BottomNavigation from "../navigation/BottomNavigation";
import { useNavigationBadges } from "@/app/hooks/useNavigationBadges";

type DashboardLayoutProps = {
  title: string;
  userEmail?: string;
  userRole?: "teacher" | "student" | null;
  children: React.ReactNode;
};

const DashboardLayout = ({
  title,
  userEmail,
  userRole,
  children,
}: DashboardLayoutProps) => {
  const { badges } = useNavigationBadges(userRole);

  return (
    <div className="min-h-screen bg-white pb-20">
      <header className="border-b border-black">
        <div className="container mx-auto px-8 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-light text-black">{title}</h1>
          <div className="flex items-center gap-4">
            {userEmail && (
              <span className="text-sm text-black">{userEmail}</span>
            )}
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="container mx-auto px-8 py-16">{children}</main>
      <BottomNavigation userRole={userRole} badges={badges} />
    </div>
  );
};

export default DashboardLayout;
