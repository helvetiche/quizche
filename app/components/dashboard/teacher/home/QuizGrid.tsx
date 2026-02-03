/* eslint-disable @typescript-eslint/explicit-function-return-type */
import Masonry, { type MasonryItem } from "@/components/Masonry";
import type { DashboardTab } from "../../TabContext";
import QuizCard from "./QuizCard";
import { DesktopPagination, MobilePagination } from "./PaginationControls";
import type { Quiz } from "./types";

type QuizGridProps = {
  quizzes: Quiz[];
  loading: boolean;
  searchQuery: string;
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
  setCurrentPage: (page: number) => void;
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string, title: string, e: React.MouseEvent) => void;
  onCreate: () => void;
  setActiveTab: (tab: DashboardTab) => void;
};

export default function QuizGrid({
  quizzes,
  loading,
  searchQuery,
  currentPage,
  totalPages,
  itemsPerPage,
  setCurrentPage,
  onView,
  onEdit,
  onDelete,
  onCreate,
  setActiveTab,
}: QuizGridProps) {
  const paginatedQuizzes = quizzes.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="w-full max-w-6xl px-4 mt-6 relative">
      {/* Vertical Pagination - Left Side of Cards */}
      {!loading && quizzes.length > 0 && (
        <DesktopPagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      )}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="bg-amber-100 border-3 border-gray-900 rounded-2xl shadow-[4px_4px_0px_0px_rgba(17,24,39,1)] overflow-hidden animate-pulse"
              style={{ height: "220px" }}
            >
              {/* Header with traffic lights */}
              <div className="flex items-center justify-between px-3 py-2.5 border-b-2 border-gray-900">
                <div className="flex gap-1.5">
                  <div className="w-4 h-4 bg-gray-300 rounded-full border-2 border-gray-900"></div>
                  <div className="w-4 h-4 bg-gray-300 rounded-full border-2 border-gray-900"></div>
                  <div className="w-4 h-4 bg-gray-300 rounded-full border-2 border-gray-900"></div>
                </div>
                <div className="w-8 h-8 bg-gray-300 rounded-full border-2 border-gray-900"></div>
              </div>

              {/* Content skeleton */}
              <div className="p-4 flex flex-col gap-3">
                <div className="h-5 bg-gray-300 rounded-full border-2 border-gray-900 w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded-full border-2 border-gray-900 w-full"></div>
                <div className="h-4 bg-gray-200 rounded-full border-2 border-gray-900 w-2/3"></div>
              </div>

              {/* Progress bar skeleton */}
              <div className="px-4 pb-3 mt-auto">
                <div className="flex justify-between mb-1">
                  <div className="h-3 bg-gray-300 rounded-full border border-gray-900 w-16"></div>
                  <div className="h-3 bg-gray-300 rounded-full border border-gray-900 w-20"></div>
                </div>
                <div className="h-2 bg-gray-200 rounded-full border border-gray-900 w-full"></div>
              </div>
            </div>
          ))}
        </div>
      ) : quizzes.length === 0 ? (
        <div className="text-center py-8">
          <p className="font-bold text-gray-700">
            {searchQuery
              ? "No quizzes found matching your search."
              : "No quizzes yet. Create your first quiz"}
          </p>
          <button
            onClick={onCreate}
            className="mt-4 px-6 py-3 bg-gray-900 text-amber-100 font-bold border-3 border-gray-900 rounded-full shadow-[4px_4px_0px_0px_rgba(31,41,55,1)] hover:shadow-[5px_5px_0px_0px_rgba(31,41,55,1)] transition-all"
          >
            + Create Quiz
          </button>
        </div>
      ) : (
        <>
          <Masonry
            items={paginatedQuizzes.map((quiz): MasonryItem => {
              const hasDescription = (quiz.description?.length ?? 0) > 0;

              return {
                id: quiz.id,
                height: hasDescription ? 240 : 200,
                content: (
                  <QuizCard
                    quiz={quiz}
                    onCardClick={() => setActiveTab("quizzes")}
                    onView={onView}
                    onEdit={onEdit}
                    onDelete={onDelete}
                  />
                ),
              };
            })}
            animateFrom="bottom"
            stagger={0.08}
            blurToFocus={true}
            gap={32}
            animationKey={currentPage}
          />

          {/* Vertical Pagination - Left Side (Mobile) */}
          {quizzes.length > 0 && totalPages > 1 && (
            <MobilePagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          )}
        </>
      )}
    </div>
  );
}
