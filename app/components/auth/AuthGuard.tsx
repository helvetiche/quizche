/* eslint-disable @typescript-eslint/strict-boolean-expressions, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unnecessary-condition, @typescript-eslint/explicit-function-return-type, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
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

type AuthGuardProps = {
  children: React.ReactNode;
  requiredRole: "teacher" | "student" | null;
  onAuthSuccess?: (user: any) => void;
};

const AuthGuard = ({
  children,
  requiredRole,
  onAuthSuccess,
}: AuthGuardProps) => {
  const router = useRouter();
  const [user, setUser] = useState<unknown>(null);
  const [profileCompleted, setProfileCompleted] = useState<boolean | null>(
    null
  );
  const [idToken, setIdToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const verifyUserAuth = async (currentUser: any) => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        const token = await currentUser.getIdToken();
        if (!isMounted) return;

        setIdToken(token);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const verifyResponse = await fetch("/api/auth/verify", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!isMounted) return;

        if (!verifyResponse.ok) {
          router.push("/");
          setLoading(false);
          return;
        }

        const verifyData = await verifyResponse.json();
        const userRole = verifyData.user?.role;

        if (!isMounted) return;

        if (requiredRole !== null && userRole !== requiredRole) {
          if (userRole) {
            router.push(`/${userRole}`);
          } else {
            router.push("/");
          }
          setLoading(false);
          return;
        }

        if (requiredRole === null) {
          const userData = {
            ...verifyData.user,
            idToken: token,
          };
          setUser(userData);
          setProfileCompleted(true);
          if (onAuthSuccess) {
            onAuthSuccess(userData);
          }
          setLoading(false);
          return;
        }

        setProfileCompleted(true);
        const userData = {
          ...verifyData.user,
          idToken: token,
        };
        setUser(userData);

        if (onAuthSuccess) {
          onAuthSuccess(userData);
        }
        setLoading(false);
      } catch (error) {
        if (!isMounted) return;
        console.error(
          "Error verifying user:",
          error instanceof Error ? error.message : String(error)
        );
        router.push("/");
        setLoading(false);
      }
    };

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        if (isMounted) {
          router.push("/");
          setLoading(false);
        }
        return;
      }

      void verifyUserAuth(currentUser);
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [router, requiredRole, onAuthSuccess]);

  if (loading) {
    return <Loading />;
  }

  if (user && !profileCompleted && idToken) {
    return (
      <PageContainer>
        <MainLayout>
          <ProfileSetup idToken={idToken} />
        </MainLayout>
      </PageContainer>
    );
  }

  return <>{children}</>;
};

export default AuthGuard;
