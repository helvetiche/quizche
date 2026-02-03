import { type ReactElement } from "react";
import TiltedCard from "@/components/TiltedCard";
import Masonry, { type MasonryItem } from "@/components/Masonry";
import { type Draft } from "./types";

type QuizListDraftsProps = {
  drafts: Draft[];
  loading: boolean;
  showDrafts: boolean;
  setShowDrafts: (show: boolean) => void;
  draftPage: number;
  setDraftPage: (page: number | ((prev: number) => number)) => void;
  itemsPerPage: number;
  totalDraftPages: number;
  onContinueDraft: (draftId: string) => void;
};

export default function QuizListDrafts({
  drafts,
  loading,
  showDrafts,
  setShowDrafts,
  draftPage,
  setDraftPage,
  itemsPerPage,
  totalDraftPages,
  onContinueDraft,
}: QuizListDraftsProps): ReactElement | null {
  const formatTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  if (!drafts.length && !loading) return null;

  return (
    <div className="w-full max-w-6xl px-4 mt-8">
      <div className="mb-4">
        <button
          onClick={() => setShowDrafts(!showDrafts)}
          className="flex items-center gap-2 text-gray-900 hover:text-gray-700 transition-colors"
        >
          <span className="material-icons-outlined text-lg">
            {showDrafts ? "expand_more" : "chevron_right"}
          </span>
          <h2 className="text-lg font-black">Drafts</h2>
          <span className="px-2 py-0.5 bg-sky-300 border-2 border-gray-900 rounded-full text-xs font-bold">
            {drafts.length}
          </span>
        </button>
        <p className="text-sm text-gray-600 mt-1 ml-7">
          Unfinished quizzes waiting to be completed
        </p>
      </div>

      {showDrafts && (
        <div className="relative">
          {/* Vertical Pagination - Left Side */}
          {!loading && drafts.length > 0 && (
            <div className="absolute -left-16 top-0 flex-col gap-2 hidden xl:flex z-10">
              {/* Up Button */}
              <button
                onClick={() => setDraftPage((p) => Math.max(1, p - 1))}
                disabled={draftPage === 1}
                className={`w-10 h-10 rounded-full border-3 border-gray-900 flex items-center justify-center transition-all ${
                  draftPage === 1
                    ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                    : "bg-sky-100 text-gray-900 hover:bg-sky-200 shadow-[3px_3px_0px_0px_rgba(17,24,39,1)] hover:shadow-[4px_4px_0px_0px_rgba(17,24,39,1)]"
                }`}
              >
                <span className="material-icons-outlined text-lg">
                  expand_less
                </span>
              </button>

              {/* Page Numbers */}
              {Array.from(
                { length: Math.max(1, totalDraftPages) },
                (_, i) => i + 1
              ).map((page) => (
                <button
                  key={page}
                  onClick={() => setDraftPage(page)}
                  className={`w-10 h-10 rounded-full border-3 border-gray-900 flex items-center justify-center font-bold transition-all ${
                    draftPage === page
                      ? "bg-gray-900 text-sky-100"
                      : "bg-sky-100 text-gray-900 hover:bg-sky-200 shadow-[3px_3px_0px_0px_rgba(17,24,39,1)] hover:shadow-[4px_4px_0px_0px_rgba(17,24,39,1)]"
                  }`}
                >
                  {page}
                </button>
              ))}

              {/* Down Button */}
              <button
                onClick={() =>
                  setDraftPage((p) => Math.min(totalDraftPages, p + 1))
                }
                disabled={draftPage === totalDraftPages || totalDraftPages <= 1}
                className={`w-10 h-10 rounded-full border-3 border-gray-900 flex items-center justify-center transition-all ${
                  draftPage === totalDraftPages || totalDraftPages <= 1
                    ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                    : "bg-sky-100 text-gray-900 hover:bg-sky-200 shadow-[3px_3px_0px_0px_rgba(17,24,39,1)] hover:shadow-[4px_4px_0px_0px_rgba(17,24,39,1)]"
                }`}
              >
                <span className="material-icons-outlined text-lg">
                  expand_more
                </span>
              </button>
            </div>
          )}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-sky-200 border-3 border-gray-900 rounded-2xl shadow-[4px_4px_0px_0px_rgba(17,24,39,1)] overflow-hidden animate-pulse"
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
                    <div className="h-4 bg-gray-300 rounded-full border-2 border-gray-900 w-full"></div>
                    <div className="h-4 bg-gray-300 rounded-full border-2 border-gray-900 w-2/3"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <>
              <Masonry
                items={drafts
                  .slice(
                    (draftPage - 1) * itemsPerPage,
                    draftPage * itemsPerPage
                  )
                  .map((draft): MasonryItem => {
                    const hasDescription = draft.description.length > 0;

                    return {
                      id: draft.id,
                      height: hasDescription ? 240 : 200,
                      content: (
                        <div
                          onClick={() => onContinueDraft(draft.id)}
                          className="cursor-pointer h-full group"
                        >
                          <TiltedCard
                            altText={draft.title || "Untitled Draft"}
                            captionText={`${draft.totalQuestions} questions`}
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
                              <div className="bg-sky-200 border-3 border-gray-900 rounded-2xl relative w-full h-full overflow-hidden flex flex-col shadow-[4px_4px_0px_0px_rgba(17,24,39,1)] group/draft">
                                {/* macOS Traffic Lights */}
                                <div className="absolute top-3 left-3 flex gap-1.5 z-10">
                                  <div className="w-4 h-4 bg-red-500 rounded-full border-2 border-black"></div>
                                  <div className="w-4 h-4 bg-yellow-500 rounded-full border-2 border-black"></div>
                                  <div className="w-4 h-4 bg-green-500 rounded-full border-2 border-black"></div>
                                </div>
                                {/* Header Right - Draft badge & Question Count */}
                                <div className="absolute top-2 right-3 flex items-center gap-2 z-10">
                                  <div className="flex items-center gap-1 px-2 py-0.5 bg-sky-300 border-2 border-black rounded-full">
                                    <span className="material-icons-outlined text-black text-xs">
                                      edit_note
                                    </span>
                                    <span className="font-bold text-black text-xs">
                                      Draft
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1 px-2 py-0.5 bg-sky-300 border-2 border-black rounded-full">
                                    <span className="material-icons-outlined text-black text-xs">
                                      help_outline
                                    </span>
                                    <span className="font-bold text-black text-xs">
                                      {draft.totalQuestions}
                                    </span>
                                  </div>
                                </div>
                                {/* Separator Line */}
                                <div className="absolute top-11 left-0 right-0 h-0.5 bg-black z-10"></div>

                                {/* Content */}
                                <div className="pt-14 px-4 pb-2 text-left flex-1">
                                  <h3 className="text-base font-black text-gray-900 mb-1">
                                    {draft.title || "Untitled Draft"}
                                  </h3>
                                  {draft.description.length > 0 && (
                                    <p
                                      className="text-sm font-medium text-gray-700 line-clamp-2"
                                      style={{
                                        fontFamily:
                                          "'Google Sans Mono', monospace",
                                      }}
                                    >
                                      {draft.description}
                                    </p>
                                  )}
                                </div>

                                {/* Last Updated */}
                                <div className="px-4 pb-3">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs font-bold text-gray-600">
                                      Last edited
                                    </span>
                                    <span className="text-xs font-bold text-gray-900">
                                      {formatTimeAgo(draft.updatedAt)}
                                    </span>
                                  </div>
                                  <div className="h-2 bg-sky-300 rounded-full border border-black overflow-hidden">
                                    <div className="h-full bg-sky-500 w-full"></div>
                                  </div>
                                </div>

                                {/* Hover Overlay */}
                                <div className="absolute inset-0 bg-gradient-to-t from-sky-300/95 via-sky-200/80 to-sky-100/60 opacity-0 group-hover/draft:opacity-100 transition-opacity duration-300 rounded-2xl flex items-end justify-end p-4 z-20">
                                  <button
                                    className="px-4 py-2 bg-sky-100 border-3 border-black rounded-full flex items-center justify-center gap-2 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 transition-all transform translate-y-4 group-hover/draft:translate-y-0"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onContinueDraft(draft.id);
                                    }}
                                  >
                                    <span className="material-icons-outlined text-black text-lg">
                                      edit
                                    </span>
                                    <span className="font-bold text-black text-sm">
                                      Continue
                                    </span>
                                  </button>
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
                animationKey={`drafts-${draftPage}-${showDrafts}`}
              />

              {/* Mobile Drafts Pagination */}
              {drafts.length > 0 && (
                <div className="flex flex-col items-center gap-2 mt-8 xl:hidden">
                  <div className="flex items-center gap-2">
                    {/* Previous Button */}
                    <button
                      onClick={() => setDraftPage((p) => Math.max(1, p - 1))}
                      disabled={draftPage === 1}
                      className={`w-10 h-10 rounded-full border-3 border-gray-900 flex items-center justify-center transition-all ${
                        draftPage === 1
                          ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                          : "bg-sky-100 text-gray-900 hover:bg-sky-200 shadow-[3px_3px_0px_0px_rgba(17,24,39,1)] hover:shadow-[4px_4px_0px_0px_rgba(17,24,39,1)]"
                      }`}
                    >
                      <span className="material-icons-outlined text-lg">
                        chevron_left
                      </span>
                    </button>

                    {/* Page Numbers */}
                    {Array.from(
                      { length: Math.max(1, totalDraftPages) },
                      (_, i) => i + 1
                    ).map((page) => (
                      <button
                        key={page}
                        onClick={() => setDraftPage(page)}
                        className={`w-10 h-10 rounded-full border-3 border-gray-900 flex items-center justify-center font-bold transition-all ${
                          draftPage === page
                            ? "bg-gray-900 text-sky-100"
                            : "bg-sky-100 text-gray-900 hover:bg-sky-200 shadow-[3px_3px_0px_0px_rgba(17,24,39,1)] hover:shadow-[4px_4px_0px_0px_rgba(17,24,39,1)]"
                        }`}
                      >
                        {page}
                      </button>
                    ))}

                    {/* Next Button */}
                    <button
                      onClick={() =>
                        setDraftPage((p) => Math.min(totalDraftPages, p + 1))
                      }
                      disabled={
                        draftPage === totalDraftPages || totalDraftPages <= 1
                      }
                      className={`w-10 h-10 rounded-full border-3 border-gray-900 flex items-center justify-center transition-all ${
                        draftPage === totalDraftPages || totalDraftPages <= 1
                          ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                          : "bg-sky-100 text-gray-900 hover:bg-sky-200 shadow-[3px_3px_0px_0px_rgba(17,24,39,1)] hover:shadow-[4px_4px_0px_0px_rgba(17,24,39,1)]"
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
  );
}
