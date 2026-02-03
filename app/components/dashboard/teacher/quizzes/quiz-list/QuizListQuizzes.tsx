import { type ReactElement } from "react";
import TiltedCard from "@/components/TiltedCard";
import Masonry, { type MasonryItem } from "@/components/Masonry";
import { type Quiz } from "./types";

type QuizListQuizzesProps = {
  quizzes: Quiz[];
  loading: boolean;
  error: string | null;
  showQuizzes: boolean;
  setShowQuizzes: (show: boolean) => void;
  currentPage: number;
  setCurrentPage: (page: number | ((prev: number) => number)) => void;
  itemsPerPage: number;
  totalPages: number;
  searchQuery: string;
  onEditQuiz: (quizId: string) => void;
  onDeleteQuiz: (
    quizId: string,
    quizTitle: string,
    e: React.MouseEvent
  ) => void;
  onGoToDetail: (quizId: string) => void;
  onGoToCreate: () => void;
};

export default function QuizListQuizzes({
  quizzes,
  loading,
  error,
  showQuizzes,
  setShowQuizzes,
  currentPage,
  setCurrentPage,
  itemsPerPage,
  totalPages,
  searchQuery,
  onEditQuiz,
  onDeleteQuiz,
  onGoToDetail,
  onGoToCreate,
}: QuizListQuizzesProps): ReactElement {
  const getDeadlineProgress = (
    createdAt: string,
    deadline?: string
  ): number => {
    const now = new Date();
    const created = new Date(createdAt);
    const deadlineDate =
      deadline !== undefined && deadline !== ""
        ? new Date(deadline)
        : new Date(created.getTime() + 7 * 24 * 60 * 60 * 1000);

    const totalDuration = deadlineDate.getTime() - created.getTime();
    const elapsed = now.getTime() - created.getTime();
    const remaining = Math.max(0, 100 - (elapsed / totalDuration) * 100);

    return Math.min(100, Math.max(0, remaining));
  };

  const getTimeRemainingText = (
    createdAt: string,
    deadline?: string
  ): string => {
    const now = new Date();
    const created = new Date(createdAt);
    const deadlineDate =
      deadline !== undefined && deadline !== ""
        ? new Date(deadline)
        : new Date(created.getTime() + 7 * 24 * 60 * 60 * 1000);

    const diff = deadlineDate.getTime() - now.getTime();

    if (diff <= 0) return "Expired";

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) return `${days}d ${hours}h left`;
    if (hours > 0) return `${hours}h left`;
    return "< 1h left";
  };

  return (
    <div className="w-full max-w-6xl px-4 mt-8">
      <div className="relative">
        {/* Vertical Pagination - Left Side (aligned with header) */}
        {!loading && quizzes.length > 0 && showQuizzes && (
          <div className="absolute -left-16 top-0 flex-col gap-2 hidden xl:flex">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className={`w-10 h-10 rounded-full border-3 border-gray-900 flex items-center justify-center transition-all ${
                currentPage === 1
                  ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                  : "bg-amber-100 text-gray-900 hover:bg-amber-200 shadow-[3px_3px_0px_0px_rgba(17,24,39,1)] hover:shadow-[4px_4px_0px_0px_rgba(17,24,39,1)]"
              }`}
            >
              <span className="material-icons-outlined text-lg">
                expand_less
              </span>
            </button>

            {Array.from(
              { length: Math.max(1, totalPages) },
              (_, i) => i + 1
            ).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`w-10 h-10 rounded-full border-3 border-gray-900 flex items-center justify-center font-bold transition-all ${
                  currentPage === page
                    ? "bg-gray-900 text-amber-100"
                    : "bg-amber-100 text-gray-900 hover:bg-amber-200 shadow-[3px_3px_0px_0px_rgba(17,24,39,1)] hover:shadow-[4px_4px_0px_0px_rgba(17,24,39,1)]"
                }`}
              >
                {page}
              </button>
            ))}

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages || totalPages <= 1}
              className={`w-10 h-10 rounded-full border-3 border-gray-900 flex items-center justify-center transition-all ${
                currentPage === totalPages || totalPages <= 1
                  ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                  : "bg-amber-100 text-gray-900 hover:bg-amber-200 shadow-[3px_3px_0px_0px_rgba(17,24,39,1)] hover:shadow-[4px_4px_0px_0px_rgba(17,24,39,1)]"
              }`}
            >
              <span className="material-icons-outlined text-lg">
                expand_more
              </span>
            </button>
          </div>
        )}

        {/* Quizzes Header */}
        <div className="mb-4">
          <button
            onClick={() => setShowQuizzes(!showQuizzes)}
            className="flex items-center gap-2 text-gray-900 hover:text-gray-700 transition-colors"
          >
            <span className="material-icons-outlined text-lg">
              {showQuizzes ? "expand_more" : "chevron_right"}
            </span>
            <h2 className="text-lg font-black">My Quizzes</h2>
            <span className="px-2 py-0.5 bg-amber-200 border-2 border-gray-900 rounded-full text-xs font-bold">
              {quizzes.length}
            </span>
          </button>
          <p className="text-sm text-gray-600 mt-1 ml-7">
            Published quizzes ready for your students
          </p>
        </div>

        {showQuizzes && (
          <div>
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="bg-amber-100 border-3 border-gray-900 rounded-2xl shadow-[4px_4px_0px_0px_rgba(17,24,39,1)] overflow-hidden animate-pulse"
                    style={{ height: "240px" }}
                  >
                    <div className="flex items-center justify-between px-3 py-2.5 border-b-2 border-gray-900">
                      <div className="flex gap-1.5">
                        <div className="w-4 h-4 bg-gray-300 rounded-full border-2 border-gray-900"></div>
                        <div className="w-4 h-4 bg-gray-300 rounded-full border-2 border-gray-900"></div>
                        <div className="w-4 h-4 bg-gray-300 rounded-full border-2 border-gray-900"></div>
                      </div>
                      <div className="w-16 h-5 bg-gray-300 rounded-full border-2 border-gray-900"></div>
                    </div>
                    <div className="p-4 flex flex-col gap-3">
                      <div className="h-5 bg-gray-300 rounded-full border-2 border-gray-900 w-3/4"></div>
                      <div className="h-4 bg-gray-200 rounded-full border-2 border-gray-900 w-full"></div>
                      <div className="h-4 bg-gray-200 rounded-full border-2 border-gray-900 w-2/3"></div>
                    </div>
                    <div className="px-4 pb-3 mt-auto">
                      <div className="h-2 bg-gray-200 rounded-full border border-gray-900 w-full"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : error !== null && error !== "" ? (
              <div className="bg-red-400 border-4 border-gray-900 rounded-2xl p-8 shadow-[4px_4px_0px_0px_rgba(31,41,55,1)] flex flex-col items-center justify-center gap-4">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center border-3 border-gray-900">
                  <span className="material-icons-outlined text-red-500 text-3xl">
                    error
                  </span>
                </div>
                <p className="text-lg font-bold text-gray-900">{error}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="px-6 py-3 bg-white text-gray-900 font-bold border-3 border-gray-900 rounded-full shadow-[3px_3px_0px_0px_rgba(31,41,55,1)] hover:shadow-[4px_4px_0px_0px_rgba(31,41,55,1)] transition-all"
                >
                  Retry
                </button>
              </div>
            ) : quizzes.length === 0 ? (
              <div className="bg-amber-200 border-4 border-gray-900 rounded-2xl p-12 shadow-[4px_4px_0px_0px_rgba(31,41,55,1)] flex flex-col items-center justify-center gap-4">
                <div className="w-20 h-20 bg-cyan-400 rounded-full flex items-center justify-center border-3 border-gray-900">
                  <span className="material-icons-outlined text-gray-900 text-4xl">
                    quiz
                  </span>
                </div>
                <p className="text-xl font-black text-gray-900 text-center">
                  {searchQuery ? "No quizzes found" : "No quizzes yet"}
                </p>
                <p className="text-base font-medium text-gray-700 text-center">
                  {searchQuery
                    ? "Try adjusting your search or filters."
                    : "Create your first quiz to get started"}
                </p>
                {!searchQuery && (
                  <button
                    onClick={onGoToCreate}
                    className="mt-2 px-5 py-3 bg-amber-100 text-gray-900 font-bold border-3 border-gray-900 rounded-full shadow-[4px_4px_0px_0px_rgba(31,41,55,1)] hover:shadow-[5px_5px_0px_0px_rgba(31,41,55,1)] transition-all flex items-center gap-2"
                  >
                    <span className="w-6 h-6 bg-gray-900 rounded-full flex items-center justify-center">
                      <span className="material-icons-outlined text-amber-100 text-sm">
                        add
                      </span>
                    </span>
                    <span>Create Quiz</span>
                  </button>
                )}
              </div>
            ) : (
              <>
                <Masonry
                  items={quizzes
                    .slice(
                      (currentPage - 1) * itemsPerPage,
                      currentPage * itemsPerPage
                    )
                    .map((quiz): MasonryItem => {
                      const hasDescription = quiz.description.length > 0;
                      const deadlineProgress = getDeadlineProgress(
                        quiz.createdAt,
                        quiz.deadline
                      );
                      const timeRemaining = getTimeRemainingText(
                        quiz.createdAt,
                        quiz.deadline
                      );
                      const progressBarColor =
                        deadlineProgress > 50
                          ? "bg-green-500"
                          : deadlineProgress > 20
                            ? "bg-yellow-500"
                            : "bg-red-500";

                      return {
                        id: quiz.id,
                        height: hasDescription ? 240 : 200,
                        content: (
                          <div
                            onClick={() => onGoToDetail(quiz.id)}
                            className="cursor-pointer h-full group"
                          >
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
                                        {typeof quiz.duration === "number"
                                          ? `${quiz.duration}m`
                                          : "∞"}
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
                                    {quiz.description.length > 0 && (
                                      <p
                                        className="text-sm font-medium text-gray-700 line-clamp-2"
                                        style={{
                                          fontFamily:
                                            "'Google Sans Mono', monospace",
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
                                        style={{
                                          width: `${deadlineProgress}%`,
                                        }}
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
                                          onGoToDetail(quiz.id);
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
                                          onEditQuiz(quiz.id);
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
                                        onClick={(e) =>
                                          onDeleteQuiz(quiz.id, quiz.title, e)
                                        }
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
                        ),
                      };
                    })}
                  animateFrom="bottom"
                  stagger={0.08}
                  blurToFocus={true}
                  gap={32}
                  animationKey={`quizzes-${currentPage}-${showQuizzes}`}
                />

                {/* Mobile Pagination */}
                {quizzes.length > 0 && totalPages > 1 && (
                  <div className="flex flex-col items-center gap-2 mt-8 xl:hidden">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() =>
                          setCurrentPage((p) => Math.max(1, p - 1))
                        }
                        disabled={currentPage === 1}
                        className={`w-10 h-10 rounded-full border-3 border-gray-900 flex items-center justify-center transition-all ${
                          currentPage === 1
                            ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                            : "bg-amber-100 text-gray-900 hover:bg-amber-200 shadow-[3px_3px_0px_0px_rgba(17,24,39,1)] hover:shadow-[4px_4px_0px_0px_rgba(17,24,39,1)]"
                        }`}
                      >
                        <span className="material-icons-outlined text-lg">
                          chevron_left
                        </span>
                      </button>

                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                        (page) => (
                          <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            className={`w-10 h-10 rounded-full border-3 border-gray-900 flex items-center justify-center font-bold transition-all ${
                              currentPage === page
                                ? "bg-gray-900 text-amber-100"
                                : "bg-amber-100 text-gray-900 hover:bg-amber-200 shadow-[3px_3px_0px_0px_rgba(17,24,39,1)] hover:shadow-[4px_4px_0px_0px_rgba(17,24,39,1)]"
                            }`}
                          >
                            {page}
                          </button>
                        )
                      )}

                      <button
                        onClick={() =>
                          setCurrentPage((p) => Math.min(totalPages, p + 1))
                        }
                        disabled={currentPage === totalPages}
                        className={`w-10 h-10 rounded-full border-3 border-gray-900 flex items-center justify-center transition-all ${
                          currentPage === totalPages
                            ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                            : "bg-amber-100 text-gray-900 hover:bg-amber-200 shadow-[3px_3px_0px_0px_rgba(17,24,39,1)] hover:shadow-[4px_4px_0px_0px_rgba(17,24,39,1)]"
                        }`}
                      >
                        <span className="material-icons-outlined text-lg">
                          chevron_right
                        </span>
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
