/* eslint-disable @typescript-eslint/strict-boolean-expressions, @typescript-eslint/no-unnecessary-condition, @typescript-eslint/no-floating-promises, @typescript-eslint/no-unused-vars */
"use client";

import { useState, useEffect, useRef, useCallback } from "react";

type Violation = {
  type: "tab_change" | "time_away" | "refresh";
  timestamp: Date;
  details?: string;
};

type AntiCheatConfig = {
  enabled?: boolean;
  tabChangeLimit?: number;
  timeAwayThreshold?: number;
  autoDisqualifyOnRefresh?: boolean;
  autoSubmitOnDisqualification?: boolean;
};

type UseAntiCheatOptions = {
  quizId: string;
  userId: string;
  sessionId: string | null;
  enabled: boolean;
  idToken: string | null;
  config?: AntiCheatConfig;
};

type UseAntiCheatReturn = {
  tabChangeCount: number;
  timeAway: number;
  isDisqualified: boolean;
  violations: Violation[];
  refreshDetected: boolean;
};

const DEFAULT_TAB_CHANGE_LIMIT = 3;
const DEFAULT_TIME_AWAY_THRESHOLD = 5; // seconds

export const useAntiCheat = ({
  quizId,
  userId,
  sessionId,
  enabled,
  idToken,
  config,
}: UseAntiCheatOptions): UseAntiCheatReturn => {
  const TAB_CHANGE_LIMIT = config?.tabChangeLimit ?? DEFAULT_TAB_CHANGE_LIMIT;
  const TIME_AWAY_THRESHOLD =
    config?.timeAwayThreshold ?? DEFAULT_TIME_AWAY_THRESHOLD;
  const AUTO_DISQUALIFY_ON_REFRESH = config?.autoDisqualifyOnRefresh !== false; // Default true
  const AUTO_SUBMIT_ON_DISQUALIFICATION =
    config?.autoSubmitOnDisqualification !== false; // Default true
  const [tabChangeCount, setTabChangeCount] = useState(0);
  const [timeAway, setTimeAway] = useState(0);
  const [isDisqualified, setIsDisqualified] = useState(false);
  const [violations, setViolations] = useState<Violation[]>([]);
  const [refreshDetected, setRefreshDetected] = useState(false);

  const awayStartTimeRef = useRef<number | null>(null);
  const lastVisibilityStateRef = useRef<boolean>(true);
  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const addViolation = useCallback(
    (type: Violation["type"], details?: string) => {
      const violation: Violation = {
        type,
        timestamp: new Date(),
        details,
      };

      setViolations((prev) => {
        const newViolations = [...prev, violation];

        if (sessionId && enabled !== undefined && enabled !== null && idToken) {
          import("../../lib/api").then(({ apiPut }) => {
            apiPut(`/api/student/quizzes/${quizId}/session`, {
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                sessionId,
                violations: newViolations.map((v) => ({
                  type: v.type,
                  timestamp: v.timestamp.toISOString(),
                  details: v.details,
                })),
              }),
              idToken,
            }).catch((error) => {
              console.error("Error updating session violation:", error);
            });
          });
        }

        return newViolations;
      });
    },
    [sessionId, enabled, idToken, quizId]
  );

  const updateSession = useCallback(() => {
    if (
      sessionId &&
      enabled !== undefined &&
      enabled !== null &&
      !isDisqualified &&
      idToken
    ) {
      import("../../lib/api").then(({ apiPut }) => {
        apiPut(`/api/student/quizzes/${quizId}/session`, {
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sessionId,
            tabChangeCount,
            timeAway,
          }),
          idToken,
        }).catch((error) => {
          console.error("Error updating session:", error);
        });
      });
    }
  }, [
    sessionId,
    enabled,
    tabChangeCount,
    timeAway,
    isDisqualified,
    idToken,
    quizId,
  ]);

  // Tab visibility detection
  useEffect(() => {
    if (!enabled) return;

    const handleVisibilityChange = (): void => {
      const isVisible = !document.hidden;

      if (!isVisible && lastVisibilityStateRef.current) {
        const newCount = tabChangeCount + 1;
        setTabChangeCount(newCount);

        addViolation(
          "tab_change",
          `Tab switched away (${newCount}/${TAB_CHANGE_LIMIT})`
        );

        if (newCount > TAB_CHANGE_LIMIT) {
          setIsDisqualified(true);
          addViolation(
            "tab_change",
            "Exceeded tab change limit - disqualified"
          );
          if (sessionId && idToken) {
            import("../../lib/api").then(({ apiPut }) => {
              apiPut(`/api/student/quizzes/${quizId}/session`, {
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  sessionId,
                  disqualified: true,
                }),
                idToken,
              }).catch((error) => {
                console.error("Error updating disqualification:", error);
              });
            });
          }
        }
      }

      lastVisibilityStateRef.current = isVisible;
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [
    enabled,
    tabChangeCount,
    addViolation,
    sessionId,
    idToken,
    quizId,
    TAB_CHANGE_LIMIT,
  ]);

  // Window focus/blur detection for time away tracking
  useEffect(() => {
    if (!enabled) return;

    const handleBlur = (): void => {
      awayStartTimeRef.current = Date.now();
    };

    const handleFocus = (): void => {
      if (
        awayStartTimeRef.current !== undefined &&
        awayStartTimeRef.current !== null
      ) {
        const timeAwaySeconds = Math.floor(
          (Date.now() - awayStartTimeRef.current) / 1000
        );
        const newTimeAway = timeAway + timeAwaySeconds;
        setTimeAway(newTimeAway);

        if (timeAwaySeconds > TIME_AWAY_THRESHOLD) {
          addViolation(
            "time_away",
            `Away for ${timeAwaySeconds} seconds (threshold: ${TIME_AWAY_THRESHOLD}s)`
          );
        }

        awayStartTimeRef.current = null;
      }
    };

    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);

    return () => {
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
    };
  }, [enabled, timeAway, addViolation, TIME_AWAY_THRESHOLD]);

  // Refresh detection
  useEffect(() => {
    if (!enabled) return;

    const sessionKey = `quiz_session_${quizId}_${userId}`;
    const refreshKey = `quiz_refresh_${quizId}_${userId}`;

    // Check if this is a refresh
    const hasRefreshFlag = sessionStorage.getItem(refreshKey);
    if (hasRefreshFlag === "true" && AUTO_DISQUALIFY_ON_REFRESH) {
      setRefreshDetected(true);
      setIsDisqualified(true);
      addViolation("refresh", "Page refresh detected - disqualified");
      // Update session to mark as disqualified
      if (sessionId && idToken) {
        import("../../lib/api").then(({ apiPut }) => {
          apiPut(`/api/student/quizzes/${quizId}/session`, {
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              sessionId,
              disqualified: true,
            }),
            idToken,
          }).catch((error) => {
            console.error("Error updating disqualification:", error);
          });
        });
      }
      sessionStorage.removeItem(refreshKey);
      return;
    }

    // Set refresh flag on beforeunload (only if auto-disqualify is enabled)
    const handleBeforeUnload = (): void => {
      if (
        AUTO_DISQUALIFY_ON_REFRESH !== undefined &&
        AUTO_DISQUALIFY_ON_REFRESH !== null
      ) {
        const hasSession = sessionStorage.getItem(sessionKey);
        if (hasSession === "true") {
          sessionStorage.setItem(refreshKey, "true");
        }
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [
    enabled,
    quizId,
    userId,
    addViolation,
    sessionId,
    idToken,
    AUTO_DISQUALIFY_ON_REFRESH,
  ]);

  // Periodic session updates (every 3 seconds)
  useEffect(() => {
    if (!enabled || !sessionId || isDisqualified) return;

    updateIntervalRef.current = setInterval(() => {
      updateSession();
    }, 3000);

    return () => {
      if (
        updateIntervalRef.current !== undefined &&
        updateIntervalRef.current !== null
      ) {
        clearInterval(updateIntervalRef.current);
      }
    };
  }, [enabled, sessionId, isDisqualified, updateSession]);

  return {
    tabChangeCount,
    timeAway,
    isDisqualified,
    violations,
    refreshDetected,
  };
};
