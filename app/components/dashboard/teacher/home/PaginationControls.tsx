/* eslint-disable @typescript-eslint/explicit-function-return-type */

type PaginationProps = {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};

export function DesktopPagination({
  currentPage,
  totalPages,
  onPageChange,
}: PaginationProps) {
  return (
    <div className="absolute -left-16 top-0 flex flex-col gap-2">
      {/* Up Button */}
      <button
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
        className={`w-10 h-10 rounded-full border-3 border-gray-900 flex items-center justify-center transition-all ${
          currentPage === 1
            ? "bg-gray-200 text-gray-400 cursor-not-allowed"
            : "bg-amber-100 text-gray-900 hover:bg-amber-200 shadow-[3px_3px_0px_0px_rgba(17,24,39,1)] hover:shadow-[4px_4px_0px_0px_rgba(17,24,39,1)]"
        }`}
      >
        <span className="material-icons-outlined text-lg">expand_less</span>
      </button>

      {/* Page Dots */}
      {Array.from({ length: Math.max(1, totalPages) }, (_, i) => i + 1).map(
        (page) => (
          <button
            key={page}
            onClick={() => onPageChange(page)}
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

      {/* Down Button */}
      <button
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages || totalPages <= 1}
        className={`w-10 h-10 rounded-full border-3 border-gray-900 flex items-center justify-center transition-all ${
          currentPage === totalPages || totalPages <= 1
            ? "bg-gray-200 text-gray-400 cursor-not-allowed"
            : "bg-amber-100 text-gray-900 hover:bg-amber-200 shadow-[3px_3px_0px_0px_rgba(17,24,39,1)] hover:shadow-[4px_4px_0px_0px_rgba(17,24,39,1)]"
        }`}
      >
        <span className="material-icons-outlined text-lg">expand_more</span>
      </button>
    </div>
  );
}

export function MobilePagination({
  currentPage,
  totalPages,
  onPageChange,
}: PaginationProps) {
  return (
    <div className="flex flex-col items-center gap-2 mt-8 xl:hidden">
      <div className="flex items-center gap-2">
        {/* Previous Button */}
        <button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className={`w-10 h-10 rounded-full border-3 border-gray-900 flex items-center justify-center transition-all ${
            currentPage === 1
              ? "bg-gray-200 text-gray-400 cursor-not-allowed"
              : "bg-amber-100 text-gray-900 hover:bg-amber-200 shadow-[3px_3px_0px_0px_rgba(17,24,39,1)] hover:shadow-[4px_4px_0px_0px_rgba(17,24,39,1)]"
          }`}
        >
          <span className="material-icons-outlined text-lg">chevron_left</span>
        </button>

        {/* Page Dots */}
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={`w-10 h-10 rounded-full border-3 border-gray-900 flex items-center justify-center font-bold transition-all ${
              currentPage === page
                ? "bg-gray-900 text-amber-100"
                : "bg-amber-100 text-gray-900 hover:bg-amber-200 shadow-[3px_3px_0px_0px_rgba(17,24,39,1)] hover:shadow-[4px_4px_0px_0px_rgba(17,24,39,1)]"
            }`}
          >
            {page}
          </button>
        ))}

        {/* Next Button */}
        <button
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className={`w-10 h-10 rounded-full border-3 border-gray-900 flex items-center justify-center transition-all ${
            currentPage === totalPages
              ? "bg-gray-200 text-gray-400 cursor-not-allowed"
              : "bg-amber-100 text-gray-900 hover:bg-amber-200 shadow-[3px_3px_0px_0px_rgba(17,24,39,1)] hover:shadow-[4px_4px_0px_0px_rgba(17,24,39,1)]"
          }`}
        >
          <span className="material-icons-outlined text-lg">chevron_right</span>
        </button>
      </div>
    </div>
  );
}
