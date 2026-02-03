/* eslint-disable @typescript-eslint/strict-boolean-expressions, @typescript-eslint/explicit-function-return-type */
import TiltedCard from "@/components/TiltedCard";
import type { Quiz } from "./types";
import { getDeadlineProgress, getTimeRemainingText } from "./utils";

type QuizCardProps = {
  quiz: Quiz;
  onCardClick: () => void;
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string, title: string, e: React.MouseEvent) => void;
};

export default function QuizCard({
  quiz,
  onCardClick,
  onView,
  onEdit,
  onDelete,
}: QuizCardProps) {
  const deadlineProgress = getDeadlineProgress(quiz.createdAt, quiz.deadline);
  const timeRemaining = getTimeRemainingText(quiz.createdAt, quiz.deadline);

  // Progress bar color based on time remaining
  const progressBarColor =
    deadlineProgress > 50
      ? "bg-green-500"
      : deadlineProgress > 20
        ? "bg-yellow-500"
        : "bg-red-500";

  return (
    <div onClick={onCardClick} className="cursor-pointer h-full group">
      <TiltedCard
        altText={quiz.title}
        captionText={`${quiz.totalQuestions} questions`}
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
          <div className="bg-amber-100 border-3 border-gray-900 rounded-2xl relative w-full h-full overflow-hidden flex flex-col shadow-[4px_4px_0px_0px_rgba(17,24,39,1)]">
            {/* macOS Traffic Lights */}
            <div className="absolute top-3 left-3 flex gap-1.5 z-10">
              <div className="w-4 h-4 bg-red-500 rounded-full border-2 border-black"></div>
              <div className="w-4 h-4 bg-yellow-500 rounded-full border-2 border-black"></div>
              <div className="w-4 h-4 bg-green-500 rounded-full border-2 border-black"></div>
            </div>
            {/* Header Right - Duration & Question Count */}
            <div className="absolute top-2 right-3 flex items-center gap-2 z-10">
              <div className="flex items-center gap-1 px-2 py-0.5 bg-amber-200 border-2 border-black rounded-full">
                <span className="material-icons-outlined text-black text-xs">
                  schedule
                </span>
                <span className="font-bold text-black text-xs">
                  {quiz.duration ? `${quiz.duration}m` : "∞"}
                </span>
              </div>
              <div className="flex items-center gap-1 px-2 py-0.5 bg-amber-200 border-2 border-black rounded-full">
                <span className="material-icons-outlined text-black text-xs">
                  help_outline
                </span>
                <span className="font-bold text-black text-xs">
                  {quiz.totalQuestions}
                </span>
              </div>
            </div>
            {/* Separator Line */}
            <div className="absolute top-11 left-0 right-0 h-0.5 bg-black z-10"></div>

            {/* Content */}
            <div className="pt-14 px-4 pb-2 text-left flex-1">
              <h3 className="text-base font-black text-gray-900 mb-1">
                {quiz.title}
              </h3>
              {quiz.description && (
                <p
                  className="text-sm font-medium text-gray-700 line-clamp-2"
                  style={{
                    fontFamily: "'Google Sans Mono', monospace",
                  }}
                >
                  {quiz.description}
                </p>
              )}
            </div>

            {/* Deadline Progress Bar */}
            <div className="px-4 pb-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-gray-600">
                  Deadline
                </span>
                <span className="text-xs font-bold text-gray-900">
                  {timeRemaining}
                </span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full border border-black overflow-hidden">
                <div
                  className={`h-full ${progressBarColor} transition-all duration-300`}
                  style={{ width: `${deadlineProgress}%` }}
                ></div>
              </div>
            </div>

            {/* Hover Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-amber-100/95 via-amber-50/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl flex items-end justify-end p-4 z-20">
              <div className="flex gap-2 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                {/* View Button */}
                <button
                  className="w-11 h-11 bg-amber-100 border-3 border-black rounded-full flex items-center justify-center shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 transition-all"
                  onClick={(e) => {
                    e.stopPropagation();
                    onView(quiz.id);
                  }}
                  title="View"
                >
                  <span className="material-icons-outlined text-black text-lg">
                    visibility
                  </span>
                </button>
                {/* Edit Button */}
                <button
                  className="w-11 h-11 bg-amber-100 border-3 border-black rounded-full flex items-center justify-center shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 transition-all"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(quiz.id);
                  }}
                  title="Edit"
                >
                  <span className="material-icons-outlined text-black text-lg">
                    edit
                  </span>
                </button>
                {/* Delete Button */}
                <button
                  className="w-11 h-11 bg-amber-100 border-3 border-black rounded-full flex items-center justify-center shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 transition-all"
                  onClick={(e) => onDelete(quiz.id, quiz.title, e)}
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
