/* eslint-disable @typescript-eslint/no-misused-promises */
/* eslint-disable @typescript-eslint/strict-boolean-expressions, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unnecessary-condition, @typescript-eslint/prefer-nullish-coalescing, @typescript-eslint/explicit-function-return-type, @typescript-eslint/no-floating-promises */
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";

export const useAuth = (): {
  user: unknown;
  userRole: string | null;
  profileCompleted: boolean | null;
  idToken: string | null;
  loading: boolean;
  handleLoginSuccess: (role: string | null, token: string) => void;
} => {
  const router = useRouter();
  const [user, setUser] = useState<unknown>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [profileCompleted, setProfileCompleted] = useState<boolean | null>(
    null
  );
  const [idToken, setIdToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        setUser(null);
        setUserRole(null);
        setProfileCompleted(null);
        setIdToken(null);
        setLoading(false);
        return;
      }

      try {
        const token = await currentUser.getIdToken();
        setIdToken(token);
        setUser(currentUser);

        const loginResponse = await fetch("/api/auth/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ idToken: token }),
        });

        if (loginResponse.ok) {
          const loginData = await loginResponse.json();
          const role = loginData.user?.role || null;
          setUserRole(role);

          if (role) {
            const profileResponse = await fetch("/api/users/profile", {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            });

            if (profileResponse.ok) {
              const profileData = await profileResponse.json();
              const completed = profileData.profile?.profileCompleted ?? false;
              setProfileCompleted(completed);

              if (completed) {
                router.push(`/${role}`);
                return;
              }
            } else {
              setProfileCompleted(false);
            }
          }
        }
      } catch (error) {
        console.error(
          "Error checking user role:",
          error instanceof Error ? error.message : String(error)
        );
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  const handleLoginSuccess = (role: string | null, token: string): void => {
    setIdToken(token);
    setUserRole(role);
    if (role !== undefined && role !== null) {
      checkProfileCompletion(role, token);
    }
  };

  const checkProfileCompletion = async (role: string, token: string) => {
    try {
      const profileResponse = await fetch("/api/users/profile", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (profileResponse.ok) {
        const profileData = await profileResponse.json();
        const completed = profileData.profile?.profileCompleted ?? false;
        setProfileCompleted(completed);

        if (completed) {
          router.push(`/${role}`);
        }
      } else {
        setProfileCompleted(false);
      }
    } catch (error) {
      console.error(
        "Error checking profile:",
        error instanceof Error ? error.message : String(error)
      );
      setProfileCompleted(false);
    }
  };

  return {
    user,
    userRole,
    profileCompleted,
    idToken,
    loading,
    handleLoginSuccess,
  };
};
