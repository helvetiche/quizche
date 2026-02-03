import type { ReactElement } from "react";
import type { QuizAttempt } from "./types";
import type { Section } from "../../sections/types";

type RightStudentsSidebarProps = {
  rightSidebarCollapsed: boolean;
  studentFilter: "all" | "completed" | "pending";
  attempts: QuizAttempt[];
  sections: Section[];
  assignedSectionIds: string[];
  excludedStudentIds: string[];
  onToggleCollapse: () => void;
  onSetStudentFilter: (filter: "all" | "completed" | "pending") => void;
  onViewResults: () => void;
};

export default function RightStudentsSidebar({
  rightSidebarCollapsed,
  studentFilter,
  attempts,
  sections,
  assignedSectionIds,
  excludedStudentIds,
  onToggleCollapse,
  onSetStudentFilter,
  onViewResults,
}: RightStudentsSidebarProps): ReactElement {
  const resolveDisplayName = (
    displayName: string | undefined,
    fallback: string
  ): string => {
    if (displayName !== undefined && displayName.trim().length > 0) {
      return displayName.trim();
    }
    return fallback;
  };

  const resolveInitial = (
    primary: string | undefined,
    fallback: string
  ): string => {
    if (primary !== undefined && primary.trim().length > 0) {
      return primary.trim().charAt(0).toUpperCase();
    }
    if (fallback.trim().length > 0) {
      return fallback.trim().charAt(0).toUpperCase();
    }
    return "?";
  };
  const assignedStudents = sections
    .filter((s) => assignedSectionIds.includes(s.id))
    .flatMap((s) => s.students)
    .filter((s) => !excludedStudentIds.includes(s.id))
    .filter(
      (student, index, self) =>
        index === self.findIndex((s) => s.id === student.id)
    );

  const completedStudentIds = attempts.map((a) => a.userId);

  const pendingStudents = assignedStudents.filter(
    (s) => !completedStudentIds.includes(s.id)
  );

  return (
    <aside
      className={`flex flex-col bg-amber-100 border-l-2 border-gray-900 transition-all duration-200 ${rightSidebarCollapsed ? "w-16" : "w-64"}`}
    >
      <div className="flex items-center justify-between p-3 border-b-2 border-gray-900">
        <button
          onClick={onToggleCollapse}
          className="w-8 h-8 rounded-lg bg-amber-200 border-2 border-gray-900 hover:bg-amber-300 flex items-center justify-center transition-colors"
        >
          <span className="material-icons-outlined text-gray-900 text-sm">
            {rightSidebarCollapsed ? "chevron_left" : "chevron_right"}
          </span>
        </button>
        {!rightSidebarCollapsed && (
          <span className="text-gray-900 font-black text-xs uppercase tracking-wider">
            Students
          </span>
        )}
      </div>

      <>
        {!rightSidebarCollapsed && (
          <div className="p-2 border-b-2 border-gray-900">
            <div className="flex bg-white border-2 border-gray-900 rounded-lg overflow-hidden">
              <button
                onClick={() => onSetStudentFilter("all")}
                className={`flex-1 px-2 py-1.5 text-[10px] font-bold transition-colors ${studentFilter === "all" ? "bg-amber-300 text-gray-900" : "bg-white text-gray-600 hover:bg-amber-100"}`}
              >
                All
              </button>
              <button
                onClick={() => onSetStudentFilter("completed")}
                className={`flex-1 px-2 py-1.5 text-[10px] font-bold border-l-2 border-gray-900 transition-colors ${studentFilter === "completed" ? "bg-amber-300 text-gray-900" : "bg-white text-gray-600 hover:bg-amber-100"}`}
              >
                Done
              </button>
              <button
                onClick={() => onSetStudentFilter("pending")}
                className={`flex-1 px-2 py-1.5 text-[10px] font-bold border-l-2 border-gray-900 transition-colors ${studentFilter === "pending" ? "bg-amber-300 text-gray-900" : "bg-white text-gray-600 hover:bg-amber-100"}`}
              >
                Pending
              </button>
            </div>
          </div>
        )}

        {!rightSidebarCollapsed && (
          <div className="p-2 border-b-2 border-gray-900">
            <div className="flex gap-2">
              <div className="flex-1 bg-amber-200 border-2 border-gray-900 rounded-lg p-2 text-center">
                <p className="text-lg font-black text-gray-900">
                  {attempts.length}
                </p>
                <p className="text-[9px] font-bold text-gray-700">Completed</p>
              </div>
              <div className="flex-1 bg-amber-100 border-2 border-gray-900 rounded-lg p-2 text-center">
                <p className="text-lg font-black text-gray-900">
                  {pendingStudents.length}
                </p>
                <p className="text-[9px] font-bold text-gray-700">Pending</p>
              </div>
            </div>
          </div>
        )}

        {rightSidebarCollapsed && (
          <div className="p-2 flex flex-col gap-2 items-center">
            <div
              className="w-10 h-10 bg-amber-200 border-2 border-gray-900 rounded-lg flex items-center justify-center"
              title="Completed"
            >
              <span className="text-sm font-black text-gray-900">
                {attempts.length}
              </span>
            </div>
            <div
              className="w-10 h-10 bg-amber-100 border-2 border-gray-900 rounded-lg flex items-center justify-center"
              title="Pending"
            >
              <span className="text-sm font-black text-gray-900">
                {pendingStudents.length}
              </span>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-2">
          {!rightSidebarCollapsed ? (
            <div className="flex flex-col gap-2">
              {assignedStudents.length === 0 && attempts.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-12 h-12 bg-amber-200 rounded-full border-2 border-gray-900 flex items-center justify-center mx-auto mb-3">
                    <span className="material-icons-outlined text-gray-700">
                      person_off
                    </span>
                  </div>
                  <p className="text-xs font-bold text-gray-700">
                    No students assigned
                  </p>
                  <p className="text-[10px] text-gray-500 mt-1">
                    Assign sections in Settings
                  </p>
                </div>
              ) : studentFilter === "pending" ? (
                pendingStudents.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-12 h-12 bg-amber-200 rounded-full border-2 border-gray-900 flex items-center justify-center mx-auto mb-3">
                      <span className="material-icons-outlined text-gray-700">
                        check_circle
                      </span>
                    </div>
                    <p className="text-xs font-bold text-gray-700">All done</p>
                    <p className="text-[10px] text-gray-500 mt-1">
                      No pending students
                    </p>
                  </div>
                ) : (
                  pendingStudents.map((student) => (
                    <div
                      key={student.id}
                      className="bg-white border-2 border-gray-900 rounded-xl p-2 hover:bg-amber-50 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-amber-100 rounded-full border-2 border-gray-900 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-black text-gray-900">
                            {resolveInitial(student.displayName, student.email)}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-gray-900 truncate">
                            {resolveDisplayName(
                              student.displayName,
                              "Unknown Student"
                            )}
                          </p>
                          <p className="text-[9px] text-gray-500 truncate">
                            {student.email}
                          </p>
                        </div>
                        <span className="text-[9px] font-bold text-amber-600 px-1.5 py-0.5 bg-amber-100 border border-amber-300 rounded">
                          Pending
                        </span>
                      </div>
                    </div>
                  ))
                )
              ) : studentFilter === "completed" ? (
                attempts.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-12 h-12 bg-amber-200 rounded-full border-2 border-gray-900 flex items-center justify-center mx-auto mb-3">
                      <span className="material-icons-outlined text-gray-700">
                        hourglass_empty
                      </span>
                    </div>
                    <p className="text-xs font-bold text-gray-700">
                      No submissions yet
                    </p>
                    <p className="text-[10px] text-gray-500 mt-1">
                      Waiting for students
                    </p>
                  </div>
                ) : (
                  attempts.map((attempt, index) => (
                    <div
                      key={attempt.id || index}
                      className="bg-white border-2 border-gray-900 rounded-xl p-2 hover:bg-amber-50 transition-colors cursor-pointer"
                      onClick={onViewResults}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-amber-200 rounded-full border-2 border-gray-900 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-black text-gray-900">
                            {resolveInitial(
                              attempt.studentName,
                              attempt.studentEmail
                            )}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-gray-900 truncate">
                            {attempt.studentName || "Unknown Student"}
                          </p>
                          <p className="text-[9px] text-gray-500 truncate">
                            {attempt.studentEmail || "No email"}
                          </p>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="text-xs font-black text-gray-900">
                            {attempt.percentage}%
                          </span>
                          <span className="text-[9px] text-gray-500">
                            {attempt.score}/{attempt.totalQuestions}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )
              ) : (
                <>
                  {attempts.map((attempt, index) => (
                    <div
                      key={attempt.id || index}
                      className="bg-white border-2 border-gray-900 rounded-xl p-2 hover:bg-amber-50 transition-colors cursor-pointer"
                      onClick={onViewResults}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-amber-200 rounded-full border-2 border-gray-900 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-black text-gray-900">
                            {resolveInitial(
                              attempt.studentName,
                              attempt.studentEmail
                            )}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-gray-900 truncate">
                            {attempt.studentName || "Unknown Student"}
                          </p>
                          <p className="text-[9px] text-gray-500 truncate">
                            {attempt.studentEmail || "No email"}
                          </p>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="text-xs font-black text-gray-900">
                            {attempt.percentage}%
                          </span>
                          <span className="text-[9px] text-gray-500">
                            {attempt.score}/{attempt.totalQuestions}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {pendingStudents.map((student) => (
                    <div
                      key={student.id}
                      className="bg-white border-2 border-gray-900 rounded-xl p-2 hover:bg-amber-50 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-amber-100 rounded-full border-2 border-gray-900 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-black text-gray-900">
                            {resolveInitial(student.displayName, student.email)}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-gray-900 truncate">
                            {resolveDisplayName(
                              student.displayName,
                              "Unknown Student"
                            )}
                          </p>
                          <p className="text-[9px] text-gray-500 truncate">
                            {student.email || "No email"}
                          </p>
                        </div>
                        <span className="text-[9px] font-bold text-amber-600 px-1.5 py-0.5 bg-amber-100 border border-amber-300 rounded">
                          Pending
                        </span>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-2 items-center">
              {attempts.slice(0, 3).map((attempt, index) => (
                <div
                  key={attempt.id || index}
                  className="w-10 h-10 rounded-full border-2 border-gray-900 flex items-center justify-center cursor-pointer hover:scale-110 transition-transform bg-amber-200"
                  title={`${attempt.studentName || attempt.studentEmail}: ${attempt.percentage}%`}
                  onClick={onViewResults}
                >
                  <span className="text-xs font-black text-gray-900">
                    {resolveInitial(attempt.studentName, attempt.studentEmail)}
                  </span>
                </div>
              ))}
              {pendingStudents.slice(0, 2).map((student) => (
                <div
                  key={student.id}
                  className="w-10 h-10 rounded-full border-2 border-gray-900 flex items-center justify-center bg-amber-100"
                  title={`${resolveDisplayName(student.displayName, student.email)}: Pending`}
                >
                  <span className="text-xs font-black text-gray-900">
                    {resolveInitial(student.displayName, student.email)}
                  </span>
                </div>
              ))}
              {attempts.length + pendingStudents.length > 5 && (
                <div className="w-10 h-10 bg-amber-200 rounded-full border-2 border-gray-900 flex items-center justify-center">
                  <span className="text-[10px] font-black text-gray-900">
                    +{attempts.length + pendingStudents.length - 5}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {!rightSidebarCollapsed &&
          (attempts.length > 0 || pendingStudents.length > 0) && (
            <div className="p-3 border-t-2 border-gray-900">
              <button
                onClick={onViewResults}
                className="w-full flex items-center justify-center gap-2 p-2.5 bg-amber-200 hover:bg-amber-300 text-gray-900 font-bold rounded-xl border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(17,24,39,1)] hover:shadow-[3px_3px_0px_0px_rgba(17,24,39,1)] transition-all"
              >
                <span className="material-icons-outlined text-sm">
                  analytics
                </span>
                <span className="text-xs">View All Results</span>
              </button>
            </div>
          )}
      </>
    </aside>
  );
}
