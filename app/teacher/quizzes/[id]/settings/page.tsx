"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import AuthGuard from "../../../../components/auth/AuthGuard";
import DashboardLayout from "../../../../components/layout/DashboardLayout";
import Loading from "../../../../components/ui/Loading";
import Link from "next/link";

interface Quiz {
  id: string;
  title: string;
  isActive: boolean;
  duration?: number;
  availableDate?: string;
  dueDate?: string;
  allowRetake?: boolean;
  showResults?: boolean;
}

export default function QuizSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(true);
  const [duration, setDuration] = useState<number | null>(null);
  const [availableDate, setAvailableDate] = useState<string>("");
  const [availableTime, setAvailableTime] = useState<string>("");
  const [dueDate, setDueDate] = useState<string>("");
  const [dueTime, setDueTime] = useState<string>("");
  const [allowRetake, setAllowRetake] = useState(false);
  const [showResults, setShowResults] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
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
    const fetchQuiz = async () => {
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
        setIsActive(
          data.quiz.isActive !== undefined ? data.quiz.isActive : true
        );
        setDuration(data.quiz.duration || null);

        if (data.quiz.availableDate) {
          const date = new Date(data.quiz.availableDate);
          setAvailableDate(date.toISOString().slice(0, 10));
          setAvailableTime(date.toTimeString().slice(0, 5));
        } else {
          setAvailableDate("");
          setAvailableTime("");
        }

        if (data.quiz.dueDate) {
          const date = new Date(data.quiz.dueDate);
          setDueDate(date.toISOString().slice(0, 10));
          setDueTime(date.toTimeString().slice(0, 5));
        } else {
          setDueDate("");
          setDueTime("");
        }

        setAllowRetake(
          data.quiz.allowRetake !== undefined ? data.quiz.allowRetake : false
        );
        setShowResults(
          data.quiz.showResults !== undefined ? data.quiz.showResults : true
        );
      } catch (err) {
        console.error("Error fetching quiz:", err);
        setError(err instanceof Error ? err.message : "Failed to load quiz");
      } finally {
        setLoading(false);
      }
    };

    fetchQuiz();
  }, [idToken, params.id]);

  const handleSave = async () => {
    if (!idToken || !params.id || !quiz) return;

    try {
      setSaving(true);
      setError(null);

      const quizResponse = await fetch(`/api/quizzes/${params.id}`, {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });

      const quizData = await quizResponse.json();

      if (!quizResponse.ok) {
        throw new Error(quizData.error || "Failed to fetch quiz data");
      }

      const availableDateTime =
        availableDate && availableTime
          ? new Date(`${availableDate}T${availableTime}`).toISOString()
          : null;

      const dueDateTime =
        dueDate && dueTime
          ? new Date(`${dueDate}T${dueTime}`).toISOString()
          : null;

      const response = await fetch(`/api/quizzes/${params.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          title: quizData.quiz.title,
          description: quizData.quiz.description || "",
          questions: quizData.quiz.questions,
          isActive,
          duration: duration || null,
          availableDate: availableDateTime,
          dueDate: dueDateTime,
          allowRetake,
          showResults,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update quiz settings");
      }

      alert("Quiz settings updated successfully!");
      router.push(`/teacher/quizzes/${params.id}`);
    } catch (err) {
      console.error("Error updating quiz:", err);
      setError(
        err instanceof Error ? err.message : "Failed to update settings"
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading && !idToken) {
    return <Loading />;
  }

  return (
    <AuthGuard requiredRole="teacher" onAuthSuccess={setUser}>
      <DashboardLayout
        title="QuizChe - Quiz Settings"
        userEmail={user?.email}
        userRole="teacher"
      >
        <div className="flex flex-col gap-8">
          <div className="flex items-center justify-between">
            <h2 className="text-3xl font-light text-black">Quiz Settings</h2>
            <div className="flex gap-3">
              <Link
                href={`/teacher/quizzes/${params.id}`}
                className="px-4 py-2 bg-gray-200 text-black font-light hover:bg-gray-300 transition-colors"
              >
                Back to Quiz
              </Link>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-black font-light">Loading settings...</div>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <p className="text-lg font-light text-red-600">{error}</p>
              <button
                onClick={() => router.back()}
                className="px-6 py-3 bg-gray-200 text-black font-light hover:bg-gray-300 transition-colors"
              >
                Go Back
              </button>
            </div>
          ) : quiz ? (
            <div className="flex flex-col gap-8 max-w-2xl">
              <div className="flex flex-col gap-4 p-6 border-2 border-black bg-white">
                <h3 className="text-xl font-light text-black mb-2">
                  {quiz.title}
                </h3>

                <div className="flex flex-col gap-6">
                  <div className="flex flex-col gap-4">
                    <h4 className="text-lg font-light text-black">
                      Quiz Status
                    </h4>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isActive}
                        onChange={(e) => setIsActive(e.target.checked)}
                        className="w-5 h-5 border-2 border-black"
                      />
                      <div className="flex flex-col">
                        <span className="text-base font-light text-black">
                          Active
                        </span>
                        <span className="text-sm font-light text-gray-600">
                          {isActive
                            ? "Students can access and take this quiz"
                            : "Quiz is hidden from students"}
                        </span>
                      </div>
                    </label>
                  </div>

                  <div className="flex flex-col gap-4 pt-4 border-t-2 border-gray-200">
                    <h4 className="text-lg font-light text-black">
                      Duration & Timing
                    </h4>
                    <div className="flex flex-col gap-4">
                      <div className="flex flex-col gap-2">
                        <label className="text-base font-light text-black">
                          Duration (minutes)
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={duration || ""}
                          onChange={(e) =>
                            setDuration(
                              e.target.value ? parseInt(e.target.value) : null
                            )
                          }
                          className="w-full px-4 py-3 border-2 border-black bg-white text-black font-light focus:outline-none focus:ring-2 focus:ring-black"
                          placeholder="Enter duration in minutes (optional)"
                        />
                        <span className="text-sm font-light text-gray-600">
                          Leave empty for no time limit
                        </span>
                      </div>

                      <div className="flex flex-col gap-2">
                        <label className="text-base font-light text-black">
                          Available From
                        </label>
                        <div className="flex gap-3">
                          <div className="flex-1 flex flex-col gap-1">
                            <label className="text-sm font-light text-gray-600">
                              Date
                            </label>
                            <input
                              type="date"
                              value={availableDate}
                              onChange={(e) => setAvailableDate(e.target.value)}
                              className="w-full px-4 py-3 border-2 border-black bg-white text-black font-light focus:outline-none focus:ring-2 focus:ring-black"
                            />
                          </div>
                          <div className="flex-1 flex flex-col gap-1">
                            <label className="text-sm font-light text-gray-600">
                              Time
                            </label>
                            <input
                              type="time"
                              value={availableTime}
                              onChange={(e) => setAvailableTime(e.target.value)}
                              className="w-full px-4 py-3 border-2 border-black bg-white text-black font-light focus:outline-none focus:ring-2 focus:ring-black"
                            />
                          </div>
                        </div>
                        <span className="text-sm font-light text-gray-600">
                          Date and time when students can start taking the quiz
                        </span>
                      </div>

                      <div className="flex flex-col gap-2">
                        <label className="text-base font-light text-black">
                          Due Date
                        </label>
                        <div className="flex gap-3">
                          <div className="flex-1 flex flex-col gap-1">
                            <label className="text-sm font-light text-gray-600">
                              Date
                            </label>
                            <input
                              type="date"
                              value={dueDate}
                              onChange={(e) => setDueDate(e.target.value)}
                              className="w-full px-4 py-3 border-2 border-black bg-white text-black font-light focus:outline-none focus:ring-2 focus:ring-black"
                            />
                          </div>
                          <div className="flex-1 flex flex-col gap-1">
                            <label className="text-sm font-light text-gray-600">
                              Time
                            </label>
                            <input
                              type="time"
                              value={dueTime}
                              onChange={(e) => setDueTime(e.target.value)}
                              className="w-full px-4 py-3 border-2 border-black bg-white text-black font-light focus:outline-none focus:ring-2 focus:ring-black"
                            />
                          </div>
                        </div>
                        <span className="text-sm font-light text-gray-600">
                          Last date and time to submit the quiz
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-4 pt-4 border-t-2 border-gray-200">
                    <h4 className="text-lg font-light text-black">
                      Quiz Options
                    </h4>
                    <div className="flex flex-col gap-4">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={allowRetake}
                          onChange={(e) => setAllowRetake(e.target.checked)}
                          className="w-5 h-5 border-2 border-black"
                        />
                        <div className="flex flex-col">
                          <span className="text-base font-light text-black">
                            Allow Retake
                          </span>
                          <span className="text-sm font-light text-gray-600">
                            Students can take this quiz multiple times
                          </span>
                        </div>
                      </label>

                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={showResults}
                          onChange={(e) => setShowResults(e.target.checked)}
                          className="w-5 h-5 border-2 border-black"
                        />
                        <div className="flex flex-col">
                          <span className="text-base font-light text-black">
                            Show Results Immediately
                          </span>
                          <span className="text-sm font-light text-gray-600">
                            Students can see their results right after
                            submission
                          </span>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-6 py-3 bg-black text-white font-light hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  {saving && (
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
                  {saving ? "Saving..." : "Save Settings"}
                </button>
                <Link
                  href={`/teacher/quizzes/${params.id}`}
                  className="px-6 py-3 bg-gray-200 text-black font-light hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </Link>
              </div>
            </div>
          ) : null}
        </div>
      </DashboardLayout>
    </AuthGuard>
  );
}
