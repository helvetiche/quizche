import type { ReactElement } from "react";
import TiltedCard from "@/components/TiltedCard";
import type { Section } from "./types";

type SectionCardProps = {
  section: Section;
  cardColor: string;
  onView: (section: Section, e: React.MouseEvent) => void;
  onEdit: (section: Section, e: React.MouseEvent) => void;
  onDelete: (
    sectionId: string,
    sectionName: string,
    e: React.MouseEvent
  ) => void;
};

export default function SectionCard({
  section,
  cardColor,
  onView,
  onEdit,
  onDelete,
}: SectionCardProps): ReactElement {
  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    } catch {
      return "Unknown";
    }
  };

  const getTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return formatDate(dateString);
  };

  return (
    <div className="cursor-pointer h-full group">
      <TiltedCard
        altText={section.name}
        captionText={`${section.students.length} students`}
        containerHeight="100%"
        containerWidth="100%"
        imageHeight="100%"
        imageWidth="100%"
        scaleOnHover={1.05}
        rotateAmplitude={12}
        showMobileWarning={false}
        showTooltip={true}
        displayOverlayContent={true}
        overlayContent={
          <div
            className={`${cardColor} border-3 border-gray-900 rounded-2xl relative w-full h-full overflow-hidden flex flex-col shadow-[4px_4px_0px_0px_rgba(17,24,39,1)]`}
          >
            {/* macOS Traffic Lights */}
            <div className="absolute top-3 left-3 flex gap-1.5 z-10">
              <div className="w-4 h-4 bg-red-500 rounded-full border-2 border-black"></div>
              <div className="w-4 h-4 bg-yellow-500 rounded-full border-2 border-black"></div>
              <div className="w-4 h-4 bg-green-500 rounded-full border-2 border-black"></div>
            </div>
            {/* Header Right - Student Count & Date */}
            <div className="absolute top-2 right-3 flex items-center gap-2 z-10">
              <div className="flex items-center gap-1 px-2 py-0.5 bg-white/80 border-2 border-black rounded-full">
                <span className="material-icons-outlined text-black text-xs">
                  groups
                </span>
                <span className="font-bold text-black text-xs">
                  {section.students.length}
                </span>
              </div>
              <div className="flex items-center gap-1 px-2 py-0.5 bg-white/80 border-2 border-black rounded-full">
                <span className="material-icons-outlined text-black text-xs">
                  schedule
                </span>
                <span className="font-bold text-black text-xs">
                  {getTimeAgo(section.createdAt)}
                </span>
              </div>
            </div>
            {/* Separator Line */}
            <div className="absolute top-11 left-0 right-0 h-0.5 bg-black z-10"></div>

            {/* Content */}
            <div className="pt-14 px-4 pb-2 text-left flex-1">
              <h3 className="text-base font-black text-gray-900 mb-1">
                {section.name}
              </h3>
              {typeof section.description === "string" &&
                section.description.length > 0 && (
                  <p
                    className="text-sm font-medium text-gray-700 line-clamp-2"
                    style={{
                      fontFamily: "'Google Sans Mono', monospace",
                    }}
                  >
                    {section.description}
                  </p>
                )}
            </div>

            {/* Students Preview */}
            <div className="px-4 pb-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-gray-600">
                  Students
                </span>
              </div>
              {section.students.length > 0 ? (
                <div className="flex -space-x-3">
                  {section.students.slice(0, 3).map((student, idx) => (
                    <div
                      key={student.id}
                      className="w-8 h-8 bg-amber-200 rounded-full flex items-center justify-center border-2 border-black shadow-sm"
                      style={{ zIndex: 3 - idx }}
                      title={student.displayName ?? student.email}
                    >
                      <span className="text-xs font-black text-gray-900">
                        {(student.displayName ??
                          student.email)[0].toUpperCase()}
                      </span>
                    </div>
                  ))}
                  {section.students.length > 3 && (
                    <div
                      className="w-8 h-8 bg-amber-200 rounded-full flex items-center justify-center border-2 border-black shadow-sm"
                      style={{ zIndex: 0 }}
                    >
                      <span className="text-xs font-bold text-gray-900">
                        {section.students.length - 3 > 9
                          ? "9+"
                          : `+${section.students.length - 3}`}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs font-medium text-gray-500">
                  No students yet
                </p>
              )}
            </div>

            {/* Hover Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-amber-100/95 via-amber-50/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl flex items-end justify-end p-4 z-20">
              <div className="flex gap-2 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                {/* View Button */}
                <button
                  className="w-11 h-11 bg-amber-100 border-3 border-black rounded-full flex items-center justify-center shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 transition-all"
                  onClick={(e) => onView(section, e)}
                  title="View"
                >
                  <span className="material-icons-outlined text-black text-lg">
                    visibility
                  </span>
                </button>
                {/* Edit Button */}
                <button
                  className="w-11 h-11 bg-amber-100 border-3 border-black rounded-full flex items-center justify-center shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 transition-all"
                  onClick={(e) => onEdit(section, e)}
                  title="Edit"
                >
                  <span className="material-icons-outlined text-black text-lg">
                    edit
                  </span>
                </button>
                {/* Delete Button */}
                <button
                  className="w-11 h-11 bg-amber-100 border-3 border-black rounded-full flex items-center justify-center shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 transition-all"
                  onClick={(e) => onDelete(section.id, section.name, e)}
                  title="Delete"
                >
                  <span className="material-icons-outlined text-black text-lg">
                    delete
                  </span>
                </button>
              </div>
            </div>
          </div>
        }
      />
    </div>
  );
}
