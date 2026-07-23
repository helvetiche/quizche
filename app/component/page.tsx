/* eslint-disable @typescript-eslint/strict-boolean-expressions, @typescript-eslint/no-explicit-any, @typescript-eslint/explicit-function-return-type */
"use client";

import { useState } from "react";
import Link from "next/link";
import TiltedCard from "@/components/TiltedCard";

export default function ComponentShowcasePage() {
  const [activeFilter, setActiveFilter] = useState("all");
  const [searchValue, setSearchValue] = useState("Search demo...");
  const [rating, setHoverRating] = useState(4);

  return (
    <div className="min-h-screen bg-amber-50 text-gray-900 p-6 md:p-12 font-sans selection:bg-amber-300">
      {/* Header */}
      <header className="max-w-7xl mx-auto mb-12 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-amber-100 border-3 border-gray-900 p-8 rounded-3xl shadow-[8px_8px_0px_0px_rgba(31,41,55,1)]">
        <div>
          <div className="flex gap-2 mb-3">
            <div className="w-4 h-4 bg-red-500 rounded-full border-2 border-gray-900" />
            <div className="w-4 h-4 bg-yellow-400 rounded-full border-2 border-gray-900" />
            <div className="w-4 h-4 bg-green-500 rounded-full border-2 border-gray-900" />
          </div>
          <h1 className="text-5xl font-black text-gray-900 tracking-tight mb-2">
            Design System UI Kit
          </h1>
          <p className="text-lg font-medium text-gray-700">
            Showcase grid of all Neo-Brutalist Amber components, controls, badges, and card patterns.
          </p>
        </div>
        <Link
          href="/student"
          className="px-6 py-3 bg-gray-900 text-amber-100 font-black rounded-full border-2 border-gray-900 shadow-[4px_4px_0px_0px_rgba(251,191,36,1)] hover:shadow-[5px_5px_0px_0px_rgba(251,191,36,1)] hover:-translate-y-0.5 transition-all flex items-center gap-2 self-start md:self-auto"
        >
          <span className="material-icons-outlined">arrow_back</span>
          Back to Dashboard
        </Link>
      </header>

      <main className="max-w-7xl mx-auto space-y-16">
        {/* SECTION 1: DESIGN TOKENS & TYPOGRAPHY */}
        <section className="space-y-6">
          <div className="flex items-center gap-3 border-b-3 border-gray-900 pb-3">
            <span className="material-icons-outlined text-3xl font-bold">palette</span>
            <h2 className="text-3xl font-black text-gray-900">1. Color Tokens & Typography</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Color Swatch 1 */}
            <div className="bg-amber-100 border-3 border-gray-900 rounded-2xl p-5 shadow-[4px_4px_0px_0px_rgba(31,41,55,1)]">
              <div className="h-16 bg-amber-100 border-2 border-gray-900 rounded-xl mb-3 flex items-center justify-center font-black">
                amber-100
              </div>
              <p className="font-bold text-sm">Primary Container</p>
              <p className="text-xs text-gray-600 font-mono">#FEF3C7</p>
            </div>

            {/* Color Swatch 2 */}
            <div className="bg-amber-100 border-3 border-gray-900 rounded-2xl p-5 shadow-[4px_4px_0px_0px_rgba(31,41,55,1)]">
              <div className="h-16 bg-amber-50 border-2 border-gray-900 rounded-xl mb-3 flex items-center justify-center font-black">
                amber-50
              </div>
              <p className="font-bold text-sm">Background Surface</p>
              <p className="text-xs text-gray-600 font-mono">#FFFBEB</p>
            </div>

            {/* Color Swatch 3 */}
            <div className="bg-amber-100 border-3 border-gray-900 rounded-2xl p-5 shadow-[4px_4px_0px_0px_rgba(31,41,55,1)]">
              <div className="h-16 bg-amber-200 border-2 border-gray-900 rounded-xl mb-3 flex items-center justify-center font-black">
                amber-200
              </div>
              <p className="font-bold text-sm">Accent Highlight</p>
              <p className="text-xs text-gray-600 font-mono">#FDE68A</p>
            </div>

            {/* Color Swatch 4 */}
            <div className="bg-amber-100 border-3 border-gray-900 rounded-2xl p-5 shadow-[4px_4px_0px_0px_rgba(31,41,55,1)]">
              <div className="h-16 bg-gray-900 text-amber-100 border-2 border-gray-900 rounded-xl mb-3 flex items-center justify-center font-black">
                gray-900
              </div>
              <p className="font-bold text-sm">Dark Contrast</p>
              <p className="text-xs text-gray-600 font-mono">#111827</p>
            </div>
          </div>
        </section>

        {/* SECTION 2: BUTTONS & INTERACTIVE CONTROLS */}
        <section className="space-y-6">
          <div className="flex items-center gap-3 border-b-3 border-gray-900 pb-3">
            <span className="material-icons-outlined text-3xl font-bold">touch_app</span>
            <h2 className="text-3xl font-black text-gray-900">2. Buttons & Actions</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Primary Amber Button */}
            <div className="bg-amber-50 border-3 border-gray-900 rounded-3xl p-6 shadow-[4px_4px_0px_0px_rgba(31,41,55,1)] space-y-3">
              <h3 className="font-bold text-sm text-gray-700">Primary Amber Pill</h3>
              <button className="px-6 py-3 bg-amber-100 text-gray-900 font-black border-3 border-gray-900 rounded-full shadow-[4px_4px_0px_0px_rgba(31,41,55,1)] hover:shadow-[5px_5px_0px_0px_rgba(31,41,55,1)] hover:-translate-y-0.5 transition-all flex items-center gap-2">
                <span className="material-icons-outlined">add</span>
                Create Action
              </button>
            </div>

            {/* Dark Action Button */}
            <div className="bg-amber-50 border-3 border-gray-900 rounded-3xl p-6 shadow-[4px_4px_0px_0px_rgba(31,41,55,1)] space-y-3">
              <h3 className="font-bold text-sm text-gray-700">Dark Action Pill</h3>
              <button className="px-6 py-3 bg-gray-900 text-amber-100 font-extrabold border-2 border-gray-900 rounded-full shadow-[3px_3px_0px_0px_rgba(251,191,36,1)] hover:bg-gray-800 hover:-translate-y-0.5 transition-all flex items-center gap-2">
                <span className="material-icons-outlined">play_arrow</span>
                Start Quiz
              </button>
            </div>

            {/* Icon Button */}
            <div className="bg-amber-50 border-3 border-gray-900 rounded-3xl p-6 shadow-[4px_4px_0px_0px_rgba(31,41,55,1)] space-y-3">
              <h3 className="font-bold text-sm text-gray-700">Circular Icon Action</h3>
              <div className="flex gap-3">
                <button className="w-12 h-12 bg-amber-100 text-gray-900 border-3 border-gray-900 rounded-full shadow-[4px_4px_0px_0px_rgba(31,41,55,1)] hover:-translate-y-0.5 transition-all flex items-center justify-center">
                  <span className="material-icons-outlined">visibility</span>
                </button>
                <button className="w-12 h-12 bg-amber-200 text-gray-900 border-3 border-gray-900 rounded-full shadow-[4px_4px_0px_0px_rgba(31,41,55,1)] hover:-translate-y-0.5 transition-all flex items-center justify-center">
                  <span className="material-icons-outlined">share</span>
                </button>
                <button className="w-12 h-12 bg-gray-900 text-amber-100 border-3 border-gray-900 rounded-full shadow-[4px_4px_0px_0px_rgba(31,41,55,1)] hover:-translate-y-0.5 transition-all flex items-center justify-center">
                  <span className="material-icons-outlined">edit</span>
                </button>
              </div>
            </div>

            {/* Filter Toggle Pills */}
            <div className="bg-amber-50 border-3 border-gray-900 rounded-3xl p-6 shadow-[4px_4px_0px_0px_rgba(31,41,55,1)] space-y-3 col-span-1 md:col-span-2">
              <h3 className="font-bold text-sm text-gray-700">Filter Pill Toggle Group</h3>
              <div className="inline-flex items-center gap-2 bg-white border-3 border-gray-900 rounded-full p-1.5 shadow-[4px_4px_0px_0px_rgba(31,41,55,1)]">
                {["all", "recent", "popular"].map((f) => (
                  <button
                    key={f}
                    onClick={() => setActiveFilter(f)}
                    className={`px-4 py-1.5 rounded-full font-bold text-sm transition-all capitalize ${
                      activeFilter === f
                        ? "bg-gray-900 text-amber-100"
                        : "bg-amber-100 text-gray-900 border-2 border-gray-900 hover:bg-amber-200"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 3: BADGES & PILLS */}
        <section className="space-y-6">
          <div className="flex items-center gap-3 border-b-3 border-gray-900 pb-3">
            <span className="material-icons-outlined text-3xl font-bold">verified</span>
            <h2 className="text-3xl font-black text-gray-900">3. Badges, Tags & Indicators</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Traffic Lights */}
            <div className="bg-amber-50 border-3 border-gray-900 rounded-3xl p-6 shadow-[4px_4px_0px_0px_rgba(31,41,55,1)] space-y-3">
              <h3 className="font-bold text-sm text-gray-700">macOS Traffic Lights</h3>
              <div className="flex gap-2 p-3 bg-amber-100 border-2 border-gray-900 rounded-xl">
                <div className="w-4 h-4 bg-red-500 rounded-full border-2 border-gray-900" />
                <div className="w-4 h-4 bg-yellow-400 rounded-full border-2 border-gray-900" />
                <div className="w-4 h-4 bg-green-500 rounded-full border-2 border-gray-900" />
              </div>
            </div>

            {/* Status Badges */}
            <div className="bg-amber-50 border-3 border-gray-900 rounded-3xl p-6 shadow-[4px_4px_0px_0px_rgba(31,41,55,1)] space-y-3">
              <h3 className="font-bold text-sm text-gray-700">Status Pills</h3>
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 bg-green-400 text-gray-900 font-black text-xs border-2 border-gray-900 rounded-full shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                  95.0% Excellent
                </span>
                <span className="px-3 py-1 bg-amber-200 text-gray-900 font-extrabold text-xs border-2 border-gray-900 rounded-full shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                  Shared
                </span>
                <span className="px-3 py-1 bg-red-400 text-gray-900 font-black text-xs border-2 border-gray-900 rounded-full shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                  Flagged
                </span>
              </div>
            </div>

            {/* Tag Pills */}
            <div className="bg-amber-50 border-3 border-gray-900 rounded-3xl p-6 shadow-[4px_4px_0px_0px_rgba(31,41,55,1)] space-y-3">
              <h3 className="font-bold text-sm text-gray-700">Tag Pills</h3>
              <div className="flex flex-wrap gap-1.5">
                <span className="px-2.5 py-1 bg-amber-200 border border-gray-900 rounded-full text-xs font-bold text-gray-900">
                  #Mathematics
                </span>
                <span className="px-2.5 py-1 bg-amber-200 border border-gray-900 rounded-full text-xs font-bold text-gray-900">
                  #Science
                </span>
                <span className="px-2.5 py-1 bg-amber-200 border border-gray-900 rounded-full text-xs font-bold text-gray-900">
                  #History
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 4: CARDS & CONTAINERS */}
        <section className="space-y-6">
          <div className="flex items-center gap-3 border-b-3 border-gray-900 pb-3">
            <span className="material-icons-outlined text-3xl font-bold">dashboard</span>
            <h2 className="text-3xl font-black text-gray-900">4. Cards & Containers</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Tilted Flashcard Card */}
            <div className="space-y-2">
              <h3 className="font-bold text-sm text-gray-700">Interactive TiltedCard</h3>
              <div className="h-[340px] group cursor-pointer">
                <TiltedCard
                  altText="Demo Flashcard Set"
                  captionText="12 cards"
                  containerHeight="100%"
                  containerWidth="100%"
                  imageHeight="100%"
                  imageWidth="100%"
                  scaleOnHover={1.05}
                  rotateAmplitude={12}
                  showMobileWarning={false}
                  showTooltip={false}
                  displayOverlayContent={true}
                  overlayContent={
                    <div className="bg-amber-50 border-3 border-gray-900 rounded-2xl relative w-full h-full overflow-hidden flex flex-col p-4 shadow-[4px_4px_0px_0px_rgba(17,24,39,1)]">
                      <div className="flex justify-between items-center mb-3">
                        <div className="flex gap-1.5">
                          <div className="w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-gray-900" />
                          <div className="w-3.5 h-3.5 bg-yellow-400 rounded-full border-2 border-gray-900" />
                          <div className="w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-gray-900" />
                        </div>
                        <span className="px-2.5 py-0.5 bg-amber-200 border-2 border-gray-900 rounded-full text-xs font-bold">
                          12 Cards
                        </span>
                      </div>
                      <h4 className="text-xl font-black text-gray-900 mb-1">
                        Biology Essentials
                      </h4>
                      <p className="text-xs font-mono text-gray-600 mb-4 line-clamp-2">
                        Key definitions and mechanisms of cellular biology.
                      </p>
                      <button className="mt-auto py-2 px-4 bg-gray-900 text-amber-100 font-bold text-xs rounded-full border-2 border-gray-900 flex items-center justify-center gap-1">
                        <span className="material-icons-outlined text-sm">play_arrow</span>
                        Study Now
                      </button>
                    </div>
                  }
                />
              </div>
            </div>

            {/* Stats Summary Card */}
            <div className="space-y-2">
              <h3 className="font-bold text-sm text-gray-700">Stats Summary Card</h3>
              <div className="bg-amber-100 border-3 border-gray-900 rounded-3xl p-6 shadow-[6px_6px_0px_0px_rgba(31,41,55,1)] flex items-center justify-between">
                <div>
                  <p className="text-xs font-black uppercase text-gray-700 tracking-wider mb-1">
                    Quizzes Completed
                  </p>
                  <p className="text-5xl font-black text-gray-900">24</p>
                </div>
                <div className="w-14 h-14 rounded-2xl bg-amber-200 border-3 border-gray-900 flex items-center justify-center shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                  <span className="material-icons-outlined text-3xl text-gray-900">
                    emoji_events
                  </span>
                </div>
              </div>
            </div>

            {/* Attempt History Card */}
            <div className="space-y-2">
              <h3 className="font-bold text-sm text-gray-700">Quiz History Item Card</h3>
              <div className="bg-amber-50 border-3 border-gray-900 rounded-3xl p-5 shadow-[4px_4px_0px_0px_rgba(31,41,55,1)] space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-black text-lg text-gray-900">Midterm Physics</h4>
                    <p className="text-xs font-bold text-gray-600">Completed yesterday</p>
                  </div>
                  <span className="px-3 py-1 bg-green-400 text-gray-900 font-black text-xs border-2 border-gray-900 rounded-full">
                    90.0%
                  </span>
                </div>
                <div className="w-full bg-amber-100 border-2 border-gray-900 rounded-full h-3 overflow-hidden p-0.5">
                  <div className="h-full bg-green-500 rounded-full w-[90%]" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 5: INPUTS & SEARCH */}
        <section className="space-y-6">
          <div className="flex items-center gap-3 border-b-3 border-gray-900 pb-3">
            <span className="material-icons-outlined text-3xl font-bold">search</span>
            <h2 className="text-3xl font-black text-gray-900">5. Form Controls & Inputs</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Search Bar */}
            <div className="bg-amber-50 border-3 border-gray-900 rounded-3xl p-6 shadow-[4px_4px_0px_0px_rgba(31,41,55,1)] space-y-3">
              <h3 className="font-bold text-sm text-gray-700">Neo-Brutalist Search Bar</h3>
              <div className="flex items-center bg-white border-3 border-gray-900 rounded-full shadow-[4px_4px_0px_0px_rgba(31,41,55,1)] p-1">
                <span className="material-icons-outlined text-gray-900 text-xl pl-3">
                  search
                </span>
                <input
                  type="text"
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  className="flex-1 px-3 py-2 bg-transparent text-gray-900 font-medium focus:outline-none"
                />
                <button className="mr-1 w-9 h-9 bg-gray-900 text-amber-100 rounded-full flex items-center justify-center">
                  <span className="material-icons-outlined text-lg">tune</span>
                </button>
              </div>
            </div>

            {/* Interactive Rating Bar */}
            <div className="bg-amber-50 border-3 border-gray-900 rounded-3xl p-6 shadow-[4px_4px_0px_0px_rgba(31,41,55,1)] space-y-3">
              <h3 className="font-bold text-sm text-gray-700">Interactive Rating Stars</h3>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setHoverRating(star)}
                    className="focus:outline-none transition-transform hover:scale-110"
                  >
                    <span
                      style={{ WebkitTextStroke: "1px #1f2937" }}
                      className={`material-icons text-3xl ${
                        star <= rating ? "text-amber-400" : "text-gray-300"
                      }`}
                    >
                      star
                    </span>
                  </button>
                ))}
                <span className="ml-3 text-lg font-black text-gray-900">
                  {rating}.0 / 5.0
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 6: FEEDBACK & EMPTY STATES */}
        <section className="space-y-6">
          <div className="flex items-center gap-3 border-b-3 border-gray-900 pb-3">
            <span className="material-icons-outlined text-3xl font-bold">inbox</span>
            <h2 className="text-3xl font-black text-gray-900">6. Empty States & Skeletons</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Empty State Box */}
            <div className="flex flex-col items-center justify-center p-8 text-center bg-amber-100 border-3 border-gray-900 rounded-3xl shadow-[6px_6px_0px_0px_rgba(31,41,55,1)]">
              <div className="w-16 h-16 bg-white rounded-full border-3 border-gray-900 flex items-center justify-center mb-4 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                <span className="material-icons-outlined text-3xl text-gray-400">
                  search_off
                </span>
              </div>
              <h3 className="text-xl font-black text-gray-900 mb-1">No Items Found</h3>
              <p className="text-sm font-medium text-gray-700 max-w-xs mb-4">
                We couldn&apos;t find any components matching your filter.
              </p>
              <button className="px-5 py-2 bg-amber-200 text-gray-900 font-bold border-2 border-gray-900 rounded-full shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                Reset Filter
              </button>
            </div>

            {/* Skeleton Pulse Container */}
            <div className="bg-amber-50 border-3 border-gray-900 rounded-3xl p-6 shadow-[6px_6px_0px_0px_rgba(31,41,55,1)] animate-pulse space-y-4">
              <div className="flex justify-between">
                <div className="w-1/2 h-6 bg-gray-300 rounded-full border border-gray-900" />
                <div className="w-16 h-6 bg-gray-300 rounded-full border border-gray-900" />
              </div>
              <div className="w-full h-4 bg-gray-300 rounded-full border border-gray-900" />
              <div className="w-2/3 h-4 bg-gray-300 rounded-full border border-gray-900" />
              <div className="w-full h-10 bg-gray-300 rounded-full border-2 border-gray-900 mt-4" />
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto mt-16 pt-8 border-t-3 border-gray-900 text-center font-bold text-sm text-gray-600">
        Quizche Neo-Brutalist Amber Component System — Built with React & Tailwind CSS
      </footer>
    </div>
  );
}
