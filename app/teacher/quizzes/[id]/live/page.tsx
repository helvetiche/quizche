"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import AuthGuard from "../../../../components/auth/AuthGuard";
import DashboardLayout from "../../../../components/layout/DashboardLayout";
import Loading from "../../../../components/ui/Loading";

interface Violation {
  type: "tab_change" | "time_away" | "refresh";
  timestamp: string;
  details?: string;
}

interface ActiveSession {
  id: string;
  quizId: string;
  userId: string;
  studentEmail: string;
  studentName: string;
  startedAt: string;
  lastActivity: string;
  tabChangeCount: number;
  timeAway: number;
  violations: Violation[];
  disqualified: boolean;
  status: string;
}

export default function LiveMonitoringPage() {
  const params = useParams();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    if (!idToken || !params.id || !user) return;

    let pollInterval: NodeJS.Timeout | null = null;

    // Verify quiz ownership and set up polling
    const verifyAndSetupPolling = async () => {
      try {
        // Verify quiz belongs to teacher
        const quizResponse = await fetch(`/api/quizzes/${params.id}`, {
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        });

        if (!quizResponse.ok) {
          const errorData = await quizResponse.json();
          setError(errorData.error || "Failed to verify quiz access");
          setLoading(false);
          return;
        }

        // Set up polling for live updates
        const fetchSessions = async () => {
          try {
            const response = await fetch(
              `/api/teacher/quizzes/${params.id}/live`,
              {
                headers: {
                  Authorization: `Bearer ${idToken}`,
                },
              }
            );

            if (response.ok) {
              const data = await response.json();
              setSessions(data.sessions || []);
              setLoading(false);
            } else {
              const errorData = await response.json();
              setError(errorData.error || "Failed to load sessions");
              setLoading(false);
            }
          } catch (err) {
            console.error("Error fetching sessions:", err);
            setError("Failed to load live sessions");
            setLoading(false);
          }
        };

        // Initial fetch
        await fetchSessions();
        // Poll every 1.5 seconds for near real-time updates
        pollInterval = setInterval(fetchSessions, 1500);
      } catch (err) {
        console.error("Error setting up polling:", err);
        setError("Failed to initialize live monitoring");
        setLoading(false);
      }
    };

    verifyAndSetupPolling();

    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [idToken, params.id, user]);

  const formatTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    } catch {
      return "Unknown";
    }
  };

  const getStatusColor = (session: ActiveSession) => {
    if (session.disqualified) {
      return "bg-red-100 border-red-600 text-red-800";
    }
    if (
      session.violations.length > 0 ||
      session.tabChangeCount > 0 ||
      session.timeAway > 5
    ) {
      return "bg-yellow-100 border-yellow-600 text-yellow-800";
    }
    return "bg-green-100 border-green-600 text-green-800";
  };

  const getStatusText = (session: ActiveSession) => {
    if (session.disqualified) {
      return "Disqualified";
    }
    if (
      session.violations.length > 0 ||
      session.tabChangeCount > 0 ||
      session.timeAway > 5
    ) {
      return "Violations Detected";
    }
    return "Active";
  };

  if (loading && !idToken) {
    return <Loading />;
  }

  return (
    <AuthGuard requiredRole="teacher" onAuthSuccess={setUser}>
      <DashboardLayout
        title="QuizChe - Live Monitoring"
        userEmail={user?.email}
        userRole="teacher"
      >
        <div className="flex flex-col gap-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-light text-black">
                Live Quiz Monitoring
              </h1>
              <p className="text-lg font-light text-gray-600 mt-2">
                Real-time view of students taking the quiz
              </p>
            </div>
            <button
              onClick={() => router.back()}
              className="px-4 py-2 bg-gray-200 text-black font-light hover:bg-gray-300 transition-colors"
            >
              ← Back
            </button>
          </div>

          {error ? (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <p className="text-lg font-light text-red-600">{error}</p>
              <button
                onClick={() => router.back()}
                className="px-6 py-3 bg-gray-200 text-black font-light hover:bg-gray-300 transition-colors"
              >
                Go Back
              </button>
            </div>
          ) : sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <p className="text-lg font-light text-gray-600">
                No active sessions. Students will appear here when they start
                the quiz.
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-4">
                <div className="px-4 py-2 bg-black text-white font-light">
                  Active Students: {sessions.length}
                </div>
                <div className="px-4 py-2 bg-green-100 border-2 border-green-600 text-green-800 font-light">
                  Active:{" "}
                  {
                    sessions.filter(
                      (s) => s.violations.length === 0 && !s.disqualified
                    ).length
                  }
                </div>
                <div className="px-4 py-2 bg-yellow-100 border-2 border-yellow-600 text-yellow-800 font-light">
                  Violations:{" "}
                  {
                    sessions.filter(
                      (s) => s.violations.length > 0 && !s.disqualified
                    ).length
                  }
                </div>
                <div className="px-4 py-2 bg-red-100 border-2 border-red-600 text-red-800 font-light">
                  Disqualified: {sessions.filter((s) => s.disqualified).length}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className={`p-6 border-2 ${getStatusColor(session)}`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-light text-black mb-1">
                          {session.studentName}
                        </h3>
                        <p className="text-sm font-light text-gray-600">
                          {session.studentEmail}
                        </p>
                      </div>
                      <span
                        className={`px-3 py-1 text-sm font-light ${getStatusColor(
                          session
                        )}`}
                      >
                        {getStatusText(session)}
                      </span>
                    </div>

                    <div className="flex flex-col gap-3 text-sm font-light">
                      <div className="flex items-center justify-between">
                        <span>Started:</span>
                        <span>{formatTime(session.startedAt)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Last Activity:</span>
                        <span>{formatTime(session.lastActivity)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Tab Changes:</span>
                        <span
                          className={
                            session.tabChangeCount > 3
                              ? "text-red-600 font-medium"
                              : ""
                          }
                        >
                          {session.tabChangeCount}/3
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Time Away:</span>
                        <span
                          className={
                            session.timeAway > 5
                              ? "text-red-600 font-medium"
                              : ""
                          }
                        >
                          {session.timeAway}s
                        </span>
                      </div>
                    </div>

                    {session.violations.length > 0 && (
                      <div className="mt-4 pt-4 border-t-2 border-gray-300">
                        <h4 className="text-sm font-medium mb-2">
                          Recent Violations:
                        </h4>
                        <div className="flex flex-col gap-2 max-h-32 overflow-y-auto">
                          {session.violations
                            .slice(-5)
                            .map((violation, index) => (
                              <div
                                key={index}
                                className="text-xs font-light bg-white bg-opacity-50 p-2 rounded"
                              >
                                <span className="font-medium">
                                  {violation.type}:
                                </span>{" "}
                                {violation.details || "No details"}
                                <br />
                                <span className="text-gray-600">
                                  {formatTime(violation.timestamp)}
                                </span>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Live Violations Feed */}
              {sessions.some((s) => s.violations.length > 0) && (
                <div className="mt-8 p-6 border-2 border-black bg-white">
                  <h2 className="text-2xl font-light text-black mb-4">
                    Live Violations Feed
                  </h2>
                  <div className="flex flex-col gap-3 max-h-64 overflow-y-auto">
                    {sessions
                      .flatMap((session) =>
                        session.violations.map((violation) => ({
                          ...violation,
                          studentName: session.studentName,
                        }))
                      )
                      .sort(
                        (a, b) =>
                          new Date(b.timestamp).getTime() -
                          new Date(a.timestamp).getTime()
                      )
                      .slice(0, 20)
                      .map((violation, index) => (
                        <div
                          key={index}
                          className="p-3 bg-gray-50 border border-gray-300 flex items-start justify-between"
                        >
                          <div>
                            <span className="font-medium">
                              {violation.studentName}
                            </span>
                            <span className="mx-2">•</span>
                            <span className="text-red-600">
                              {violation.type}
                            </span>
                            {violation.details && (
                              <>
                                <span className="mx-2">•</span>
                                <span className="text-gray-600">
                                  {violation.details}
                                </span>
                              </>
                            )}
                          </div>
                          <span className="text-xs text-gray-500">
                            {formatTime(violation.timestamp)}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </DashboardLayout>
    </AuthGuard>
  );
}
