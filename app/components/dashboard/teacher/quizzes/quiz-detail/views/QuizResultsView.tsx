import type { ReactElement } from "react";
import type { QuizAttempt } from "../types";

type QuizResultsViewProps = {
  attempts: QuizAttempt[];
  onBack: () => void;
};

export default function QuizResultsView({
  attempts,
  onBack,
}: QuizResultsViewProps): ReactElement {
  return (
    <div className="flex-1 overflow-y-auto p-6 bg-amber-50">
      <div className="w-full">
        {/* Results Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-200 rounded-xl flex items-center justify-center border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(17,24,39,1)]">
              <span className="material-icons-outlined text-gray-900 text-xl">
                analytics
              </span>
            </div>
            <div>
              <h2 className="text-xl font-black text-gray-900">Quiz Results</h2>
              <p className="text-gray-600 font-medium text-sm">
                {attempts.length} submissions
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

        {/* Results Table */}
        <div className="bg-white border-2 border-gray-900 rounded-xl shadow-[4px_4px_0px_0px_rgba(17,24,39,1)] overflow-hidden">
          <div className="bg-amber-200 px-4 py-3 border-b-2 border-gray-900">
            <h3 className="font-black text-gray-900">Student Submissions</h3>
          </div>
          {attempts.length === 0 ? (
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-amber-200 rounded-full border-2 border-gray-900 flex items-center justify-center mx-auto mb-4">
                <span className="material-icons-outlined text-gray-700 text-3xl">
                  inbox
                </span>
              </div>
              <p className="text-lg font-bold text-gray-900">
                No submissions yet
              </p>
              <p className="text-gray-600">
                Students who complete the quiz will appear here
              </p>
            </div>
          ) : (
            <div className="divide-y-2 divide-gray-200">
              {attempts.map((attempt, index) => (
                <div
                  key={attempt.id || index}
                  className="flex items-center gap-4 p-4 hover:bg-amber-50 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full border-2 border-gray-900 flex items-center justify-center bg-amber-200">
                    <span className="font-black text-gray-900">
                      {attempt.studentName.charAt(0).toUpperCase() ||
                        attempt.studentEmail.charAt(0).toUpperCase() ||
                        "?"}
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-gray-900">
                      {attempt.studentName || "Unknown Student"}
                    </p>
                    <p className="text-sm text-gray-600">
                      {attempt.studentEmail}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-black text-gray-900">
                      {attempt.percentage}%
                    </p>
                    <p className="text-sm text-gray-600">
                      {attempt.score}/{attempt.totalQuestions} correct
                    </p>
                  </div>
                  <div className="text-sm text-gray-500">
                    {new Date(attempt.completedAt).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
