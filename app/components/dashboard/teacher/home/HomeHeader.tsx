/* eslint-disable @typescript-eslint/explicit-function-return-type */
import type { FilterOption } from "./types";

type HomeHeaderProps = {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  showFilters: boolean;
  setShowFilters: (show: boolean) => void;
  activeFilter: string;
  setActiveFilter: (filter: string) => void;
  filters: FilterOption[];
  onSearch: (e: React.FormEvent) => void;
};

export default function HomeHeader({
  searchQuery,
  setSearchQuery,
  showFilters,
  setShowFilters,
  activeFilter,
  setActiveFilter,
  filters,
  onSearch,
}: HomeHeaderProps) {
  return (
    <div className="w-full max-w-2xl px-4 flex flex-col gap-6">
      {/* Title Section */}
      <div className="text-center">
        <h1 className="text-5xl font-black text-gray-900 tracking-tight mb-3">
          Ready to Educate?
        </h1>
        <div className="flex gap-1 justify-center mb-2">
          <p className="w-5 h-5 bg-red-500 border-2 border-gray-800 rounded-full"></p>
          <p className="w-5 h-5 bg-orange-500 rounded-full border-2 border-gray-800"></p>
          <p className="w-5 h-5 bg-green-500 rounded-full border-2 border-gray-800"></p>
        </div>
        <p className="text-lg font-medium text-gray-700">
          Search for quizzes, create new assessments, or manage your sections.
          Your classroom tools are just a search away.
        </p>
      </div>

      {/* Search Bar */}
      <form onSubmit={(e) => void onSearch(e)}>
        <div className="flex items-center bg-amber-100 border-3 border-gray-900 rounded-full shadow-[4px_4px_0px_0px_rgba(31,41,55,1)]">
          <span className="material-icons-outlined text-gray-900 text-xl pl-4">
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search quizzes..."
            className="flex-1 px-3 py-3 bg-transparent text-gray-900 font-medium placeholder:text-gray-500 focus:outline-none"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="pr-2"
            >
              <span className="material-icons-outlined text-gray-500 hover:text-gray-900 transition-colors text-xl">
                close
              </span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={`mr-2 w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
              showFilters
                ? "bg-gray-900 text-amber-100"
                : "bg-transparent text-gray-900 hover:bg-amber-200"
            }`}
          >
            <span className="material-icons-outlined text-lg">tune</span>
          </button>
        </div>
      </form>

      {/* Filter Pills - Collapsible with Animation */}
      <div
        className={`flex justify-end overflow-hidden transition-all duration-300 ease-out ${
          showFilters ? "max-h-20 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="flex items-center gap-2 bg-amber-100 border-3 border-gray-900 rounded-full p-1.5">
          {filters.map((filter) => (
            <button
              key={filter.id}
              type="button"
              onClick={() => setActiveFilter(filter.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-bold text-sm transition-all ${
                activeFilter === filter.id
                  ? "bg-gray-900 text-amber-100"
                  : "bg-amber-200 text-gray-900 hover:bg-amber-300 border-2 border-gray-900"
              }`}
            >
              <span className="material-icons-outlined text-base">
                {filter.icon}
              </span>
              <span>{filter.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
