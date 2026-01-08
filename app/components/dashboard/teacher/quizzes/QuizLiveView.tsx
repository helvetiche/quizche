"use client";

import { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useQuizView } from "./QuizViewContext";

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

interface QuizLiveViewProps {
  quizId: string;
}

export default function QuizLiveView({ quizId }: QuizLiveViewProps) {
  const { goToDetail } = useQuizView();
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
    if (!idToken || !quizId) return;

    let pollInterval: NodeJS.Timeout | null = null;

    const verifyAndSetupPolling = async () => {
      try {
        const quizResponse = await fetch(`/api/quizzes/${quizId}`, {
          headers: { Authorization: `Bearer ${idToken}` },
        });

        if (!quizResponse.ok) {
          const errorData = await quizResponse.json();
          setError(errorData.error || "Failed to verify quiz access");
          setLoading(false);
          return;
        }

        const fetchSessions = async () => {
          try {
            const response = await fetch(`/api/teacher/quizzes/${quizId}/live`, {
              headers: { Authorization: `Bearer ${idToken}` },
            });

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

        await fetchSessions();
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
  }, [idToken, quizId]);

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
    if (session.disqualified) return "bg-red-400";
    if (session.violations.length > 0 || session.tabChangeCount > 0 || session.timeAway > 5) return "bg-orange-400";
    return "bg-lime-400";
  };

  const getStatusText = (session: ActiveSession) => {
    if (session.disqualified) return "DISQUALIFIED";
    if (session.violations.length > 0 || session.tabChangeCount > 0 || session.timeAway > 5) return "VIOLATIONS";
    return "ACTIVE";
  };

  if (loading) {
    return (
      <div className="bg-white border-4 border-gray-900 p-12 shadow-[4px_4px_0px_0px_rgba(31,41,55,1)] flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border-3 border-gray-900 border-t-transparent rounded-full animate-spin"></div>
          <span className="font-bold text-gray-900">Loading live monitoring...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-400 border-4 border-gray-900 p-8 shadow-[4px_4px_0px_0px_rgba(31,41,55,1)] flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center border-3 border-gray-900">
          <span className="material-icons-outlined text-red-500 text-2xl">error</span>
        </div>
        <p className="text-lg font-bold text-gray-900">{error}</p>
        <button
          onClick={() => goToDetail(quizId)}
          className="px-6 py-3 bg-white text-gray-900 font-bold border-3 border-gray-900 shadow-[3px_3px_0px_0px_rgba(31,41,55,1)] hover:shadow-[4px_4px_0px_0px_rgba(31,41,55,1)] transition-all"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-12 h-12 bg-red-500 rounded-xl flex items-center justify-center border-3 border-gray-900 shadow-[3px_3px_0px_0px_rgba(31,41,55,1)]">
              <span className="material-icons-outlined text-white text-2xl">visibility</span>
            </div>
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-lime-400 rounded-full border-2 border-gray-900 animate-pulse"></div>
          </div>
          <div>
            <h2 className="text-3xl font-black text-gray-900">Live Monitoring</h2>
            <p className="text-sm font-bold text-gray-600">[ real-time quiz activity ]</p>
          </div>
        </div>
        <button
          onClick={() => goToDetail(quizId)}
          className="px-4 py-2 bg-amber-200 text-gray-900 font-bold border-3 border-gray-900 shadow-[3px_3px_0px_0px_rgba(31,41,55,1)] hover:shadow-[4px_4px_0px_0px_rgba(31,41,55,1)] active:shadow-[1px_1px_0px_0px_rgba(31,41,55,1)] transition-all flex items-center gap-2"
        >
          <span className="material-icons-outlined text-lg">arrow_back</span>
          <span>Back</span>
        </button>
      </div>

      {sessions.length === 0 ? (
        <div className="bg-amber-200 border-4 border-gray-900 p-12 shadow-[4px_4px_0px_0px_rgba(31,41,55,1)] flex flex-col items-center justify-center gap-4">
          <div className="w-16 h-16 bg-cyan-400 rounded-full flex items-center justify-center border-3 border-gray-900">
            <span className="material-icons-outlined text-gray-900 text-3xl">hourglass_empty</span>
          </div>
          <p className="text-lg font-bold text-gray-900 text-center">
            No active sessions. Students will appear here when they start the quiz.
          </p>
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <div className="w-3 h-3 bg-lime-400 rounded-full border border-gray-900 animate-pulse"></div>
            <span>Monitoring for new sessions...</span>
          </div>
        </div>
      ) : (
        <>
          {/* Stats Bar */}
          <div className="flex flex-wrap gap-3">
            <div className="bg-gray-900 text-amber-100 px-5 py-3 border-3 border-gray-900 shadow-[3px_3px_0px_0px_rgba(31,41,55,1)] flex items-center gap-2">
              <span className="material-icons-outlined">people</span>
              <span className="font-bold">Active: {sessions.length}</span>
            </div>
            <div className="bg-lime-400 px-5 py-3 border-3 border-gray-900 shadow-[3px_3px_0px_0px_rgba(31,41,55,1)] flex items-center gap-2">
              <span className="material-icons-outlined text-gray-900">check_circle</span>
              <span className="font-bold text-gray-900">
                Clean: {sessions.filter((s) => s.violations.length === 0 && !s.disqualified && s.tabChangeCount === 0).length}
              </span>
            </div>
            <div className="bg-orange-400 px-5 py-3 border-3 border-gray-900 shadow-[3px_3px_0px_0px_rgba(31,41,55,1)] flex items-center gap-2">
              <span className="material-icons-outlined text-gray-900">warning</span>
              <span className="font-bold text-gray-900">
                Violations: {sessions.filter((s) => (s.violations.length > 0 || s.tabChangeCount > 0) && !s.disqualified).length}
              </span>
            </div>
            <div className="bg-red-500 text-white px-5 py-3 border-3 border-gray-900 shadow-[3px_3px_0px_0px_rgba(31,41,55,1)] flex items-center gap-2">
              <span className="material-icons-outlined">gpp_bad</span>
              <span className="font-bold">
                Disqualified: {sessions.filter((s) => s.disqualified).length}
              </span>
            </div>
          </div>

          {/* Sessions Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {sessions.map((session) => (
              <div key={session.id} className="bg-white border-4 border-gray-900 shadow-[5px_5px_0px_0px_rgba(31,41,55,1)] overflow-hidden">
                {/* Session Header */}
                <div className={`${getStatusColor(session)} border-b-4 border-gray-900 px-5 py-4`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-xl font-black text-gray-900">{session.studentName}</h3>
                      <p className="text-sm font-medium text-gray-800">{session.studentEmail}</p>
                    </div>
                    <div className="px-3 py-1 bg-white border-2 border-gray-900 text-xs font-bold text-gray-900">
                      {getStatusText(session)}
                    </div>
                  </div>
                </div>

                {/* Session Stats */}
                <div className="p-5">
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-amber-50 border-2 border-gray-900 p-3">
                      <p className="text-xs font-bold text-gray-600 mb-1">STARTED</p>
                      <p className="font-bold text-gray-900">{formatTime(session.startedAt)}</p>
                    </div>
                    <div className="bg-amber-50 border-2 border-gray-900 p-3">
                      <p className="text-xs font-bold text-gray-600 mb-1">LAST ACTIVITY</p>
                      <p className="font-bold text-gray-900">{formatTime(session.lastActivity)}</p>
                    </div>
                    <div className={`border-2 border-gray-900 p-3 ${session.tabChangeCount > 3 ? 'bg-red-100' : 'bg-amber-50'}`}>
                      <p className="text-xs font-bold text-gray-600 mb-1">TAB CHANGES</p>
                      <p className={`font-black text-xl ${session.tabChangeCount > 3 ? 'text-red-600' : 'text-gray-900'}`}>
                        {session.tabChangeCount}/3
                      </p>
                    </div>
                    <div className={`border-2 border-gray-900 p-3 ${session.timeAway > 5 ? 'bg-red-100' : 'bg-amber-50'}`}>
                      <p className="text-xs font-bold text-gray-600 mb-1">TIME AWAY</p>
                      <p className={`font-black text-xl ${session.timeAway > 5 ? 'text-red-600' : 'text-gray-900'}`}>
                        {session.timeAway}s
                      </p>
                    </div>
                  </div>

                  {/* Violations */}
                  {session.violations.length > 0 && (
                    <div className="bg-red-100 border-3 border-gray-900 p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="material-icons-outlined text-red-600 text-sm">warning</span>
                        <h4 className="text-sm font-bold text-gray-900">Recent Violations</h4>
                      </div>
                      <div className="flex flex-col gap-2 max-h-28 overflow-y-auto">
                        {session.violations.slice(-5).map((violation, index) => (
                          <div key={index} className="bg-white border-2 border-gray-900 p-2 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-gray-900 uppercase">{violation.type.replace('_', ' ')}</span>
                              <span className="text-gray-600">{formatTime(violation.timestamp)}</span>
                            </div>
                            {violation.details && (
                              <p className="text-gray-700 mt-1">{violation.details}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
