"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { getCSRFToken, clearCSRFToken } from "@/app/lib/csrf";
import { apiFetch } from "@/app/lib/api";

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
        clearCSRFToken(); // Clear CSRF token on logout
        setLoading(false);
        return;
      }

      try {
        const token = await currentUser.getIdToken();
        setIdToken(token);

        // Fetch CSRF token after authentication
        await getCSRFToken(token);

        const loginResponse = await apiFetch("/api/auth/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ idToken: token }),
          idToken: token,
          requireCSRF: false, // Login doesn't require CSRF
        });

        if (loginResponse.ok) {
          const loginData = await loginResponse.json();
          const role = loginData.user?.role || null;
          setUserRole(role);
          setUser(currentUser);

          if (role) {
            const profileResponse = await apiFetch("/api/users/profile", {
              headers: {},
              idToken: token,
              requireCSRF: false, // GET request doesn't need CSRF
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
      const profileResponse = await apiFetch("/api/users/profile", {
        headers: {},
        idToken: token,
        requireCSRF: false, // GET request doesn't need CSRF
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
