/* eslint-disable @typescript-eslint/strict-boolean-expressions, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unnecessary-condition, @typescript-eslint/explicit-function-return-type, @typescript-eslint/no-explicit-any, @typescript-eslint/no-floating-promises */
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import { getAuth } from "firebase/auth";
import app from "@/lib/firebase";
import TiltedCard from "@/components/TiltedCard";
import Masonry, { type MasonryItem } from "@/components/Masonry";
import ViewFlashcardModal from "./ViewFlashcardModal";

type FlashcardSet = {
  id: string;
  title: string;
  description?: string;
  totalCards: number;
  isPublic: boolean;
  coverImageUrl?: string;
  createdAt: string;
  updatedAt: string;
  isShared?: boolean;
  sharedBy?: string;
  sharedByPhotoUrl?: string;
  sharedByUserId?: string;
  sharedBySchool?: string;
  tags?: string[];
};

type StudentHomeContentProps = {
  user: any;
};

const PortalTooltip = ({
  children,
  title,
  description,
}: {
  children: React.ReactNode;
  title: string;
  description: string;
}) => {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPosition({
        top: rect.top - 8, // Offset above the element
        left: rect.left + rect.width / 2,
      });
      setVisible(true);
    }
  };

  const handleMouseLeave = () => {
    setVisible(false);
  };

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="relative flex"
      >
        {children}
      </div>
      {visible &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed z-[9999] pointer-events-none transform -translate-x-1/2 -translate-y-full px-3 py-2 bg-amber-100 text-gray-900 border-2 border-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] min-w-[120px] animate-[fadeIn_0.2s_ease-out]"
            style={{ top: position.top, left: position.left }}
          >
            <span className="block text-xs font-bold mb-0.5">{title}</span>
            <span className="block text-[10px] font-medium leading-tight text-gray-600">
              {description}
            </span>
          </div>,
          document.body
        )}
    </>
  );
};

export default function StudentHomeContent({ user }: StudentHomeContentProps) {
  const [flashcards, setFlashcards] = useState<FlashcardSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [activeFilter, setActiveFilter] = useState<
    "all" | "recent" | "popular"
  >("all");
  const [viewModalFlashcard, setViewModalFlashcard] =
    useState<FlashcardSet | null>(null);

  const filters = [
    { id: "all", label: "All", icon: "apps" },
    { id: "recent", label: "Recent", icon: "schedule" },
    { id: "popular", label: "Popular", icon: "local_fire_department" },
  ];

  const fetchPublicFlashcards = useCallback(async (): Promise<void> => {
    if (!user) return;

    try {
      const auth = getAuth(app);
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      const idToken = await currentUser.getIdToken();

      const response = await fetch("/api/flashcards?public=true", {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });

      if (response.ok !== undefined && response.ok !== null) {
        const data = await response.json();
        setFlashcards(data.flashcards ?? []);
      }
    } catch (error) {
      console.error("Error fetching public flashcards:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchPublicFlashcards();
  }, [fetchPublicFlashcards]);

  const filteredFlashcards = flashcards
    .filter((fc) => {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        fc.title.toLowerCase().includes(query) ||
        (fc.description && fc.description.toLowerCase().includes(query)) ||
        (fc.sharedBy && fc.sharedBy.toLowerCase().includes(query)) ||
        (fc.tags && fc.tags.some((tag) => tag.toLowerCase().includes(query)));

      if (!matchesSearch) return false;

      if (activeFilter === "recent") {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        return new Date(fc.createdAt) > oneWeekAgo;
      }

      return true;
    })
    .sort((a, b) => {
      if (activeFilter === "popular") {
        // Since we don't have a view count yet, let's sort by total cards as a proxy for complexity/value
        return b.totalCards - a.totalCards;
      }
      // Default to newest first
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return "Unknown date";
    }
  };

  return (
    <div className="flex flex-col items-center min-h-[60vh] relative">
      <div className="w-full max-w-2xl px-4 flex flex-col gap-6">
        {/* Title Section */}
        <div className="text-center">
          <h1 className="text-5xl font-black text-gray-900 tracking-tight mb-3">
            Public Library
          </h1>
          <div className="flex gap-1 justify-center mb-2">
            <p className="w-5 h-5 bg-red-500 border-2 border-gray-800 rounded-full"></p>
            <p className="w-5 h-5 bg-yellow-400 rounded-full border-2 border-gray-800"></p>
            <p className="w-5 h-5 bg-green-500 rounded-full border-2 border-gray-800"></p>
          </div>
          <p className="text-lg font-medium text-gray-700">
            Discover and study flashcards created by the community.
          </p>
        </div>

        {/* Search Bar & Create Button */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <div className="flex-1 flex items-center bg-white border-3 border-gray-900 rounded-full shadow-[4px_4px_0px_0px_rgba(31,41,55,1)]">
              <span className="material-icons-outlined text-gray-900 text-xl pl-4">
                search
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search flashcards..."
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
                    : "bg-transparent text-gray-900 hover:bg-amber-100"
                }`}
              >
                <span className="material-icons-outlined text-lg">tune</span>
              </button>
            </div>

            <Link
              href="/student/flashcards/create"
              className="flex items-center justify-center w-12 h-12 bg-amber-100 border-3 border-gray-900 rounded-full shadow-[4px_4px_0px_0px_rgba(31,41,55,1)] hover:shadow-[5px_5px_0px_0px_rgba(31,41,55,1)] hover:-translate-y-0.5 active:shadow-[2px_2px_0px_0px_rgba(31,41,55,1)] active:translate-y-0.5 transition-all"
              title="Create Flashcard Set"
            >
              <span className="material-icons-outlined text-gray-900 text-2xl font-bold">
                add
              </span>
            </Link>
          </div>

          {/* Filter Pills - Collapsible with Animation */}
          <div
            className={`flex justify-center overflow-hidden transition-all duration-300 ease-out ${
              showFilters ? "max-h-20 opacity-100" : "max-h-0 opacity-0"
            }`}
          >
            <div className="flex items-center gap-2 bg-white border-3 border-gray-900 rounded-full p-1.5 shadow-[4px_4px_0px_0px_rgba(31,41,55,1)]">
              {filters.map((filter) => (
                <button
                  key={filter.id}
                  type="button"
                  onClick={() => setActiveFilter(filter.id as any)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-bold text-sm transition-all ${
                    activeFilter === filter.id
                      ? "bg-gray-900 text-amber-100"
                      : "bg-amber-100 text-gray-900 hover:bg-amber-100 border-2 border-gray-900"
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
      </div>

      {/* Flashcard Grid */}
      <div className="w-full max-w-6xl px-4 relative mt-8">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="bg-amber-50 border-3 border-gray-900 rounded-2xl shadow-[4px_4px_0px_0px_rgba(17,24,39,1)] overflow-hidden animate-pulse h-[360px] flex flex-col"
              >
                {/* Header with traffic lights */}
                <div className="absolute top-3 left-3 flex gap-1.5 z-30">
                  <div className="w-4 h-4 bg-gray-200 rounded-full border-2 border-gray-900"></div>
                  <div className="w-4 h-4 bg-gray-200 rounded-full border-2 border-gray-900"></div>
                  <div className="w-4 h-4 bg-gray-200 rounded-full border-2 border-gray-900"></div>
                </div>

                {/* Badge Skeleton */}
                <div className="absolute top-3 right-3 z-30">
                  <div className="w-12 h-6 bg-gray-200 border-2 border-gray-900 rounded-lg"></div>
                </div>

                {/* Cover Area */}
                <div className="h-32 w-full border-b-3 border-gray-900 relative bg-amber-50 flex items-center justify-center">
                  <div className="relative w-24 h-32 transform translate-y-2">
                    {/* Far Left Card */}
                    <div className="absolute top-0 left-0 w-full h-full bg-amber-50 border-2 border-gray-900 rounded-xl transform -rotate-[24deg] -translate-x-6 translate-y-3 shadow-sm z-0"></div>

                    {/* Left Card */}
                    <div className="absolute top-0 left-0 w-full h-full bg-amber-50 border-2 border-gray-900 rounded-xl transform -rotate-[12deg] -translate-x-3 translate-y-1 shadow-sm z-10 overflow-hidden">
                      <div className="p-3 space-y-2 opacity-30">
                        <div className="h-1.5 bg-amber-200 rounded w-full"></div>
                        <div className="h-1.5 bg-amber-200 rounded w-2/3"></div>
                      </div>
                    </div>

                    {/* Far Right Card */}
                    <div className="absolute top-0 left-0 w-full h-full bg-amber-50 border-2 border-gray-900 rounded-xl transform rotate-[24deg] translate-x-6 translate-y-3 shadow-sm z-0"></div>

                    {/* Right Card */}
                    <div className="absolute top-0 left-0 w-full h-full bg-amber-50 border-2 border-gray-900 rounded-xl transform rotate-[12deg] translate-x-3 translate-y-1 shadow-sm z-10 overflow-hidden">
                      <div className="p-3 space-y-2 opacity-30">
                        <div className="h-1.5 bg-amber-200 rounded w-3/4"></div>
                        <div className="h-1.5 bg-amber-200 rounded w-full"></div>
                      </div>
                    </div>

                    {/* Center Card */}
                    <div className="absolute top-0 left-0 w-full h-full bg-amber-50 border-2 border-gray-900 rounded-xl transform rotate-0 z-20 flex flex-col items-center justify-center shadow-md">
                      <div className="w-12 h-12 rounded-full border-2 border-gray-900 bg-amber-200 mb-3"></div>
                      <div className="w-16 h-2 bg-amber-200 rounded-full mb-1.5"></div>
                      <div className="w-10 h-2 bg-amber-200 rounded-full"></div>
                    </div>
                  </div>
                </div>

                {/* Content Area */}
                <div className="p-4 flex flex-col flex-1 min-h-0">
                  {/* Title Skeleton */}
                  <div className="h-6 bg-gray-200 rounded-full w-3/4 border-2 border-gray-900 mb-3"></div>

                  {/* Description Skeleton */}
                  <div className="space-y-2 mb-3">
                    <div className="h-3 bg-gray-200 rounded-full w-full border border-gray-900"></div>
                    <div className="h-3 bg-gray-200 rounded-full w-5/6 border border-gray-900"></div>
                    <div className="h-3 bg-gray-200 rounded-full w-4/6 border border-gray-900"></div>
                  </div>

                  {/* User Info Skeleton */}
                  <div className="flex items-center gap-2 mt-auto">
                    <div className="w-10 h-10 rounded-full bg-gray-200 border-2 border-gray-900 shrink-0"></div>
                    <div className="flex flex-col gap-1">
                      <div className="h-3 bg-gray-200 rounded-full w-24 border border-gray-900"></div>
                      <div className="h-2 bg-gray-200 rounded-full w-32 border border-gray-900"></div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredFlashcards.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-amber-100 border-3 border-gray-900 rounded-3xl shadow-[8px_8px_0px_0px_rgba(31,41,55,1)] max-w-2xl mx-auto">
            <div className="w-24 h-24 bg-white rounded-full border-3 border-gray-900 flex items-center justify-center mb-6">
              <span className="material-icons-outlined text-5xl text-gray-400">
                search_off
              </span>
            </div>
            <h3 className="text-2xl font-black text-gray-900 mb-2">
              No Flashcards Found
            </h3>
            <p className="text-gray-600 font-medium max-w-md">
              {searchQuery
                ? "We couldn't find any flashcards matching your search. Try different keywords."
                : "The public library is currently empty. Check back later or create your own!"}
            </p>
            {!searchQuery && (
              <Link
                href="/student/flashcards/create"
                className="mt-6 px-6 py-3 bg-amber-100 text-gray-900 font-bold border-3 border-gray-900 rounded-full shadow-[4px_4px_0px_0px_rgba(31,41,55,1)] hover:shadow-[5px_5px_0px_0px_rgba(31,41,55,1)] hover:-translate-y-0.5 transition-all flex items-center gap-2"
              >
                <span className="material-icons-outlined">add_circle</span>
                Create First Set
              </Link>
            )}
          </div>
        ) : (
          <Masonry
            items={filteredFlashcards.map((flashcard): MasonryItem => {
              return {
                id: flashcard.id,
                height: 360,
                content: (
                  <div className="cursor-pointer h-full group">
                    <TiltedCard
                      altText={flashcard.title}
                      captionText={`${flashcard.totalCards} cards`}
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
                        <div className="bg-amber-50 border-3 border-gray-900 rounded-2xl relative w-full h-full overflow-hidden flex flex-col shadow-[4px_4px_0px_0px_rgba(17,24,39,1)]">
                          {/* Top Bar with Traffic Lights */}
                          <div className="absolute top-3 left-3 flex gap-1.5 z-30">
                            <div className="w-4 h-4 bg-red-500 rounded-full border-2 border-gray-900"></div>
                            <div className="w-4 h-4 bg-yellow-400 rounded-full border-2 border-gray-900"></div>
                            <div className="w-4 h-4 bg-green-500 rounded-full border-2 border-gray-900"></div>
                          </div>

                          <div className="absolute top-3 right-3 z-30">
                            <div className="flex items-center gap-1 px-2 py-1 bg-amber-50 border-2 border-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                              <span className="material-icons-outlined text-black text-xs">
                                style
                              </span>
                              <span className="font-bold text-black text-xs">
                                {flashcard.totalCards}
                              </span>
                            </div>
                          </div>

                          {/* Cover Image or Pattern */}
                          <div className="h-32 w-full border-b-3 border-gray-900 relative bg-amber-50 group-hover:bg-amber-100 transition-colors">
                            {flashcard.coverImageUrl ? (
                              <img
                                src={flashcard.coverImageUrl}
                                alt={flashcard.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center overflow-hidden relative">
                                {/* Decorative background pattern */}
                                <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#111827_1px,transparent_1px)] [background-size:12px_12px]"></div>

                                {/* Circular Card Stack Design */}
                                <div className="relative w-24 h-32 transform translate-y-2 group-hover:scale-105 transition-transform duration-500 ease-out">
                                  {/* Glow effect behind */}
                                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-amber-100/20 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>

                                  {/* Far Left Card */}
                                  <div className="absolute top-0 left-0 w-full h-full bg-amber-50 border-2 border-gray-900 rounded-xl transform -rotate-[24deg] -translate-x-6 translate-y-3 shadow-sm z-0"></div>

                                  {/* Left Card */}
                                  <div className="absolute top-0 left-0 w-full h-full bg-amber-50 border-2 border-gray-900 rounded-xl transform -rotate-[12deg] -translate-x-3 translate-y-1 shadow-sm z-10 overflow-hidden">
                                    <div className="p-3 space-y-2 opacity-30">
                                      <div className="h-1.5 bg-amber-100 rounded w-full"></div>
                                      <div className="h-1.5 bg-amber-100 rounded w-2/3"></div>
                                      <div className="h-1.5 bg-amber-100 rounded w-3/4"></div>
                                    </div>
                                  </div>

                                  {/* Far Right Card */}
                                  <div className="absolute top-0 left-0 w-full h-full bg-amber-50 border-2 border-gray-900 rounded-xl transform rotate-[24deg] translate-x-6 translate-y-3 shadow-sm z-0"></div>

                                  {/* Right Card */}
                                  <div className="absolute top-0 left-0 w-full h-full bg-amber-50 border-2 border-gray-900 rounded-xl transform rotate-[12deg] translate-x-3 translate-y-1 shadow-sm z-10 overflow-hidden">
                                    <div className="p-3 space-y-2 opacity-30">
                                      <div className="h-1.5 bg-amber-100 rounded w-3/4"></div>
                                      <div className="h-1.5 bg-amber-100 rounded w-full"></div>
                                      <div className="h-1.5 bg-amber-100 rounded w-1/2"></div>
                                    </div>
                                  </div>

                                  {/* Center Card */}
                                  <div className="absolute top-0 left-0 w-full h-full bg-amber-50 border-2 border-gray-900 rounded-xl transform rotate-0 z-20 flex flex-col items-center justify-center shadow-md overflow-hidden relative">
                                    {/* Glimmer/Sheen Effect */}
                                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-amber-100/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none z-30"></div>
                                    <div className="absolute -inset-[100%] top-0 block h-[200%] w-[200%] -skew-x-12 bg-gradient-to-r from-transparent via-amber-100/30 to-transparent opacity-0 group-hover:animate-[shine_1s_ease-in-out] z-30"></div>

                                    <div className="w-12 h-12 rounded-full border-2 border-gray-900 bg-amber-100 flex items-center justify-center mb-3 relative z-10">
                                      <span className="material-icons-outlined text-gray-900 text-2xl group-hover:scale-110 transition-transform duration-300">
                                        school
                                      </span>
                                    </div>
                                    <div className="w-16 h-2 bg-amber-100 rounded-full mb-1.5"></div>
                                    <div className="w-10 h-2 bg-amber-100 rounded-full"></div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Content */}
                          <div className="p-4 flex flex-col flex-1 min-h-0">
                            <h3 className="text-lg font-black text-gray-900 leading-tight mb-3 line-clamp-2">
                              {flashcard.title}
                            </h3>
                            {flashcard.description && (
                              <p className="text-sm font-medium text-gray-600 line-clamp-3 font-mono mb-3">
                                {flashcard.description}
                              </p>
                            )}
                            {flashcard.tags && flashcard.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mb-3">
                                {flashcard.tags.map((tag, i) => (
                                  <span
                                    key={i}
                                    className="px-2 py-0.5 bg-amber-200 border border-gray-900 rounded-full text-[10px] font-bold text-gray-900"
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}
                            {flashcard.sharedBy && (
                              <div className="flex items-center gap-2 shrink-0 mt-auto">
                                {flashcard.sharedByPhotoUrl ||
                                (user &&
                                  flashcard.sharedByUserId === user.uid &&
                                  user.picture) ? (
                                  <img
                                    src={
                                      flashcard.sharedByPhotoUrl || user.picture
                                    }
                                    alt={flashcard.sharedBy}
                                    className="w-10 h-10 rounded-full border-2 border-gray-900 object-cover shrink-0"
                                  />
                                ) : (
                                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center border-2 border-gray-900 shrink-0">
                                    <span className="material-icons-outlined text-gray-400 text-lg">
                                      person
                                    </span>
                                  </div>
                                )}
                                <div>
                                  <p className="text-sm font-bold text-gray-700 line-clamp-1">
                                    {flashcard.sharedBy}
                                  </p>
                                  {flashcard.sharedBySchool && (
                                    <p className="text-xs font-medium text-gray-500 line-clamp-1">
                                      {flashcard.sharedBySchool}
                                    </p>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Hover Actions */}
                          <div className="absolute inset-0 bg-gradient-to-t from-amber-100/95 via-amber-50/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-end p-4 pointer-events-none rounded-2xl z-20">
                            <div className="flex gap-2 pointer-events-auto transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                              <PortalTooltip
                                title="View"
                                description="View cards"
                              >
                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setViewModalFlashcard(flashcard);
                                  }}
                                  className="w-10 h-10 bg-amber-100 text-gray-900 border-2 border-black rounded-full shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-amber-100 hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 transition-all flex items-center justify-center"
                                >
                                  <span className="material-icons-outlined text-xl">
                                    visibility
                                  </span>
                                </button>
                              </PortalTooltip>
                              <PortalTooltip
                                title="Study"
                                description="Start learning this set"
                              >
                                <Link
                                  href={`/student/flashcards/${flashcard.id}/study`}
                                  className="w-10 h-10 bg-amber-100 text-gray-900 border-2 border-black rounded-full shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-amber-100 hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 transition-all flex items-center justify-center"
                                >
                                  <span className="material-icons-outlined text-xl">
                                    play_arrow
                                  </span>
                                </Link>
                              </PortalTooltip>
                              <PortalTooltip
                                title="Clone"
                                description="Save to your library"
                              >
                                <Link
                                  href={`/student/flashcards/${flashcard.id}/edit`}
                                  className="w-10 h-10 bg-amber-100 text-gray-900 border-2 border-black rounded-full shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-amber-100 hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 transition-all flex items-center justify-center"
                                >
                                  <span className="material-icons-outlined text-xl">
                                    content_copy
                                  </span>
                                </Link>
                              </PortalTooltip>
                            </div>
                          </div>
                        </div>
                      }
                    />
                  </div>
                ),
              };
            })}
            gap={24}
            animateFrom="bottom"
          />
        )}
      </div>

      <ViewFlashcardModal
        isOpen={!!viewModalFlashcard}
        onClose={() => setViewModalFlashcard(null)}
        flashcard={viewModalFlashcard}
      />
    </div>
  );
}
