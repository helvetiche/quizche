/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/explicit-function-return-type, @typescript-eslint/no-floating-promises */
"use client";

import { useState, useEffect, useCallback } from "react";
import { getAuth } from "firebase/auth";
import app from "@/lib/firebase";

export type BadgeCounts = {
  quizzes: number;
  sections: number;
  flashcards: number;
  history: number;
  connections: number;
};

// Validate and sanitize count to prevent injection/overflow
const sanitizeCount = (value: unknown): number => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0;
  }
  // Clamp to reasonable bounds (0 to 9999)
  return Math.max(0, Math.min(Math.floor(value), 9999));
};

// Validate userRole to prevent injection
const isValidRole = (role: unknown): role is "teacher" | "student" => {
  return role === "teacher" || role === "student";
};

export const useNavigationBadges = (
  userRole: "teacher" | "student" | null | undefined
) => {
  const [badges, setBadges] = useState<BadgeCounts>({
    quizzes: 0,
    sections: 0,
    flashcards: 0,
    history: 0,
    connections: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchBadgeCounts = useCallback(async () => {
    // Validate userRole before proceeding
    if (!userRole || !isValidRole(userRole)) {
      setLoading(false);
      return;
    }

    try {
      const auth = getAuth(app);
      const currentUser = auth.currentUser;

      if (!currentUser) {
        setLoading(false);
        return;
      }

      // Get fresh token - Firebase handles token validation
      const token = await currentUser.getIdToken();

      const newBadges: BadgeCounts = {
        quizzes: 0,
        sections: 0,
        flashcards: 0,
        history: 0,
        connections: 0,
      };

      // Use AbortController for request timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

      try {
        if (userRole === "teacher") {
          const [quizzesRes, sectionsRes] = await Promise.allSettled([
            fetch("/api/quizzes", {
              headers: { Authorization: `Bearer ${token}` },
              signal: controller.signal,
            }),
            fetch("/api/teacher/sections", {
              headers: { Authorization: `Bearer ${token}` },
              signal: controller.signal,
            }),
          ]);

          if (quizzesRes.status === "fulfilled" && quizzesRes.value.ok) {
            const data = await quizzesRes.value.json();
            if (Array.isArray(data.quizzes)) {
              newBadges.quizzes = sanitizeCount(data.quizzes.length);
            }
          }

          if (sectionsRes.status === "fulfilled" && sectionsRes.value.ok) {
            const data = await sectionsRes.value.json();
            if (Array.isArray(data.sections)) {
              newBadges.sections = sanitizeCount(data.sections.length);
            }
          }
        }

        if (userRole === "student") {
          const [quizzesRes, flashcardsRes, connectionsRes] =
            await Promise.allSettled([
              fetch("/api/student/quizzes", {
                headers: { Authorization: `Bearer ${token}` },
                signal: controller.signal,
              }),
              fetch("/api/flashcards", {
                headers: { Authorization: `Bearer ${token}` },
                signal: controller.signal,
              }),
              fetch("/api/connections", {
                headers: { Authorization: `Bearer ${token}` },
                signal: controller.signal,
              }),
            ]);

          if (quizzesRes.status === "fulfilled" && quizzesRes.value.ok) {
            const data = await quizzesRes.value.json();
            if (Array.isArray(data.quizzes)) {
              newBadges.quizzes = sanitizeCount(data.quizzes.length);
            }
          }

          if (flashcardsRes.status === "fulfilled" && flashcardsRes.value.ok) {
            const data = await flashcardsRes.value.json();
            if (Array.isArray(data.flashcards)) {
              newBadges.flashcards = sanitizeCount(data.flashcards.length);
            }
          }

          if (
            connectionsRes.status === "fulfilled" &&
            connectionsRes.value.ok
          ) {
            const data = await connectionsRes.value.json();
            if (Array.isArray(data.connections)) {
              const pendingConnections = data.connections.filter(
                (c: unknown) =>
                  typeof c === "object" &&
                  c !== null &&
                  "status" in c &&
                  (c as { status: string }).status === "pending"
              );
              newBadges.connections = sanitizeCount(pendingConnections.length);
            }
          }
        }
      } finally {
        clearTimeout(timeoutId);
      }

      setBadges(newBadges);
    } catch (error) {
      // Silently fail - don't expose error details to console in production
      if (process.env.NODE_ENV === "development") {
        console.error("Error fetching badge counts:", error);
      }
    } finally {
      setLoading(false);
    }
  }, [userRole]);

  useEffect(() => {
    fetchBadgeCounts();
  }, [fetchBadgeCounts]);

  return { badges, loading };
};
