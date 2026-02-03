import { useState } from "react";
import type { ReactElement } from "react";
import type { QuizAttempt } from "../types";

type QuizLiveViewProps = {
  quizId: string;
  attempts: QuizAttempt[];
  onBack: () => void;
};

export default function QuizLiveView({
  quizId,
  attempts,
  onBack,
}: QuizLiveViewProps): ReactElement {
  const [copied, setCopied] = useState(false);

  const copyShareLink = (): void => {
    const link = `${window.location.origin}/student/quiz/${quizId}`;
    void navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-amber-50">
      <div className="w-full">
        {/* Live Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-200 rounded-xl flex items-center justify-center border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(17,24,39,1)]">
              <span className="material-icons-outlined text-gray-900 text-xl">
                play_circle
              </span>
            </div>
            <div>
              <h2 className="text-xl font-black text-gray-900">Live Session</h2>
              <p className="text-gray-600 font-medium text-sm">
                Monitor quiz in real-time
              </p>
            </div>
          </div>
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-4 py-2 bg-amber-200 text-gray-900 font-bold rounded-xl border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(17,24,39,1)] hover:shadow-[3px_3px_0px_0px_rgba(17,24,39,1)] transition-all"
          >
            <span className="material-icons-outlined text-sm">arrow_back</span>
            Back to Questions
          </button>
        </div>

        {/* Quiz Link */}
        <div className="bg-white border-2 border-gray-900 rounded-xl p-4 shadow-[3px_3px_0px_0px_rgba(17,24,39,1)] mb-6">
          <h3 className="font-black text-gray-900 mb-3">Share Quiz Link</h3>
          <div className="flex gap-3">
            <input
              type="text"
              readOnly
              value={`${typeof window !== "undefined" ? window.location.origin : ""}/student/quiz/${quizId}`}
              className="flex-1 px-4 py-3 bg-amber-50 border-2 border-gray-900 rounded-xl font-medium text-gray-700"
            />
            <button
              onClick={() => void copyShareLink()}
              className={`px-6 py-3 font-bold rounded-xl border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(17,24,39,1)] transition-all ${copied ? "bg-amber-400" : "bg-amber-200 hover:bg-amber-300"}`}
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white border-2 border-gray-900 rounded-xl shadow-[3px_3px_0px_0px_rgba(17,24,39,1)] overflow-hidden">
          <div className="bg-amber-200 px-4 py-3 border-b-2 border-gray-900 flex items-center gap-2">
            <div className="w-3 h-3 bg-amber-500 rounded-full animate-pulse"></div>
            <h3 className="font-black text-gray-900">Recent Activity</h3>
          </div>
          {attempts.length === 0 ? (
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-amber-200 rounded-full border-2 border-gray-900 flex items-center justify-center mx-auto mb-4">
                <span className="material-icons-outlined text-gray-700 text-3xl">
                  hourglass_empty
                </span>
              </div>
              <p className="text-lg font-bold text-gray-900">
                Waiting for students...
              </p>
              <p className="text-gray-600">
                Share the quiz link to get started
              </p>
            </div>
          ) : (
            <div className="divide-y-2 divide-gray-200">
              {attempts.slice(0, 10).map((attempt, index) => (
                <div
                  key={attempt.id || index}
                  className="flex items-center gap-3 p-4"
                >
                  <div className="w-10 h-10 bg-amber-200 rounded-full border-2 border-gray-900 flex items-center justify-center">
                    <span className="text-sm font-black text-gray-900">
                      {attempt.studentName.charAt(0).toUpperCase() || "?"}
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-gray-900">
                      {attempt.studentName || "Student"}
                    </p>
                    <p className="text-sm text-gray-500">
                      Completed with {attempt.percentage}%
                    </p>
                  </div>
                  <span className="text-sm text-gray-500">
                    {new Date(attempt.completedAt).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
