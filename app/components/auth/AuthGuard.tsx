"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import Loading from "../ui/Loading";
import ProfileSetup from "./ProfileSetup";
import PageContainer from "../layout/PageContainer";
import MainLayout from "../layout/MainLayout";
import PageTitle from "../layout/PageTitle";

interface AuthGuardProps {
  children: React.ReactNode;
  requiredRole: "teacher" | "student" | null;
  onAuthSuccess?: (user: any) => void;
}

const AuthGuard = ({
  children,
  requiredRole,
  onAuthSuccess,
}: AuthGuardProps) => {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [profileCompleted, setProfileCompleted] = useState<boolean | null>(
    null
  );
  const [idToken, setIdToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        router.push("/");
        return;
      }

      try {
        const token = await currentUser.getIdToken();
        setIdToken(token);

        const verifyResponse = await fetch("/api/auth/verify", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!verifyResponse.ok) {
          router.push("/");
          return;
        }

        const verifyData = await verifyResponse.json();
        // If requiredRole is null, allow any authenticated user
        // Otherwise, check if the user's role matches the required role
        if (requiredRole !== null) {
          if (!verifyData.user.role || verifyData.user.role !== requiredRole) {
            if (verifyData.user.role) {
              router.push(`/${verifyData.user.role}`);
            } else {
              router.push("/");
            }
            return;
          }
        } else {
          // For profile page (requiredRole is null), just ensure user is authenticated
          if (!verifyData.user.role) {
            router.push("/");
            return;
          }
        }

        // For profile page (requiredRole is null), skip profile completion check
        // Allow access to profile page regardless of completion status
        if (requiredRole === null) {
          const userData = {
            ...verifyData.user,
            role: verifyData.user.role,
            idToken: token,
          };
          setUser(userData);
          setProfileCompleted(true); // Set to true to skip ProfileSetup component
          if (onAuthSuccess) {
            onAuthSuccess(userData);
          }
          return;
        }

        // For other pages, check profile completion
        const profileResponse = await fetch("/api/users/profile", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (profileResponse.ok) {
          const profileData = await profileResponse.json();
          const completed = profileData.profile?.profileCompleted || false;
          setProfileCompleted(completed);

          if (!completed) {
            setUser(verifyData.user);
            setLoading(false);
            return;
          }
        } else {
          setProfileCompleted(false);
          setUser(verifyData.user);
          setLoading(false);
          return;
        }

        const userData = {
          ...verifyData.user,
          role: requiredRole || verifyData.user.role,
          idToken: token,
        };
        setUser(userData);
        if (onAuthSuccess) {
          onAuthSuccess(userData);
        }
      } catch (error) {
        console.error("Error verifying user:", error);
        router.push("/");
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router, requiredRole, onAuthSuccess]);

  if (loading) {
    return <Loading />;
  }

  if (user && !profileCompleted && idToken) {
    return (
      <PageContainer>
        <MainLayout>
          <PageTitle>QuizChe</PageTitle>
          <ProfileSetup idToken={idToken} />
        </MainLayout>
      </PageContainer>
    );
  }

  return <>{children}</>;
};

export default AuthGuard;
