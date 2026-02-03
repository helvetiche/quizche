/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import type {
  Question,
  QuestionType,
  QuizSettings,
  GeneratedQuizData,
  DraftResponse,
  QuizResponse,
  ApiErrorResponse,
} from "./types";
import { DEFAULT_SETTINGS } from "./types";
import {
  buildQuestionPayload,
  createQuestion,
  getDuplicateChoicesHelper,
  mapDraftQuestions,
  mapGeneratedQuestions,
  mapQuizQuestions,
} from "./helpers";

export function useComposer() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [idToken, setIdToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [_loadingDraft, setLoadingDraft] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [draftId, setDraftId] = useState<string | undefined>(undefined);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);
  const [settings, setSettings] = useState<QuizSettings>(DEFAULT_SETTINGS);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [questions, setQuestions] = useState<Question[]>([createQuestion()]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<
    Record<string, string>
  >({});
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingDone, setLoadingDone] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFilter, setSearchFilter] = useState<
    "all" | "questions" | "answers"
  >("all");
  const [showExplanations, setShowExplanations] = useState(false);
  const paginationRef = useRef<HTMLDivElement>(null);

  const currentQuestion = questions[currentQuestionIndex];
  const urlDraftId = searchParams.get("draft");
  const urlEditId = searchParams.get("edit");
  const [editMode, setEditMode] = useState(false);
  const [editQuizId, setEditQuizId] = useState<string | null>(null);

  // Initial loading animation (2 seconds)
  useEffect(() => {
    const progressInterval = setInterval(() => {
      setLoadingProgress((prev: number) => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + 2;
      });
    }, 40); // 40ms * 50 steps = 2000ms

    // Show "Done" message after 2 seconds
    const doneTimer = setTimeout(() => {
      setLoadingDone(true);
    }, 2000);

    // Start fade out after showing "Done" for 500ms
    const fadeTimer = setTimeout(() => {
      setFadeOut(true);
    }, 2500);

    // Remove overlay after fade animation completes
    const removeTimer = setTimeout(() => {
      setInitialLoading(false);
    }, 3000);

    return () => {
      clearInterval(progressInterval);
      clearTimeout(doneTimer);
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, []);

  // Auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user !== null) {
        void user.getIdToken().then((token) => {
          setIdToken(token);
        });
      } else {
        router.push("/");
      }
    });
    return () => unsubscribe();
  }, [router]);

  // Load draft from URL parameter
  useEffect(() => {
    const loadDraft = async (): Promise<void> => {
      if (urlDraftId === null || idToken === null) return;

      setLoadingDraft(true);
      try {
        const response = await fetch(`/api/quizzes/drafts/${urlDraftId}`, {
          headers: { Authorization: `Bearer ${idToken}` },
        });

        const data = (await response.json()) as
          | DraftResponse
          | ApiErrorResponse;

        if (!response.ok) {
          const errorData = data as ApiErrorResponse;
          throw new Error(errorData.error ?? "Failed to load draft");
        }

        const draftData = data as DraftResponse;
        const draft = draftData.draft;
        setDraftId(urlDraftId);
        setSettings((prev: QuizSettings) => ({
          ...prev,
          title: draft.title ?? "",
          description: draft.description ?? "",
          duration: draft.duration ?? prev.duration,
          deadline: draft.deadline ?? "",
          shuffleQuestions: draft.shuffleQuestions ?? prev.shuffleQuestions,
          shuffleChoices: draft.shuffleChoices ?? prev.shuffleChoices,
          showResults: draft.showResults ?? prev.showResults,
          allowRetake: draft.allowRetake ?? prev.allowRetake,
          maxAttempts: draft.maxAttempts ?? prev.maxAttempts,
          preventTabSwitch: draft.preventTabSwitch ?? prev.preventTabSwitch,
          maxTabSwitches: draft.maxTabSwitches ?? prev.maxTabSwitches,
          preventCopyPaste: draft.preventCopyPaste ?? prev.preventCopyPaste,
          fullscreenMode: draft.fullscreenMode ?? prev.fullscreenMode,
          webcamProctoring: draft.webcamProctoring ?? prev.webcamProctoring,
          disableRightClick: draft.disableRightClick ?? prev.disableRightClick,
          lockdownBrowser: draft.lockdownBrowser ?? prev.lockdownBrowser,
        }));

        if (draft.questions && draft.questions.length > 0) {
          setQuestions(mapDraftQuestions(draft.questions));
        }
        setCurrentQuestionIndex(0);
        if (draft.updatedAt !== undefined) {
          setLastSaved(new Date(draft.updatedAt));
        }
      } catch (err) {
        console.error("Error loading draft:", err);
        console.error(
          err instanceof Error ? err.message : "Failed to load draft"
        );
      } finally {
        setLoadingDraft(false);
      }
    };

    void loadDraft();
  }, [urlDraftId, idToken]);

  // Load existing quiz for editing
  useEffect(() => {
    const loadQuizForEdit = async (): Promise<void> => {
      if (urlEditId === null || idToken === null || urlDraftId !== null) return;

      setLoadingDraft(true);
      try {
        const response = await fetch(`/api/quizzes/${urlEditId}`, {
          headers: { Authorization: `Bearer ${idToken}` },
        });

        const data = (await response.json()) as QuizResponse | ApiErrorResponse;

        if (!response.ok) {
          const errorData = data as ApiErrorResponse;
          throw new Error(errorData.error ?? "Failed to load quiz");
        }

        const quizData = data as QuizResponse;
        const quiz = quizData.quiz;
        setEditMode(true);
        setEditQuizId(urlEditId);
        setSettings((prev: QuizSettings) => ({
          ...prev,
          title: quiz.title ?? "",
          description: quiz.description ?? "",
          duration: quiz.duration ?? prev.duration,
          deadline: quiz.dueDate ?? "",
          shuffleQuestions: quiz.shuffleQuestions ?? prev.shuffleQuestions,
          shuffleChoices: quiz.shuffleChoices ?? prev.shuffleChoices,
          showResults: quiz.showResults ?? prev.showResults,
          allowRetake: quiz.allowRetake ?? prev.allowRetake,
          maxAttempts: quiz.maxAttempts ?? prev.maxAttempts,
          preventTabSwitch: quiz.antiCheat?.enabled ?? prev.preventTabSwitch,
          maxTabSwitches: quiz.antiCheat?.tabChangeLimit ?? prev.maxTabSwitches,
          preventCopyPaste: quiz.preventCopyPaste ?? prev.preventCopyPaste,
          fullscreenMode: quiz.fullscreenMode ?? prev.fullscreenMode,
          webcamProctoring: quiz.webcamProctoring ?? prev.webcamProctoring,
          disableRightClick: quiz.disableRightClick ?? prev.disableRightClick,
          lockdownBrowser: quiz.lockdownBrowser ?? prev.lockdownBrowser,
        }));

        if (quiz.questions && quiz.questions.length > 0) {
          setQuestions(mapQuizQuestions(quiz.questions));
        }
        setCurrentQuestionIndex(0);
        setLastSaved(
          quiz.updatedAt !== undefined ? new Date(quiz.updatedAt) : null
        );
      } catch (err) {
        console.error("Error loading quiz for edit:", err);
        console.error(
          err instanceof Error ? err.message : "Failed to load quiz"
        );
        router.push("/teacher?tab=quizzes");
      } finally {
        setLoadingDraft(false);
      }
    };

    void loadQuizForEdit();
  }, [urlEditId, idToken, urlDraftId, router]);

  // Cleanup image URLs
  useEffect(() => {
    return () => {
      Object.values(imagePreviewUrls).forEach((url) =>
        URL.revokeObjectURL(url)
      );
    };
  }, [imagePreviewUrls]);

  const handleSettingChange = (
    key: keyof QuizSettings,
    value: QuizSettings[keyof QuizSettings]
  ): void => {
    setSettings((prev: QuizSettings) => ({ ...prev, [key]: value }));
  };

  const handleAIGenerated = (quiz: GeneratedQuizData): void => {
    setSettings((prev: QuizSettings) => ({
      ...prev,
      title: quiz.title,
      description: quiz.description,
    }));
    setQuestions(mapGeneratedQuestions(quiz));
    setCurrentQuestionIndex(0);
    setShowAIModal(false);
  };

  const handleAddQuestion = (type: QuestionType = "multiple_choice"): void => {
    setQuestions([...questions, createQuestion(type)]);
    setCurrentQuestionIndex(questions.length);
    // Scroll pagination to the right after adding
    setTimeout(() => {
      if (paginationRef.current) {
        paginationRef.current.scrollTo({
          left: paginationRef.current.scrollWidth,
          behavior: "smooth",
        });
      }
    }, 50);
  };

  const handleDuplicateQuestion = (): void => {
    if (currentQuestion === null) return;
    const duplicated: Question = {
      ...currentQuestion,
      id: Date.now().toString(),
      choiceExplanations: currentQuestion.choiceExplanations
        ? [...currentQuestion.choiceExplanations]
        : [],
    };
    const newQuestions = [...questions];
    newQuestions.splice(currentQuestionIndex + 1, 0, duplicated);
    setQuestions(newQuestions);
    setCurrentQuestionIndex(currentQuestionIndex + 1);
  };

  const handleRemoveQuestion = (id: string): void => {
    if (questions.length === 1) {
      console.error("You must have at least one question");
      return;
    }
    const questionIndex = questions.findIndex((q) => q.id === id);
    const newQuestions = questions.filter((q) => q.id !== id);
    setQuestions(newQuestions);
    if (currentQuestionIndex >= newQuestions.length) {
      setCurrentQuestionIndex(newQuestions.length - 1);
    } else if (questionIndex < currentQuestionIndex) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleQuestionChange = (
    id: string,
    field: keyof Question,
    value: Question[keyof Question]
  ): void => {
    setQuestions(
      questions.map((q) => {
        if (q.id === id) {
          const updated = { ...q, [field]: value };
          if (field === "type") {
            const newType = value as QuestionType;
            if (newType === "multiple_choice") {
              updated.choices =
                updated.choices.length > 0 ? updated.choices : ["", "", "", ""];
              updated.choiceExplanations =
                updated.choiceExplanations &&
                updated.choiceExplanations.length > 0
                  ? updated.choiceExplanations
                  : updated.choices.map(() => "");
            } else {
              updated.choices = [];
              updated.choiceExplanations = [];
            }
            if (newType === "true_or_false") updated.answer = "";
            // Clear explanation for types that don't support it
            if (
              !["multiple_choice", "identification", "true_or_false"].includes(
                newType
              )
            ) {
              updated.explanation = "";
            }
          }
          return updated;
        }
        return q;
      })
    );
  };

  const handleChoiceChange = (
    questionId: string,
    choiceIndex: number,
    value: string
  ): void => {
    setQuestions(
      questions.map((q) => {
        if (q.id === questionId) {
          const newChoices = [...q.choices];
          newChoices[choiceIndex] = value;
          return { ...q, choices: newChoices };
        }
        return q;
      })
    );
  };

  const handleAddChoice = (questionId: string): void => {
    setQuestions(
      questions.map((q) => {
        if (q.id === questionId) {
          if (q.choices.length >= 6) {
            return q; // Max 6 choices
          }
          return {
            ...q,
            choices: [...q.choices, ""],
            choiceExplanations: [
              ...(q.choiceExplanations ?? ([] as never[])),
              "",
            ],
          };
        }
        return q;
      })
    );
  };

  const handleRemoveChoice = (
    questionId: string,
    choiceIndex: number
  ): void => {
    setQuestions(
      questions.map((q) => {
        if (q.id === questionId) {
          if (q.choices.length <= 2) {
            console.error(
              "Multiple choice questions must have at least 2 choices"
            );
            return q;
          }
          return {
            ...q,
            choices: q.choices.filter(
              (_: string, i: number) => i !== choiceIndex
            ),
            choiceExplanations: (
              q.choiceExplanations ?? ([] as never[])
            ).filter((_: string, i: number) => i !== choiceIndex),
          };
        }
        return q;
      })
    );
  };

  const handleImageSelect = (questionId: string, file: File): void => {
    if (file.type.startsWith("image/") === false) {
      console.error("Please select an image file");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      console.error("Image size must be less than 10MB");
      return;
    }
    const previewUrl = URL.createObjectURL(file);
    setImagePreviewUrls((prev) => ({ ...prev, [questionId]: previewUrl }));
    setQuestions(
      questions.map((q) =>
        q.id === questionId
          ? { ...q, imageFile: file, imagePreview: previewUrl }
          : q
      )
    );
  };

  const handleChoiceExplanationChange = (
    questionId: string,
    choiceIndex: number,
    value: string
  ): void => {
    setQuestions(
      questions.map((q) => {
        if (q.id === questionId) {
          const newExplanations = [
            ...(q.choiceExplanations ?? q.choices.map(() => "")),
          ];
          newExplanations[choiceIndex] = value;
          return { ...q, choiceExplanations: newExplanations };
        }
        return q;
      })
    );
  };

  const handleExplanationChange = (questionId: string, value: string): void => {
    setQuestions(
      questions.map((q) =>
        q.id === questionId ? { ...q, explanation: value } : q
      )
    );
  };

  const handleRemoveImage = (questionId: string): void => {
    const previewUrl = imagePreviewUrls[questionId];
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setImagePreviewUrls((prev) => {
        const newUrls = { ...prev };
        delete newUrls[questionId];
        return newUrls;
      });
    }
    setQuestions(
      questions.map((q) =>
        q.id === questionId
          ? {
              ...q,
              imageFile: undefined,
              imagePreview: undefined,
              imageUrl: undefined,
            }
          : q
      )
    );
  };

  const getDuplicateChoices = (questionId: string): number[] =>
    getDuplicateChoicesHelper(questionId, questions);

  const hasDuplicateChoices = (questionId: string): boolean =>
    getDuplicateChoices(questionId).length > 0;

  const validateForm = (): boolean => {
    if (settings.title.trim().length === 0) {
      console.error("Please enter a quiz title in Settings");
      setShowSettingsModal(true);
      return false;
    }
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (q.question.trim().length === 0) {
        console.error(`Please enter a question for question ${i + 1}`);
        setCurrentQuestionIndex(i);
        return false;
      }
      if (q.type === "multiple_choice") {
        const validChoices = q.choices.filter(
          (c: string) => c.trim().length > 0
        );
        if (validChoices.length < 2) {
          console.error(
            `Question ${i + 1}: Multiple choice questions must have at least 2 choices`
          );
          setCurrentQuestionIndex(i);
          return false;
        }
        if (hasDuplicateChoices(q.id)) {
          console.error(`Question ${i + 1}: Duplicate choices are not allowed`);
          setCurrentQuestionIndex(i);
          return false;
        }
        if (q.answer.trim().length === 0) {
          console.error(`Question ${i + 1}: Please select the correct answer`);
          setCurrentQuestionIndex(i);
          return false;
        }
        if (
          validChoices
            .map((c: string) => c.trim())
            .includes(q.answer.trim()) === false
        ) {
          console.error(
            `Question ${i + 1}: The answer must be one of the choices`
          );
          setCurrentQuestionIndex(i);
          return false;
        }
      } else if (q.type === "true_or_false") {
        if (q.answer !== "true" && q.answer !== "false") {
          console.error(`Question ${i + 1}: Please select True or False`);
          setCurrentQuestionIndex(i);
          return false;
        }
      } else {
        if (q.answer.trim().length === 0) {
          console.error(`Question ${i + 1}: Please enter the answer`);
          setCurrentQuestionIndex(i);
          return false;
        }
      }
    }
    return true;
  };

  const handlePublish = async (): Promise<void> => {
    if (!validateForm()) return;
    if (idToken === null) {
      console.error("Authentication required");
      return;
    }

    setLoading(true);
    try {
      const questionsWithImages = await Promise.all(
        questions.map((q) => buildQuestionPayload(q, idToken))
      );

      const quizData = {
        title: settings.title.trim(),
        description: settings.description.trim(),
        isActive: true,
        timeLimit: settings.duration,
        deadline: settings.deadline || undefined,
        shuffleQuestions: settings.shuffleQuestions,
        shuffleChoices: settings.shuffleChoices,
        showResults: settings.showResults,
        allowRetake: settings.allowRetake,
        maxAttempts: settings.maxAttempts,
        preventTabSwitch: settings.preventTabSwitch,
        maxTabSwitches: settings.maxTabSwitches,
        preventCopyPaste: settings.preventCopyPaste,
        fullscreenMode: settings.fullscreenMode,
        webcamProctoring: settings.webcamProctoring,
        disableRightClick: settings.disableRightClick,
        lockdownBrowser: settings.lockdownBrowser,
        questions: questionsWithImages,
      };

      const { apiPost, apiPut } = await import("@/app/lib/api");

      let response;
      if (editMode && editQuizId !== null) {
        // Update existing quiz
        response = await apiPut(`/api/quizzes/${editQuizId}`, {
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(quizData),
          idToken,
        });
      } else {
        // Create new quiz
        response = await apiPost("/api/quizzes", {
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(quizData),
          idToken,
        });
      }

      const data = (await response.json()) as
        | { error?: string }
        | { id?: string };
      if (!response.ok) {
        const errorData = data as { error?: string };
        throw new Error(
          errorData.error ??
            (editMode ? "Failed to update quiz" : "Failed to create quiz")
        );
      }

      console.error(
        editMode ? "Quiz updated successfully" : "Quiz published successfully"
      );
      router.push("/teacher?tab=quizzes");
    } catch (error) {
      console.error(
        editMode ? "Error updating quiz:" : "Error publishing quiz:",
        error
      );
      console.error(
        error instanceof Error
          ? error.message
          : editMode
            ? "Failed to update quiz"
            : "Failed to publish quiz"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAsDraft = async (): Promise<void> => {
    if (idToken === null) {
      console.error("Authentication required");
      return;
    }

    setSavingDraft(true);
    try {
      const draftData = {
        draftId: draftId,
        title: settings.title.trim(),
        description: settings.description.trim(),
        questions: questions.map((q) => ({
          id: q.id,
          question: q.question.trim(),
          type: q.type,
          choices:
            q.type === "multiple_choice"
              ? q.choices
                  .filter((c: string) => c.trim().length > 0)
                  .map((c: string) => c.trim())
              : [],
          answer: q.answer.trim(),
          imageUrl: q.imageUrl,
          explanation: ["identification", "true_or_false"].includes(q.type)
            ? (q.explanation ?? "").trim()
            : undefined,
          choiceExplanations:
            q.type === "multiple_choice"
              ? (q.choiceExplanations ?? ([] as never[])).map((e: string) =>
                  e.trim()
                )
              : undefined,
        })),
        duration: settings.duration,
        deadline: settings.deadline || undefined,
        shuffleQuestions: settings.shuffleQuestions,
        shuffleChoices: settings.shuffleChoices,
        showResults: settings.showResults,
        allowRetake: settings.allowRetake,
        maxAttempts: settings.maxAttempts,
        preventTabSwitch: settings.preventTabSwitch,
        maxTabSwitches: settings.maxTabSwitches,
        preventCopyPaste: settings.preventCopyPaste,
        fullscreenMode: settings.fullscreenMode,
        webcamProctoring: settings.webcamProctoring,
        disableRightClick: settings.disableRightClick,
        lockdownBrowser: settings.lockdownBrowser,
      };

      const { apiPost } = await import("@/app/lib/api");
      const response = await apiPost("/api/quizzes/drafts", {
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draftData),
        idToken,
      });

      const data = (await response.json()) as { error?: string; id?: string };
      if (!response.ok) {
        const errorData = data as { error?: string };
        throw new Error(errorData.error ?? "Failed to save draft");
      }

      const successData = data as { id?: string };
      if (draftId === undefined && successData.id !== undefined) {
        setDraftId(successData.id);
      }
      setLastSaved(new Date());
      console.error("Draft saved successfully");
    } catch (error) {
      console.error("Error saving draft:", error);
      console.error(
        error instanceof Error ? error.message : "Failed to save draft"
      );
    } finally {
      setSavingDraft(false);
    }
  };

  const formatLastSaved = (): string | null => {
    if (lastSaved === null) return null;
    const now = new Date();
    const diff = Math.floor((now.getTime() - lastSaved.getTime()) / 1000);
    if (diff < 60) return "Saved just now";
    if (diff < 3600) return `Saved ${Math.floor(diff / 60)}m ago`;
    return `Saved at ${lastSaved.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  };

  const duplicateIndices = getDuplicateChoices(currentQuestion.id);

  return {
    loading,
    savingDraft,
    draftId,
    lastSaved,
    showSettingsModal,
    showAIModal,
    settings,
    sidebarCollapsed,
    currentQuestionIndex,
    questions,
    imagePreviewUrls,
    initialLoading,
    loadingProgress,
    loadingDone,
    fadeOut,
    searchQuery,
    searchFilter,
    showExplanations,
    paginationRef,
    currentQuestion,
    editMode,
    idToken,
    duplicateIndices,
    setShowSettingsModal,
    setShowAIModal,
    setSidebarCollapsed,
    setCurrentQuestionIndex,
    setSearchQuery,
    setSearchFilter,
    setShowExplanations,
    handleSettingChange,
    handleAIGenerated,
    handleAddQuestion,
    handleDuplicateQuestion,
    handleRemoveQuestion,
    handleQuestionChange,
    handleChoiceChange,
    handleAddChoice,
    handleRemoveChoice,
    handleImageSelect,
    handleChoiceExplanationChange,
    handleExplanationChange,
    handleRemoveImage,
    handlePublish,
    handleSaveAsDraft,
    formatLastSaved,
    hasDuplicateChoices,
    getDuplicateChoices,
  };
}
