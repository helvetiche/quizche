"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";

interface AuthUser {
  uid: string;
  email?: string;
  role: string | null;
  tier: string;
}

export const useAuth = () => {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
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
          setUser(currentUser);

          if (role) {
            const profileResponse = await fetch("/api/users/profile", {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            });

            if (profileResponse.ok) {
              const profileData = await profileResponse.json();
              const completed = profileData.profile?.profileCompleted || false;
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
        console.error("Error checking user role:", error);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  const handleLoginSuccess = (role: string | null, token: string) => {
    setIdToken(token);
    setUserRole(role);
    if (role) {
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
        const completed = profileData.profile?.profileCompleted || false;
        setProfileCompleted(completed);

        if (completed) {
          router.push(`/${role}`);
        }
      } else {
        setProfileCompleted(false);
      }
    } catch (error) {
      console.error("Error checking profile:", error);
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
