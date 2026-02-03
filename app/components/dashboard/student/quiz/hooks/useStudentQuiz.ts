/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAntiCheat } from "../../../../create/useAntiCheat";
import type { Quiz, User } from "../types";

type ApiErrorResponse = {
  error?: string;
};

type QuizResponse = {
  quiz: Quiz;
  error?: string;
};

type SubmitResponse = {
  attemptId: string;
  error?: string;
};

type SessionResponse = {
  sessionId: string;
  error?: string;
};

type HistoryResponse = {
  attempts?: { quizId: string }[];
};

export function useStudentQuiz() {
  const params = useParams();
  const rawQuizId = params.id;
  const quizId = Array.isArray(rawQuizId) ? rawQuizId[0] : (rawQuizId ?? "");

  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [alreadyTaken, setAlreadyTaken] = useState(false);
  const [startTime, setStartTime] = useState<Date>(new Date());
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [showWarning, setShowWarning] = useState(false);
  const [quizStarted, setQuizStarted] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [cheatingAlert, setCheatingAlert] = useState<string | null>(null);
  const sessionKeyRef = useRef<string | null>(null);

  // Anti-cheat monitoring
  const antiCheat = useAntiCheat({
    quizId,
    userId: user?.uid ?? "",
    sessionId,
    enabled:
      quizStarted && sessionId !== null && quiz?.antiCheat?.enabled !== false,
    idToken,
    config: quiz?.antiCheat,
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      void (async () => {
        if (currentUser !== null) {
          try {
            const token = await currentUser.getIdToken();
            setIdToken(token);
            setUser({
              uid: currentUser.uid,
              email: currentUser.email ?? "",
            });
          } catch (error) {
            console.error("Error getting token:", error);
          }
        } else {
          setIdToken(null);
          setUser(null);
        }
      })();
    });

    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    const fetchQuiz = async (): Promise<void> => {
      if (idToken === null || quizId === "") return;

      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/quizzes/${quizId}`, {
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        });

        const data = (await response.json()) as QuizResponse;

        if (!response.ok) {
          throw new Error(data.error ?? "Failed to fetch quiz");
        }

        setQuiz(data.quiz);
        if (data.quiz.duration !== undefined) {
          setTimeRemaining(data.quiz.duration * 60); // Convert minutes to seconds
        }

        // Check if student has already taken this quiz
        const attemptsResponse = await fetch(`/api/users/history`, {
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        });

        let hasTakenQuiz = false;
        if (attemptsResponse.ok) {
          const attemptsData =
            (await attemptsResponse.json()) as HistoryResponse;
          hasTakenQuiz =
            attemptsData.attempts?.some(
              (attempt) => attempt.quizId === quizId
            ) ?? false;
          setAlreadyTaken(hasTakenQuiz);
        }

        // Check for refresh detection
        const refreshKey = `quiz_refresh_${quizId}_${user?.uid ?? ""}`;
        const hasRefresh = sessionStorage.getItem(refreshKey);
        if (hasRefresh === "true") {
          setError("You have been disqualified for refreshing the page.");
          sessionStorage.removeItem(refreshKey);
          return;
        }

        // Show warning modal if quiz not started
        if (!hasTakenQuiz) {
          setShowWarning(true);
        }
      } catch (err) {
        console.error("Error fetching quiz:", err);
        setError(err instanceof Error ? err.message : "Failed to load quiz");
      } finally {
        setLoading(false);
      }
    };

    void fetchQuiz();
  }, [idToken, quizId, user?.uid]);

  useEffect(() => {
    if (timeRemaining === null || timeRemaining <= 0 || !quizStarted) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev === null || prev <= 1) {
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, [timeRemaining, quizStarted]);

  // Auto-submit quiz when disqualified
  useEffect(() => {
    if (
      !quizStarted ||
      !antiCheat.isDisqualified ||
      submitting ||
      !quiz ||
      idToken === null ||
      alreadyTaken
    )
      return;

    const autoSubmitQuiz = async (): Promise<void> => {
      try {
        setSubmitting(true);
        setError(null);

        const endTime = new Date();
        const timeSpent = Math.floor(
          (endTime.getTime() - startTime.getTime()) / 1000
        );

        // End session
        if (sessionId !== null) {
          try {
            const { apiDelete } = await import("../../../../../lib/api");
            await apiDelete(
              `/api/student/quizzes/${quizId}/session?sessionId=${sessionId}`,
              {
                idToken,
              }
            );
          } catch (err) {
            console.error("Error ending session:", err);
          }
        }

        // Clean up sessionStorage
        if (sessionKeyRef.current !== null) {
          sessionStorage.removeItem(sessionKeyRef.current);
        }

        const { apiPost } = await import("../../../../../lib/api");
        const response = await apiPost("/api/student/quizzes/submit", {
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            quizId: quiz.id,
            sessionId,
            answers: Object.keys(answers).map((key) => ({
              questionIndex: parseInt(key),
              answer: answers[parseInt(key)],
            })),
            timeSpent,
            tabChangeCount: antiCheat.tabChangeCount,
            timeAway: antiCheat.timeAway,
            refreshDetected: antiCheat.refreshDetected,
            violations: antiCheat.violations.map((v) => ({
              type: v.type,
              timestamp: v.timestamp.toISOString(),
              details: v.details ?? "",
            })),
            disqualified: true,
          }),
        });

        if (!response.ok) {
          const errorData = (await response.json().catch(() => ({
            error: "Failed to submit quiz",
          }))) as ApiErrorResponse;
          // If already taken, don't show error, just redirect
          if (errorData.error?.includes("already taken") === true) {
            setAlreadyTaken(true);
            router.push("/student");
            return;
          }
          throw new Error(errorData.error ?? "Failed to submit quiz");
        }

        const data = (await response.json()) as SubmitResponse;

        // Show disqualification message and redirect
        if (antiCheat.refreshDetected !== null) {
          console.error(
            "You have been disqualified for refreshing the page. Your quiz has been automatically submitted."
          );
        } else if (antiCheat.tabChangeCount > 3) {
          console.error(
            `You have been disqualified for exceeding the tab change limit (${antiCheat.tabChangeCount}/3). Your quiz has been automatically submitted.`
          );
        } else {
          console.error(
            "You have been disqualified due to cheating violations. Your quiz has been automatically submitted."
          );
        }

        if (quiz.showResults) {
          router.push(
            `/student/quizzes/${quiz.id}/results?attemptId=${data.attemptId}`
          );
        } else {
          router.push("/student");
        }
      } catch (err) {
        console.error("Error auto-submitting quiz:", err);
        setError(err instanceof Error ? err.message : "Failed to submit quiz");
        // Still redirect after error
        setTimeout(() => {
          router.push("/student");
        }, 3000);
      } finally {
        setSubmitting(false);
      }
    };

    void autoSubmitQuiz();
  }, [
    antiCheat.isDisqualified,
    quizStarted,
    submitting,
    quiz,
    idToken,
    sessionId,
    quizId,
    startTime,
    answers,
    antiCheat.tabChangeCount,
    antiCheat.timeAway,
    antiCheat.refreshDetected,
    antiCheat.violations,
    router,
    alreadyTaken,
  ]);

  // Handle cheating violations (warnings only, not disqualification)
  useEffect(() => {
    if (!quizStarted || antiCheat.isDisqualified) return;

    if (antiCheat.tabChangeCount > 0) {
      setCheatingAlert(
        `Warning: You have switched tabs ${antiCheat.tabChangeCount} time(s). Maximum allowed is 3.`
      );
    } else if (antiCheat.timeAway > 5) {
      setCheatingAlert(
        `Warning: You have been away from the window for ${antiCheat.timeAway} seconds.`
      );
    } else {
      setCheatingAlert(null);
    }
  }, [
    antiCheat.tabChangeCount,
    antiCheat.timeAway,
    antiCheat.isDisqualified,
    quizStarted,
  ]);

  const handleStartQuiz = async (): Promise<void> => {
    if (idToken === null || !quiz || !user) return;

    try {
      // Create active session
      const { apiPost: apiPostSession } =
        await import("../../../../../lib/api");
      const sessionResponse = await apiPostSession(
        `/api/student/quizzes/${quizId}/session`,
        {
          headers: {
            "Content-Type": "application/json",
          },
          idToken,
        }
      );

      const sessionData = (await sessionResponse.json()) as SessionResponse;

      if (!sessionResponse.ok) {
        throw new Error(sessionData.error ?? "Failed to create session");
      }

      setSessionId(sessionData.sessionId);
      sessionKeyRef.current = `quiz_session_${quizId}_${user.uid}`;
      sessionStorage.setItem(sessionKeyRef.current, "true");
      setShowWarning(false);
      setQuizStarted(true);
      setStartTime(new Date());
    } catch (err) {
      console.error("Error starting quiz:", err);
      setError(err instanceof Error ? err.message : "Failed to start quiz");
    }
  };

  const handleCancelWarning = (): void => {
    router.push("/student");
  };

  const handleAnswerChange = (questionIndex: number, value: string): void => {
    setAnswers((prev) => ({
      ...prev,
      [questionIndex]: value,
    }));
  };

  const handleSubmit = async (): Promise<void> => {
    if (
      idToken === null ||
      !quiz ||
      submitting ||
      antiCheat.isDisqualified ||
      alreadyTaken
    )
      return;

    // Check if all questions are answered
    const unansweredQuestions = quiz.questions.filter(
      (_, index) => !answers[index] || answers[index].trim() === ""
    );

    if (unansweredQuestions.length > 0) {
      // eslint-disable-next-line no-alert
      const confirmSubmit = window.confirm(
        `You have ${unansweredQuestions.length} unanswered question(s). Do you want to submit anyway?`
      );
      if (!confirmSubmit) {
        return;
      }
    }

    try {
      setSubmitting(true);
      setError(null);

      const endTime = new Date();
      const timeSpent = Math.floor(
        (endTime.getTime() - startTime.getTime()) / 1000
      );

      // End session
      if (sessionId !== null) {
        try {
          const { apiDelete } = await import("../../../../../lib/api");
          await apiDelete(
            `/api/student/quizzes/${quizId}/session?sessionId=${sessionId}`,
            {
              idToken,
            }
          );
        } catch (err) {
          console.error("Error ending session:", err);
        }
      }

      // Clean up sessionStorage
      if (sessionKeyRef.current !== null) {
        sessionStorage.removeItem(sessionKeyRef.current);
      }

      const { apiPost } = await import("../../../../../lib/api");
      const response = await apiPost("/api/student/quizzes/submit", {
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          quizId: quiz.id,
          answers: Object.keys(answers).map((key) => ({
            questionIndex: parseInt(key),
            answer: answers[parseInt(key)],
          })),
          timeSpent,
          tabChangeCount: antiCheat.tabChangeCount,
          timeAway: antiCheat.timeAway,
          refreshDetected: antiCheat.refreshDetected,
          violations: antiCheat.violations.map((v) => ({
            type: v.type,
            timestamp: v.timestamp.toISOString(),
            details: v.details ?? "",
          })),
          disqualified: antiCheat.isDisqualified,
        }),
      });

      const data = (await response.json()) as SubmitResponse;

      if (!response.ok) {
        // If already taken, don't show error, just redirect
        if (data.error?.includes("already taken") === true) {
          setAlreadyTaken(true);
          console.error(
            "You have already taken this quiz. Each quiz can only be taken once."
          );
          router.push("/student");
          return;
        }
        throw new Error(data.error ?? "Failed to submit quiz");
      }

      if (quiz.showResults) {
        router.push(
          `/student/quizzes/${quiz.id}/results?attemptId=${data.attemptId}`
        );
      } else {
        console.error("Quiz submitted successfully");
        router.push("/student");
      }
    } catch (err) {
      console.error("Error submitting quiz:", err);
      setError(err instanceof Error ? err.message : "Failed to submit quiz");
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return {
    user,
    setUser,
    loading,
    error,
    quiz,
    answers,
    alreadyTaken,
    showWarning,
    quizStarted,
    cheatingAlert,
    timeRemaining,
    submitting,
    antiCheat,
    handleStartQuiz,
    handleCancelWarning,
    handleAnswerChange,
    handleSubmit,
    formatTime,
    idToken,
  };
}
