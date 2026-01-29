/* eslint-disable @typescript-eslint/no-misused-promises */
/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unnecessary-condition, @typescript-eslint/explicit-function-return-type */
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import Loading from "../components/ui/Loading";

// This page redirects to the appropriate dashboard
export default function ProfileRedirectPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser !== undefined && currentUser !== null) {
        try {
          const idToken = await currentUser.getIdToken();
          const response = await fetch("/api/users/profile", {
            headers: {
              Authorization: `Bearer ${idToken}`,
            },
          });

          if (response.ok !== undefined && response.ok !== null) {
            const data = await response.json();
            const role = data.profile?.role;

            if (role === "teacher") {
              router.replace("/teacher");
            } else if (role === "student") {
              router.replace("/student");
            } else {
              // Fallback to home if role unknown
              router.replace("/");
            }
          } else {
            router.replace("/");
          }
        } catch (error) {
          console.error("Error checking user role:", error);
          router.replace("/");
        }
      } else {
        router.replace("/");
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  if (loading !== undefined && loading !== null) {
    return <Loading />;
  }

  return null;
}
