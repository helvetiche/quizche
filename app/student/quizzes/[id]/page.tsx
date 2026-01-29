/* eslint-disable @typescript-eslint/no-misused-promises, @typescript-eslint/restrict-template-expressions, no-alert */
/* eslint-disable @typescript-eslint/strict-boolean-expressions, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unnecessary-condition, @typescript-eslint/prefer-nullish-coalescing, @typescript-eslint/explicit-function-return-type, @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import AuthGuard from "../../../components/auth/AuthGuard";
import DashboardLayout from "../../../components/layout/DashboardLayout";
import Loading from "../../../components/ui/Loading";
import QuizWarningModal from "../../../components/create/QuizWarningModal";
import { useAntiCheat } from "../../../components/create/useAntiCheat";
import Image from "next/image";

type User = {
  uid: string;
  email: string;
};

type Question = {
  question: string;
  type: string;
  choices?: string[];
  imageUrl?: string;
};

type Quiz = {
  id: string;
  title: string;
  description?: string;
  questions: Question[];
  totalQuestions: number;
  duration?: number;
  allowRetake: boolean;
  showResults: boolean;
  antiCheat?: {
    enabled?: boolean;
    tabChangeLimit?: number;
    timeAwayThreshold?: number;
    autoDisqualifyOnRefresh?: boolean;
    autoSubmitOnDisqualification?: boolean;
  };
};

export default function TakeQuizPage() {
  const params = useParams();
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
    quizId: params.id as string,
    userId: user?.uid ?? "",
    sessionId,
    enabled: quizStarted && !!sessionId && quiz?.antiCheat?.enabled !== false,
    idToken,
    config: quiz?.antiCheat,
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser !== undefined && currentUser !== null) {
        try {
          const token = await currentUser.getIdToken();
          setIdToken(token);
        } catch (error) {
          console.error("Error getting token:", error);
        }
      } else {
        setIdToken(null);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchQuiz = async (): Promise<void> => {
      if (!idToken || !params.id) return;

      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/quizzes/${params.id}`, {
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to fetch quiz");
        }

        setQuiz(data.quiz);
        if (data.quiz.duration !== undefined && data.quiz.duration !== null) {
          setTimeRemaining(data.quiz.duration * 60); // Convert minutes to seconds
        }

        // Check if student has already taken this quiz
        const attemptsResponse = await fetch(`/api/users/history`, {
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        });

        let hasTakenQuiz = false;
        if (attemptsResponse.ok !== undefined && attemptsResponse.ok !== null) {
          const attemptsData = await attemptsResponse.json();
          hasTakenQuiz =
            attemptsData.attempts?.some(
              (attempt: any) => attempt.quizId === params.id
            ) ?? false;
          setAlreadyTaken(hasTakenQuiz);
        }

        // Check for refresh detection
        const refreshKey = `quiz_refresh_${params.id}_${user?.uid}`;
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
  }, [idToken, params.id, user?.uid]);

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

    return () => clearInterval(timer);
  }, [timeRemaining, quizStarted]);

  // Auto-submit quiz when disqualified
  useEffect(() => {
    if (
      !quizStarted ||
      !antiCheat.isDisqualified ||
      submitting ||
      !quiz ||
      !idToken ||
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
        if (sessionId !== undefined && sessionId !== null) {
          try {
            const { apiDelete } = await import("../../../lib/api");
            await apiDelete(
              `/api/student/quizzes/${params.id}/session?sessionId=${sessionId}`,
              {
                idToken,
              }
            );
          } catch (err) {
            console.error("Error ending session:", err);
          }
        }

        // Clean up sessionStorage
        if (
          sessionKeyRef.current !== undefined &&
          sessionKeyRef.current !== null
        ) {
          sessionStorage.removeItem(sessionKeyRef.current);
        }

        const { apiPost } = await import("../../../lib/api");
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
              details: v.details,
            })),
            disqualified: true,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          const errorData = await response
            .json()
            .catch(() => ({ error: "Failed to submit quiz" }));
          // If already taken, don't show error, just redirect
          if (
            errorData.error !== undefined &&
            errorData.error.includes("already taken")
          ) {
            setAlreadyTaken(true);
            router.push("/student");
            return;
          }
          throw new Error(errorData.error || "Failed to submit quiz");
        }

        // Show disqualification message and redirect
        if (
          antiCheat.refreshDetected !== undefined &&
          antiCheat.refreshDetected !== null
        ) {
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

        if (quiz.showResults !== undefined && quiz.showResults !== null) {
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
    params.id,
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
    if (!idToken || !quiz || !user) return;

    try {
      // Create active session
      const { apiPost: apiPostSession } = await import("../../../lib/api");
      const sessionResponse = await apiPostSession(
        `/api/student/quizzes/${params.id}/session`,
        {
          headers: {
            "Content-Type": "application/json",
          },
          idToken,
        }
      );

      const sessionData = await sessionResponse.json();

      if (!sessionResponse.ok) {
        throw new Error(sessionData.error || "Failed to create session");
      }

      setSessionId(sessionData.sessionId);
      sessionKeyRef.current = `quiz_session_${params.id}_${user.uid}`;
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
      !idToken ||
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
      if (sessionId !== undefined && sessionId !== null) {
        try {
          const { apiDelete } = await import("../../../lib/api");
          await apiDelete(
            `/api/student/quizzes/${params.id}/session?sessionId=${sessionId}`,
            {
              idToken,
            }
          );
        } catch (err) {
          console.error("Error ending session:", err);
        }
      }

      // Clean up sessionStorage
      if (
        sessionKeyRef.current !== undefined &&
        sessionKeyRef.current !== null
      ) {
        sessionStorage.removeItem(sessionKeyRef.current);
      }

      const { apiPost } = await import("../../../lib/api");
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
            details: v.details,
          })),
          disqualified: antiCheat.isDisqualified,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // If already taken, don't show error, just redirect
        if (data.error !== undefined && data.error.includes("already taken")) {
          setAlreadyTaken(true);
          console.error(
            "You have already taken this quiz. Each quiz can only be taken once."
          );
          router.push("/student");
          return;
        }
        throw new Error(data.error || "Failed to submit quiz");
      }

      if (quiz.showResults !== undefined && quiz.showResults !== null) {
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

  if (loading && !idToken) {
    return <Loading />;
  }

  return (
    <AuthGuard requiredRole="student" onAuthSuccess={setUser}>
      <DashboardLayout
        title="QuizChe - Take Quiz"
        userEmail={user?.email}
        userRole="student"
      >
        <QuizWarningModal
          isOpen={showWarning}
          onAccept={() => void handleStartQuiz()}
          onCancel={handleCancelWarning}
        />

        <div className="flex flex-col gap-8 max-w-4xl mx-auto">
          {error ? (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <p className="text-lg font-light text-red-600">{error}</p>
              <button
                onClick={() => router.push("/student")}
                className="px-6 py-3 bg-gray-200 text-black font-light hover:bg-gray-300 transition-colors"
              >
                Back to Dashboard
              </button>
            </div>
          ) : quiz ? (
            alreadyTaken ? (
              <div className="flex flex-col items-center justify-center py-12 gap-4">
                <p className="text-lg font-light text-red-600">
                  You have already taken this quiz. Each quiz can only be taken
                  once.
                </p>
                <button
                  onClick={() => router.push("/student")}
                  className="px-6 py-3 bg-gray-200 text-black font-light hover:bg-gray-300 transition-colors"
                >
                  Back to Dashboard
                </button>
              </div>
            ) : !quizStarted ? (
              <div className="flex flex-col items-center justify-center py-12 gap-4">
                <p className="text-lg font-light text-black">
                  Please accept the quiz integrity policy to begin.
                </p>
              </div>
            ) : (
              <>
                {cheatingAlert && (
                  <div
                    className={`p-4 border-2 ${
                      antiCheat.isDisqualified
                        ? "bg-red-50 border-red-600 text-red-800"
                        : "bg-yellow-50 border-yellow-600 text-yellow-800"
                    }`}
                  >
                    <p className="font-light">{cheatingAlert}</p>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div className="flex flex-col gap-2">
                    <h2 className="text-3xl font-light text-black">
                      {quiz.title}
                    </h2>
                    {quiz.description && (
                      <p className="text-lg font-light text-gray-600">
                        {quiz.description}
                      </p>
                    )}
                  </div>
                  {timeRemaining !== null && (
                    <div className="px-6 py-3 bg-black text-white font-light">
                      Time Remaining: {formatTime(timeRemaining)}
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-6">
                  {quiz.questions.map((question, index) => (
                    <div
                      key={index}
                      className="flex flex-col gap-4 p-6 border-2 border-black bg-white"
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-lg font-light text-black min-w-[2rem]">
                          {index + 1}.
                        </span>
                        <div className="flex-1 flex flex-col gap-4">
                          <p className="text-lg font-light text-black">
                            {question.question}
                          </p>

                          {question.imageUrl && (
                            <div className="relative w-full max-w-2xl h-96 border-2 border-gray-300">
                              <Image
                                src={question.imageUrl}
                                alt="Question image"
                                fill
                                className="object-contain"
                              />
                            </div>
                          )}

                          {question.type === "multiple_choice" &&
                          question.choices ? (
                            <div className="flex flex-col gap-2">
                              {question.choices.map((choice, choiceIndex) => (
                                <label
                                  key={choiceIndex}
                                  className="flex items-center gap-3 cursor-pointer p-2 hover:bg-gray-50"
                                >
                                  <input
                                    type="radio"
                                    name={`question-${index}`}
                                    value={choice}
                                    checked={answers[index] === choice}
                                    onChange={(e) =>
                                      handleAnswerChange(index, e.target.value)
                                    }
                                    className="w-5 h-5 border-2 border-black"
                                    disabled={antiCheat.isDisqualified}
                                  />
                                  <span className="font-light text-black">
                                    {choice}
                                  </span>
                                </label>
                              ))}
                            </div>
                          ) : question.type === "true_or_false" ? (
                            <div className="flex gap-4">
                              <label className="flex items-center gap-3 cursor-pointer p-2 hover:bg-gray-50">
                                <input
                                  type="radio"
                                  name={`question-${index}`}
                                  value="true"
                                  checked={answers[index] === "true"}
                                  onChange={(e) =>
                                    handleAnswerChange(index, e.target.value)
                                  }
                                  className="w-5 h-5 border-2 border-black"
                                  disabled={antiCheat.isDisqualified}
                                />
                                <span className="font-light text-black">
                                  True
                                </span>
                              </label>
                              <label className="flex items-center gap-3 cursor-pointer p-2 hover:bg-gray-50">
                                <input
                                  type="radio"
                                  name={`question-${index}`}
                                  value="false"
                                  checked={answers[index] === "false"}
                                  onChange={(e) =>
                                    handleAnswerChange(index, e.target.value)
                                  }
                                  className="w-5 h-5 border-2 border-black"
                                  disabled={antiCheat.isDisqualified}
                                />
                                <span className="font-light text-black">
                                  False
                                </span>
                              </label>
                            </div>
                          ) : (
                            <textarea
                              value={answers[index] ?? ""}
                              onChange={(e) =>
                                handleAnswerChange(index, e.target.value)
                              }
                              className="w-full px-4 py-3 border-2 border-black bg-white text-black font-light focus:outline-none focus:ring-2 focus:ring-black resize-none"
                              placeholder="Type your answer here..."
                              rows={4}
                              disabled={antiCheat.isDisqualified}
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-4 justify-end">
                  <button
                    onClick={() => router.push("/student")}
                    className="px-6 py-3 bg-gray-200 text-black font-light hover:bg-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => void handleSubmit()}
                    disabled={submitting || antiCheat.isDisqualified}
                    className="px-6 py-3 bg-black text-white font-light hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {submitting && (
                      <svg
                        className="animate-spin h-5 w-5 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                    )}
                    {submitting ? "Submitting..." : "Submit Quiz"}
                  </button>
                </div>
              </>
            )
          ) : null}
        </div>
      </DashboardLayout>
    </AuthGuard>
  );
}
