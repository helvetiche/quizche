"use client";

import GoogleAuthButton from "./components/GoogleAuthButton";
import RoleSelection from "./components/RoleSelection";
import ProfileSetup from "./components/auth/ProfileSetup";
import PageContainer from "./components/layout/PageContainer";
import MainLayout from "./components/layout/MainLayout";
import PageTitle from "./components/layout/PageTitle";
import Loading from "./components/ui/Loading";
import { useAuth } from "./components/auth/useAuth";

export default function Home() {
  const {
    user,
    userRole,
    profileCompleted,
    idToken,
    loading,
    handleLoginSuccess,
  } = useAuth();

  if (loading) {
    return <Loading />;
  }

  if (user && !userRole && idToken) {
    return (
      <PageContainer>
        <MainLayout>
          <PageTitle>QuizChe</PageTitle>
          <RoleSelection userId={user.uid} idToken={idToken} />
        </MainLayout>
      </PageContainer>
    );
  }

  if (user && userRole && idToken && profileCompleted === false) {
    return (
      <PageContainer>
        <MainLayout>
          <PageTitle>QuizChe</PageTitle>
          <ProfileSetup userId={user.uid} idToken={idToken} />
        </MainLayout>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <MainLayout>
        <PageTitle>QuizChe</PageTitle>
        <div className="flex flex-col items-center gap-4">
          <p className="text-lg text-black">Sign in to continue</p>
          <GoogleAuthButton onLoginSuccess={handleLoginSuccess} />
        </div>
      </MainLayout>
    </PageContainer>
  );
}
