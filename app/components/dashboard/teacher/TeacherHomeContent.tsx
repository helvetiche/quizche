"use client";

import { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useTabContext } from "../TabContext";
import TiltedCard from "@/components/TiltedCard";
import Masonry, { MasonryItem } from "@/components/Masonry";

interface DeleteModalProps {
  isOpen: boolean;
  quizTitle: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting: boolean;
}

function DeleteConfirmModal({ isOpen, quizTitle, onConfirm, onCancel, isDeleting }: DeleteModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
      <div className="relative bg-amber-100 border-4 border-gray-900 rounded-2xl shadow-[8px_8px_0px_0px_rgba(31,41,55,1)] p-6 max-w-md w-full mx-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center border-3 border-gray-900">
            <span className="material-icons-outlined text-white text-2xl">delete</span>
          </div>
          <h3 className="text-xl font-black text-gray-900">Delete Quiz?</h3>
        </div>
        <p className="text-gray-700 font-medium mb-6">
          Are you sure you want to delete <span className="font-bold text-gray-900">&quot;{quizTitle}&quot;</span>? This action cannot be undone.
        </p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="px-5 py-2.5 bg-amber-200 text-gray-900 font-bold border-3 border-gray-900 rounded-full shadow-[3px_3px_0px_0px_rgba(31,41,55,1)] hover:shadow-[4px_4px_0px_0px_rgba(31,41,55,1)] active:shadow-[1px_1px_0px_0px_rgba(31,41,55,1)] transition-all disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-5 py-2.5 bg-red-500 text-white font-bold border-3 border-gray-900 rounded-full shadow-[3px_3px_0px_0px_rgba(31,41,55,1)] hover:shadow-[4px_4px_0px_0px_rgba(31,41,55,1)] active:shadow-[1px_1px_0px_0px_rgba(31,41,55,1)] transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {isDeleting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Deleting...</span>
              </>
            ) : (
              <>
                <span className="material-icons-outlined text-lg">delete</span>
                <span>Delete</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

interface Quiz {
  id: string;
  title: string;
  description: string;
  totalQuestions: number;
  isActive: boolean;
  createdAt: string;
  deadline?: string;
  duration?: number | null;
}

interface TeacherHomeContentProps {
  userEmail?: string;
}

export default function TeacherHomeContent({ userEmail }: TeacherHomeContentProps) {
  const { setActiveTab } = useTabContext();
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [idToken, setIdToken] = useState<string | null>(null);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; quizId: string; quizTitle: string }>({
    isOpen: false,
    quizId: "",
    quizTitle: "",
  });
  const [isDeleting, setIsDeleting] = useState(false);
  const itemsPerPage = 6;
  
  // Suppress unused variable warning
  void userEmail;

  const filters = [
    { id: "all", label: "All", icon: "apps" },
    { id: "active", label: "Active", icon: "play_circle" },
    { id: "inactive", label: "Inactive", icon: "pause_circle" },
    { id: "recent", label: "Recent", icon: "schedule" },
  ];

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        try {
          const token = await currentUser.getIdToken();
          setIdToken(token);
        } catch (error) {
          console.error("Error getting token:", error);
        }
      } else {
        setIdToken(null);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchQuizzes = async () => {
      if (!idToken) return;

      try {
        setLoading(true);
        const response = await fetch("/api/quizzes", {
          headers: { Authorization: `Bearer ${idToken}` },
        });

        const data = await response.json();

        if (response.ok) {
          setQuizzes(data.quizzes || []);
        }
      } catch (err) {
        console.error("Error fetching quizzes:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchQuizzes();
  }, [idToken]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Searching for:", searchQuery, "Filter:", activeFilter);
  };

  // Filter quizzes based on search and filter
  const filteredQuizzes = quizzes.filter((quiz) => {
    const matchesSearch = quiz.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      quiz.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (activeFilter === "all") return matchesSearch;
    if (activeFilter === "active") return matchesSearch && quiz.isActive;
    if (activeFilter === "inactive") return matchesSearch && !quiz.isActive;
    if (activeFilter === "recent") {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      return matchesSearch && new Date(quiz.createdAt) > oneWeekAgo;
    }
    return matchesSearch;
  });

  // Pagination
  const totalPages = Math.ceil(filteredQuizzes.length / itemsPerPage);
  const paginatedQuizzes = filteredQuizzes.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeFilter]);

  const handleViewQuiz = (quizId: string) => {
    window.location.href = `/teacher/quiz/${quizId}`;
  };

  const handleEditQuiz = (quizId: string) => {
    window.location.href = `/teacher/composer?edit=${quizId}`;
  };

  const handleDeleteClick = (quizId: string, quizTitle: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteModal({ isOpen: true, quizId, quizTitle });
  };

  const handleDeleteConfirm = async () => {
    if (!idToken || !deleteModal.quizId) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/quizzes/${deleteModal.quizId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${idToken}` },
      });

      if (response.ok) {
        setQuizzes((prev) => prev.filter((q) => q.id !== deleteModal.quizId));
        setDeleteModal({ isOpen: false, quizId: "", quizTitle: "" });
      } else {
        console.error("Failed to delete quiz");
      }
    } catch (error) {
      console.error("Error deleting quiz:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteModal({ isOpen: false, quizId: "", quizTitle: "" });
  };

  // Calculate deadline progress (returns percentage of time remaining)
  const getDeadlineProgress = (createdAt: string, deadline?: string) => {
    const now = new Date();
    const created = new Date(createdAt);
    
    // If no deadline, simulate one (7 days from creation)
    const deadlineDate = deadline ? new Date(deadline) : new Date(created.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    const totalDuration = deadlineDate.getTime() - created.getTime();
    const elapsed = now.getTime() - created.getTime();
    const remaining = Math.max(0, 100 - (elapsed / totalDuration) * 100);
    
    return Math.min(100, Math.max(0, remaining));
  };

  // Get time remaining text
  const getTimeRemainingText = (createdAt: string, deadline?: string) => {
    const now = new Date();
    const created = new Date(createdAt);
    const deadlineDate = deadline ? new Date(deadline) : new Date(created.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    const diff = deadlineDate.getTime() - now.getTime();
    
    if (diff <= 0) return "Expired";
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) return `${days}d ${hours}h left`;
    if (hours > 0) return `${hours}h left`;
    return "< 1h left";
  };

  return (
    <div className="flex flex-col items-center min-h-[60vh] relative">
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
            Search for quizzes, create new assessments, or manage your sections. Your classroom tools are just a search away.
          </p>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearch}>
          <div className="flex items-center bg-amber-100 border-3 border-gray-900 rounded-full shadow-[4px_4px_0px_0px_rgba(31,41,55,1)]">
            <span className="material-icons-outlined text-gray-900 text-xl pl-4">search</span>
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
                <span className="material-icons-outlined text-gray-500 hover:text-gray-900 transition-colors text-xl">close</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={`mr-2 w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
                showFilters ? "bg-gray-900 text-amber-100" : "bg-transparent text-gray-900 hover:bg-amber-200"
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
                <span className="material-icons-outlined text-base">{filter.icon}</span>
                <span>{filter.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Quiz Cards - Wider container */}
      <div className="w-full max-w-6xl px-4 mt-6 relative">
        {/* Vertical Pagination - Left Side of Cards */}
        {!loading && filteredQuizzes.length > 0 && (
          <div className="absolute -left-16 top-0 flex flex-col gap-2">
            {/* Up Button */}
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
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
            {Array.from({ length: Math.max(1, totalPages) }, (_, i) => i + 1).map((page) => (
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

            {/* Down Button */}
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
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
        )}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[...Array(6)].map((_, i) => (
              <div 
                key={i} 
                className="bg-amber-100 border-3 border-gray-900 rounded-2xl shadow-[4px_4px_0px_0px_rgba(17,24,39,1)] overflow-hidden animate-pulse"
                style={{ height: '220px' }}
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
        ) : filteredQuizzes.length === 0 ? (
          <div className="text-center py-8">
            <p className="font-bold text-gray-700">
              {searchQuery ? "No quizzes found matching your search." : "No quizzes yet. Create your first quiz!"}
            </p>
            <button
              onClick={() => setActiveTab("quizzes")}
              className="mt-4 px-6 py-3 bg-gray-900 text-amber-100 font-bold border-3 border-gray-900 rounded-full shadow-[4px_4px_0px_0px_rgba(31,41,55,1)] hover:shadow-[5px_5px_0px_0px_rgba(31,41,55,1)] transition-all"
            >
              + Create Quiz
            </button>
          </div>
        ) : (
          <>
            <Masonry
              items={paginatedQuizzes.map((quiz): MasonryItem => {
              const hasDescription = quiz.description && quiz.description.length > 0;
              const deadlineProgress = getDeadlineProgress(quiz.createdAt, quiz.deadline);
              const timeRemaining = getTimeRemainingText(quiz.createdAt, quiz.deadline);
              
              // Progress bar color based on time remaining
              const progressBarColor = deadlineProgress > 50 ? "bg-green-500" : deadlineProgress > 20 ? "bg-yellow-500" : "bg-red-500";
              
              return {
                id: quiz.id,
                height: hasDescription ? 240 : 200,
                content: (
                  <div 
                    onClick={() => setActiveTab("quizzes")}
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
                              <span className="material-icons-outlined text-black text-xs">schedule</span>
                              <span className="font-bold text-black text-xs">{quiz.duration ? `${quiz.duration}m` : "∞"}</span>
                            </div>
                            <div className="flex items-center gap-1 px-2 py-0.5 bg-amber-200 border-2 border-black rounded-full">
                              <span className="material-icons-outlined text-black text-xs">help_outline</span>
                              <span className="font-bold text-black text-xs">{quiz.totalQuestions}</span>
                            </div>
                          </div>
                          {/* Separator Line */}
                          <div className="absolute top-11 left-0 right-0 h-0.5 bg-black z-10"></div>
                          
                          {/* Content */}
                          <div className="pt-14 px-4 pb-2 text-left flex-1">
                            <h3 className="text-base font-black text-gray-900 mb-1">{quiz.title}</h3>
                            {quiz.description && (
                              <p className="text-sm font-medium text-gray-700 line-clamp-2" style={{ fontFamily: "'Google Sans Mono', monospace" }}>{quiz.description}</p>
                            )}
                          </div>
                          
                          {/* Deadline Progress Bar */}
                          <div className="px-4 pb-3">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-bold text-gray-600">Deadline</span>
                              <span className="text-xs font-bold text-gray-900">{timeRemaining}</span>
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
                                  handleViewQuiz(quiz.id);
                                }}
                                title="View"
                              >
                                <span className="material-icons-outlined text-black text-lg">visibility</span>
                              </button>
                              {/* Edit Button */}
                              <button 
                                className="w-11 h-11 bg-amber-100 border-3 border-black rounded-full flex items-center justify-center shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 transition-all"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditQuiz(quiz.id);
                                }}
                                title="Edit"
                              >
                                <span className="material-icons-outlined text-black text-lg">edit</span>
                              </button>
                              {/* Delete Button */}
                              <button 
                                className="w-11 h-11 bg-amber-100 border-3 border-black rounded-full flex items-center justify-center shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 transition-all"
                                onClick={(e) => handleDeleteClick(quiz.id, quiz.title, e)}
                                title="Delete"
                              >
                                <span className="material-icons-outlined text-black text-lg">delete</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      }
                    />
                  </div>
                )
              };
            })}
            animateFrom="bottom"
            stagger={0.08}
            blurToFocus={true}
            gap={32}
            animationKey={currentPage}
          />
          
{/* Vertical Pagination - Left Side */}
          {filteredQuizzes.length > 0 && totalPages > 1 && (
            <div className="flex flex-col items-center gap-2 mt-8 xl:hidden">
              <div className="flex items-center gap-2">
                {/* Previous Button */}
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
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

                {/* Next Button */}
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
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
          )}
          </>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteModal.isOpen}
        quizTitle={deleteModal.quizTitle}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
        isDeleting={isDeleting}
      />
    </div>
  );
}
