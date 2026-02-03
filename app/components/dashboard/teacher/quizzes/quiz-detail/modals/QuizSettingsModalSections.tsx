import type { ReactElement } from "react";
import type { Section, Student } from "../../../sections/types";

type QuizSettingsModalSectionsProps = {
  sections: Section[];
  localAssignedSectionIds: string[];
  localExcludedStudentIds: string[];
  expandedSections: string[];
  onToggleSectionAssignment: (sectionId: string) => void;
  onToggleSectionExpanded: (sectionId: string) => void;
  onToggleStudentExclusion: (studentId: string) => void;
};

export default function QuizSettingsModalSections({
  sections,
  localAssignedSectionIds,
  localExcludedStudentIds,
  expandedSections,
  onToggleSectionAssignment,
  onToggleSectionExpanded,
  onToggleStudentExclusion,
}: QuizSettingsModalSectionsProps): ReactElement {
  return (
    <div className="mb-6">
      <h4 className="text-sm font-black text-gray-900 uppercase tracking-wider mb-4">
        Assign to Sections
      </h4>
      <div className="bg-white border-2 border-gray-900 rounded-xl shadow-[2px_2px_0px_0px_rgba(17,24,39,1)] overflow-hidden">
        {sections.length === 0 ? (
          <div className="p-6 text-center">
            <div className="w-12 h-12 bg-amber-200 rounded-full border-2 border-gray-900 flex items-center justify-center mx-auto mb-3">
              <span className="material-icons-outlined text-gray-700">
                groups
              </span>
            </div>
            <p className="font-bold text-gray-900">No sections yet</p>
            <p className="text-sm text-gray-600">
              Create sections to assign this quiz to students
            </p>
          </div>
        ) : (
          <div className="max-h-80 overflow-y-auto">
            {sections.map((section) => {
              const isAssigned = localAssignedSectionIds.includes(section.id);
              const isExpanded = expandedSections.includes(section.id);
              const activeStudents = section.students.filter(
                (s) => !localExcludedStudentIds.includes(s.id)
              );
              return (
                <div
                  key={section.id}
                  className="border-b-2 border-gray-200 last:border-b-0"
                >
                  <div
                    className={`flex items-center gap-3 p-4 transition-colors ${isAssigned ? "bg-amber-100" : "bg-white"}`}
                  >
                    <div
                      onClick={() => onToggleSectionAssignment(section.id)}
                      className={`w-6 h-6 rounded-lg border-2 border-gray-900 flex items-center justify-center flex-shrink-0 cursor-pointer ${isAssigned ? "bg-amber-400" : "bg-white hover:bg-amber-100"}`}
                    >
                      {isAssigned && (
                        <span className="material-icons-outlined text-gray-900 text-sm">
                          check
                        </span>
                      )}
                    </div>
                    <div
                      className="flex-1 min-w-0 cursor-pointer"
                      onClick={() => onToggleSectionAssignment(section.id)}
                    >
                      <p className="font-bold text-gray-900">{section.name}</p>
                      <p className="text-sm text-gray-600 truncate">
                        {section.description ?? "No description"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="w-8 h-8 bg-amber-200 rounded-lg border-2 border-gray-900 flex items-center justify-center">
                        <span className="text-xs font-black text-gray-900">
                          {activeStudents.length}/{section.students.length}
                        </span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleSectionExpanded(section.id);
                        }}
                        className="w-8 h-8 bg-amber-200 rounded-lg border-2 border-gray-900 flex items-center justify-center hover:bg-amber-300 transition-colors"
                      >
                        <span className="material-icons-outlined text-gray-900 text-sm">
                          {isExpanded ? "expand_less" : "expand_more"}
                        </span>
                      </button>
                    </div>
                  </div>
                  {isExpanded && section.students.length > 0 && (
                    <div className="bg-amber-50 border-t-2 border-gray-200 px-4 py-2">
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                        Students
                      </p>
                      <div className="flex flex-col gap-1">
                        {section.students.map((student) => {
                          const isExcluded = localExcludedStudentIds.includes(
                            student.id
                          );
                          return (
                            <div
                              key={student.id}
                              onClick={() =>
                                onToggleStudentExclusion(student.id)
                              }
                              className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${isExcluded ? "bg-gray-200 opacity-60" : "bg-white hover:bg-amber-100"} border border-gray-300`}
                            >
                              <div
                                className={`w-5 h-5 rounded border-2 border-gray-900 flex items-center justify-center flex-shrink-0 ${isExcluded ? "bg-white" : "bg-amber-400"}`}
                              >
                                {!isExcluded && (
                                  <span className="material-icons-outlined text-gray-900 text-xs">
                                    check
                                  </span>
                                )}
                              </div>
                              <div className="w-7 h-7 bg-amber-200 rounded-full border border-gray-900 flex items-center justify-center flex-shrink-0">
                                <span className="text-xs font-bold text-gray-900">
                                  {(student.displayName ?? student.email ?? "?")
                                    .charAt(0)
                                    .toUpperCase()}
                                </span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p
                                  className={`text-sm font-bold ${isExcluded ? "text-gray-500 line-through" : "text-gray-900"}`}
                                >
                                  {student.displayName ?? "Unknown"}
                                </p>
                                <p
                                  className={`text-xs ${isExcluded ? "text-gray-400" : "text-gray-600"} truncate`}
                                >
                                  {student.email}
                                </p>
                              </div>
                              {isExcluded && (
                                <span className="text-xs font-bold text-gray-500 px-2 py-0.5 bg-gray-300 rounded">
                                  Excluded
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
      {localAssignedSectionIds.length > 0 && (
        <p className="mt-2 text-sm text-gray-600">
          <span className="font-bold">{localAssignedSectionIds.length}</span>{" "}
          section{localAssignedSectionIds.length !== 1 ? "s" : ""} •
          <span className="font-bold">
            {" "}
            {sections
              .filter((s: Section) => localAssignedSectionIds.includes(s.id))
              .reduce(
                (acc: number, s: Section) =>
                  acc +
                  s.students.filter(
                    (st: Student) => !localExcludedStudentIds.includes(st.id)
                  ).length,
                0
              )}
          </span>{" "}
          students
          {localExcludedStudentIds.length > 0 && (
            <span className="text-gray-500">
              {" "}
              ({localExcludedStudentIds.length} excluded)
            </span>
          )}
        </p>
      )}
    </div>
  );
}
