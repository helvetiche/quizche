/* eslint-disable @typescript-eslint/prefer-optional-chain */

/* eslint-disable @typescript-eslint/strict-boolean-expressions, @typescript-eslint/no-unnecessary-condition */
"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { uploadImageToImgbb } from "@/lib/imgbb";
import Image from "next/image";
import PDFUploadModal from "@/app/components/create/PDFUploadModal";
import Modal from "@/components/Modal";

// ============================================================================
// TYPES
// ============================================================================
type QuestionType =
  | "multiple_choice"
  | "identification"
  | "true_or_false"
  | "essay"
  | "enumeration"
  | "reflection";

type Question = {
  id: string;
  question: string;
  type: QuestionType;
  choices: string[];
  answer: string;
  imageUrl?: string;
  imageFile?: File;
  imagePreview?: string;
  // Explanation fields
  explanation?: string;
  choiceExplanations?: string[];
};

type QuizSettings = {
  title: string;
  description: string;
  duration: number | null;
  deadline: string;
  shuffleQuestions: boolean;
  shuffleChoices: boolean;
  showResults: boolean;
  allowRetake: boolean;
  maxAttempts: number;
  preventTabSwitch: boolean;
  maxTabSwitches: number;
  preventCopyPaste: boolean;
  fullscreenMode: boolean;
  webcamProctoring: boolean;
  disableRightClick: boolean;
  lockdownBrowser: boolean;
};

type GeneratedQuizData = {
  title: string;
  description: string;
  questions: {
    question: string;
    type: QuestionType;
    choices?: string[];
    answer: string;
    explanation?: string;
    choiceExplanations?: string[];
  }[];
};

// ============================================================================
// CONSTANTS
// ============================================================================
const QUESTION_TYPES: {
  value: QuestionType;
  label: string;
  icon: string;
  description: string;
}[] = [
  {
    value: "multiple_choice",
    label: "Multiple Choice",
    icon: "radio_button_checked",
    description: "Select one correct answer from several options",
  },
  {
    value: "identification",
    label: "Identification",
    icon: "text_fields",
    description: "Type the exact answer to the question",
  },
  {
    value: "true_or_false",
    label: "True / False",
    icon: "toggle_on",
    description: "Determine if the statement is correct",
  },
  {
    value: "essay",
    label: "Essay",
    icon: "article",
    description: "Write a detailed response to the prompt",
  },
  {
    value: "enumeration",
    label: "Enumeration",
    icon: "format_list_numbered",
    description: "List multiple items that answer the question",
  },
  {
    value: "reflection",
    label: "Reflection",
    icon: "psychology",
    description: "Share personal thoughts and insights on topic",
  },
];

const DEFAULT_SETTINGS: QuizSettings = {
  title: "",
  description: "",
  duration: 30,
  deadline: "",
  shuffleQuestions: false,
  shuffleChoices: false,
  showResults: true,
  allowRetake: false,
  maxAttempts: 1,
  preventTabSwitch: true,
  maxTabSwitches: 3,
  preventCopyPaste: true,
  fullscreenMode: false,
  webcamProctoring: false,
  disableRightClick: true,
  lockdownBrowser: false,
};

// ============================================================================
// API RESPONSE TYPES
// ============================================================================
type DraftResponse = {
  draft: {
    title?: string;
    description?: string;
    duration?: number | null;
    deadline?: string;
    shuffleQuestions?: boolean;
    shuffleChoices?: boolean;
    showResults?: boolean;
    allowRetake?: boolean;
    maxAttempts?: number;
    preventTabSwitch?: boolean;
    maxTabSwitches?: number;
    preventCopyPaste?: boolean;
    fullscreenMode?: boolean;
    webcamProctoring?: boolean;
    disableRightClick?: boolean;
    lockdownBrowser?: boolean;
    questions?: {
      id?: string;
      question?: string;
      type?: QuestionType;
      choices?: string[];
      answer?: string;
      imageUrl?: string;
      explanation?: string;
      choiceExplanations?: string[];
    }[];
    updatedAt?: string | Date;
  };
};

type QuizResponse = {
  quiz: {
    title?: string;
    description?: string;
    duration?: number | null;
    dueDate?: string;
    shuffleQuestions?: boolean;
    shuffleChoices?: boolean;
    showResults?: boolean;
    allowRetake?: boolean;
    maxAttempts?: number;
    antiCheat?: {
      enabled?: boolean;
      tabChangeLimit?: number;
    };
    preventCopyPaste?: boolean;
    fullscreenMode?: boolean;
    webcamProctoring?: boolean;
    disableRightClick?: boolean;
    lockdownBrowser?: boolean;
    questions?: {
      id?: string;
      question?: string;
      type?: QuestionType;
      choices?: string[];
      answer?: string;
      imageUrl?: string;
      explanation?: string;
      choiceExplanations?: string[];
    }[];
    updatedAt?: string | Date;
  };
};

type ApiErrorResponse = {
  error?: string;
};

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================
function ComposerPageContent(): React.ReactNode {
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
  const [questions, setQuestions] = useState<Question[]>([
    {
      id: Date.now().toString(),
      question: "",
      type: "multiple_choice",
      choices: ["", "", "", ""],
      answer: "",
      explanation: "",
      choiceExplanations: ["", "", "", ""],
    },
  ]);
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
      setLoadingProgress((prev) => {
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
        setSettings((prev) => ({
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

        if (
          draft.questions !== undefined &&
          draft.questions !== null &&
          draft.questions.length > 0
        ) {
          setQuestions(
            draft.questions.map((q, index: number) => ({
              id: q.id ?? `${Date.now()}-${index}`,
              question: q.question ?? "",
              type: q.type ?? "multiple_choice",
              choices:
                q.choices ??
                (q.type === "multiple_choice" ? ["", "", "", ""] : []),
              answer: q.answer ?? "",
              imageUrl: q.imageUrl,
              explanation: q.explanation ?? "",
              choiceExplanations:
                q.type === "multiple_choice"
                  ? (q.choiceExplanations ??
                    (q.choices ?? ["", "", "", ""]).map(() => ""))
                  : [],
            }))
          );
        }
        setCurrentQuestionIndex(0);
        if (draft.updatedAt !== undefined && draft.updatedAt !== null) {
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
        setSettings((prev) => ({
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

        if (
          quiz.questions !== undefined &&
          quiz.questions !== null &&
          quiz.questions.length > 0
        ) {
          setQuestions(
            quiz.questions.map((q, index: number) => ({
              id: q.id ?? `${Date.now()}-${index}`,
              question: q.question ?? "",
              type: q.type ?? "multiple_choice",
              choices:
                q.choices ??
                (q.type === "multiple_choice" ? ["", "", "", ""] : []),
              answer: q.answer ?? "",
              imageUrl: q.imageUrl,
              explanation: q.explanation ?? "",
              choiceExplanations:
                q.type === "multiple_choice"
                  ? (q.choiceExplanations ??
                    (q.choices ?? ["", "", "", ""]).map(() => ""))
                  : [],
            }))
          );
        }
        setCurrentQuestionIndex(0);
        setLastSaved(
          quiz.updatedAt !== undefined && quiz.updatedAt !== null
            ? new Date(quiz.updatedAt)
            : null
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

  // ============================================================================
  // HANDLERS
  // ============================================================================
  const handleSettingChange = (
    key: keyof QuizSettings,
    value: QuizSettings[keyof QuizSettings]
  ): void => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  // Handle AI generated quiz - load into editor
  const handleAIGenerated = (quiz: GeneratedQuizData): void => {
    setSettings((prev) => ({
      ...prev,
      title: quiz.title,
      description: quiz.description,
    }));
    setQuestions(
      quiz.questions.map((q, index) => ({
        id: `${Date.now()}-${index}`,
        question: q.question,
        type: q.type,
        choices:
          q.type === "multiple_choice"
            ? q.choices && q.choices.length > 0
              ? q.choices
              : ["", "", "", ""]
            : [],
        answer: q.answer,
        explanation: q.explanation ?? "",
        choiceExplanations:
          q.type === "multiple_choice"
            ? (q.choiceExplanations ??
              (q.choices ?? ["", "", "", ""]).map(() => ""))
            : [],
      }))
    );
    setCurrentQuestionIndex(0);
    setShowAIModal(false);
  };

  const handleAddQuestion = (type: QuestionType = "multiple_choice"): void => {
    const newQuestion: Question = {
      id: Date.now().toString(),
      question: "",
      type,
      choices: type === "multiple_choice" ? ["", "", "", ""] : [],
      answer: "",
      explanation: "",
      choiceExplanations: type === "multiple_choice" ? ["", "", "", ""] : [],
    };
    setQuestions([...questions, newQuestion]);
    setCurrentQuestionIndex(questions.length);
    // Scroll pagination to the right after adding
    setTimeout(() => {
      if (
        paginationRef.current !== undefined &&
        paginationRef.current !== null
      ) {
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
            choices: q.choices.filter((_, i) => i !== choiceIndex),
            choiceExplanations: (
              q.choiceExplanations ?? ([] as never[])
            ).filter((_, i) => i !== choiceIndex),
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
    if (previewUrl !== undefined && previewUrl !== "") {
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

  const getDuplicateChoices = (questionId: string): number[] => {
    const question = questions.find((q) => q.id === questionId);
    if (question === undefined || question.type !== "multiple_choice")
      return [];
    const duplicates: number[] = [];
    const choiceMap = new Map<string, number[]>();
    question.choices.forEach((choice, index) => {
      const trimmed = choice.trim().toLowerCase();
      if (trimmed.length > 0) {
        if (!choiceMap.has(trimmed)) choiceMap.set(trimmed, []);
        const existing = choiceMap.get(trimmed);
        if (existing !== undefined) {
          existing.push(index);
        }
      }
    });
    choiceMap.forEach((indices) => {
      if (indices.length > 1) duplicates.push(...indices);
    });
    return duplicates;
  };

  const hasDuplicateChoices = (questionId: string): boolean =>
    getDuplicateChoices(questionId).length > 0;

  const getQuestionTypeInfo = (
    type: QuestionType
  ): {
    value: QuestionType;
    label: string;
    icon: string;
    description: string;
  } => {
    return QUESTION_TYPES.find((t) => t.value === type) ?? QUESTION_TYPES[0];
  };

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
        const validChoices = q.choices.filter((c) => c.trim().length > 0);
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
          validChoices.map((c) => c.trim()).includes(q.answer.trim()) === false
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
        questions.map(async (q) => {
          let imageUrl = q.imageUrl;
          if (q.imageFile !== undefined) {
            imageUrl = await uploadImageToImgbb(q.imageFile, idToken);
          }
          const questionData: {
            question: string;
            type: QuestionType;
            choices?: string[];
            answer: string;
            imageUrl?: string;
            explanation?: string;
            choiceExplanations?: string[];
          } = {
            question: q.question.trim(),
            type: q.type,
            choices:
              q.type === "multiple_choice"
                ? q.choices.filter((c) => c.trim()).map((c) => c.trim())
                : undefined,
            answer: q.answer.trim(),
            imageUrl,
          };
          // Add explanations for supported types
          if (
            ["multiple_choice", "identification", "true_or_false"].includes(
              q.type
            )
          ) {
            if (q.type === "multiple_choice") {
              // Filter choice explanations to match filtered choices
              const validChoiceIndices = q.choices
                .map((c, i) => (c.trim().length > 0 ? i : -1))
                .filter((i) => i !== -1);
              questionData.choiceExplanations = validChoiceIndices.map((i) =>
                (q.choiceExplanations?.[i] ?? "").trim()
              );
            } else {
              questionData.explanation = (q.explanation ?? "").trim();
            }
          }
          return questionData;
        })
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
      if (editMode && editQuizId) {
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
                  .filter((c) => c.trim().length > 0)
                  .map((c) => c.trim())
              : [],
          answer: q.answer.trim(),
          imageUrl: q.imageUrl,
          explanation: ["identification", "true_or_false"].includes(q.type)
            ? (q.explanation ?? "").trim()
            : undefined,
          choiceExplanations:
            q.type === "multiple_choice"
              ? (q.choiceExplanations ?? ([] as never[])).map((e) =>
                  (e ?? "").trim()
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

  const duplicateIndices = currentQuestion
    ? getDuplicateChoices(currentQuestion.id)
    : [];
  const typeInfo = currentQuestion
    ? getQuestionTypeInfo(currentQuestion.type)
    : QUESTION_TYPES[0];

  return (
    <div className="fixed inset-0 flex flex-col bg-amber-100">
      {/* INITIAL LOADING OVERLAY */}
      {initialLoading && (
        <div
          className={`fixed inset-0 bg-amber-100 z-[100] flex items-center justify-center transition-opacity duration-500 ${fadeOut ? "opacity-0" : "opacity-100"}`}
        >
          <div className="flex flex-col items-center gap-6 max-w-md w-full px-8">
            {/* Text */}
            <div className="text-center">
              <h2 className="text-2xl font-black text-gray-900 mb-2">
                {loadingDone ? "Done" : "Preparing things for you"}
              </h2>
              <p className="text-gray-600 font-medium">
                {loadingDone
                  ? "Your composer is ready"
                  : "Setting up your quiz composer..."}
              </p>
            </div>

            {/* Progress Bar */}
            <div className="w-full">
              <div
                className={`h-4 rounded-full border-2 border-gray-900 overflow-hidden shadow-[2px_2px_0px_0px_rgba(17,24,39,1)] transition-colors duration-300 ${loadingDone ? "bg-green-200" : "bg-amber-200"}`}
              >
                <div
                  className={`h-full transition-all duration-100 ease-out ${loadingDone ? "bg-green-500" : "bg-amber-400"}`}
                  style={{ width: `${loadingProgress}%` }}
                />
              </div>
              <p
                className={`text-center text-sm font-bold mt-2 transition-colors duration-300 ${loadingDone ? "text-green-700" : "text-gray-700"}`}
              >
                {loadingDone ? "Complete" : `${loadingProgress}%`}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TOP HEADER */}
      <header className="flex items-center justify-between px-4 py-3 bg-amber-100 border-b-2 border-gray-900">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/teacher?tab=quizzes")}
            className="w-10 h-10 bg-amber-200 text-gray-900 rounded-xl flex items-center justify-center border-2 border-gray-900 hover:bg-amber-300 transition-colors shadow-[2px_2px_0px_0px_rgba(17,24,39,1)]"
          >
            <span className="material-icons-outlined">home</span>
          </button>
          <div>
            <div className="flex items-center gap-2">
              {editMode && (
                <span className="text-xs font-bold px-2 py-0.5 bg-cyan-400 border-2 border-gray-900 rounded-full">
                  EDITING
                </span>
              )}
              <h1 className="text-lg font-black text-gray-900">
                {settings.title !== "" ? settings.title : "Untitled Quiz"}
              </h1>
            </div>
            <p className="text-xs text-gray-600 font-medium">
              {settings.description !== ""
                ? settings.description
                : "Click settings to add details"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {editMode && (
            <span className="text-xs text-cyan-700 font-bold px-3 py-1.5 bg-cyan-200 border-2 border-cyan-600 rounded-full flex items-center gap-1">
              <span className="material-icons-outlined text-xs">edit</span>
              Edit Mode
            </span>
          )}
          {draftId !== undefined && editMode === false && (
            <span className="text-xs text-green-700 font-bold px-3 py-1.5 bg-green-200 border-2 border-green-600 rounded-full flex items-center gap-1">
              <span className="material-icons-outlined text-xs">
                check_circle
              </span>
              Draft saved
            </span>
          )}
          <span className="text-xs text-gray-600 font-bold px-3 py-1.5 bg-amber-200 border-2 border-gray-900 rounded-full">
            {formatLastSaved() ?? "Not saved"}
          </span>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT SIDEBAR */}
        <aside
          className={`flex flex-col bg-amber-100 border-r-2 border-gray-900 transition-all duration-200 ${sidebarCollapsed ? "w-16" : "w-56"}`}
        >
          {/* Sidebar Header */}
          <div className="flex items-center justify-between p-3 border-b-2 border-gray-900">
            {!sidebarCollapsed && (
              <span className="text-gray-900 font-black text-xs uppercase tracking-wider">
                Tools
              </span>
            )}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="w-8 h-8 rounded-lg bg-amber-200 border-2 border-gray-900 hover:bg-amber-300 flex items-center justify-center transition-colors ml-auto"
            >
              <span className="material-icons-outlined text-gray-900 text-sm">
                {sidebarCollapsed ? "chevron_right" : "chevron_left"}
              </span>
            </button>
          </div>

          {/* Question Types */}
          <div className="p-2 border-b-2 border-gray-900">
            {!sidebarCollapsed && (
              <p className="text-[10px] font-black text-gray-700 uppercase tracking-wider mb-2 px-2">
                Add Question
              </p>
            )}
            <div className="flex flex-col gap-1">
              {QUESTION_TYPES.map((type) => (
                <button
                  key={type.value}
                  onClick={() => handleAddQuestion(type.value)}
                  className={`group flex items-center gap-2 p-2 rounded-xl hover:bg-amber-200 border-2 border-transparent hover:border-gray-900 transition-all ${sidebarCollapsed ? "justify-center" : ""}`}
                  title={type.label}
                >
                  <div className="w-8 h-8 bg-amber-200 rounded-lg flex items-center justify-center flex-shrink-0 border-2 border-gray-900 group-hover:bg-amber-300">
                    <span className="material-icons-outlined text-gray-900 text-sm">
                      {type.icon}
                    </span>
                  </div>
                  {!sidebarCollapsed && (
                    <div className="flex flex-col items-start min-w-0 text-left">
                      <span className="text-gray-900 font-bold text-xs">
                        {type.label}
                      </span>
                      <span className="text-gray-500 text-[9px] leading-tight line-clamp-2 text-left">
                        {type.description}
                      </span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="p-2 border-b-2 border-gray-900">
            {!sidebarCollapsed && (
              <p className="text-[10px] font-black text-gray-700 uppercase tracking-wider mb-2 px-2">
                Actions
              </p>
            )}
            <div className="flex flex-col gap-1">
              <button
                onClick={() => setShowAIModal(true)}
                className={`group flex items-center gap-2 p-2 rounded-xl hover:bg-amber-200 border-2 border-transparent hover:border-gray-900 transition-all ${sidebarCollapsed ? "justify-center" : ""}`}
                title="AI Generate"
              >
                <div className="w-8 h-8 bg-amber-200 rounded-lg flex items-center justify-center flex-shrink-0 border-2 border-gray-900 group-hover:bg-amber-300">
                  <span className="material-icons-outlined text-gray-900 text-sm">
                    auto_awesome
                  </span>
                </div>
                {!sidebarCollapsed && (
                  <div className="flex flex-col items-start min-w-0 text-left">
                    <span className="text-gray-900 font-bold text-xs">
                      AI Generate
                    </span>
                    <span className="text-gray-500 text-[9px] leading-tight line-clamp-2">
                      Generate quiz questions from PDF using AI
                    </span>
                  </div>
                )}
              </button>
              <button
                onClick={() => setShowSettingsModal(true)}
                className={`group flex items-center gap-2 p-2 rounded-xl hover:bg-amber-200 border-2 border-transparent hover:border-gray-900 transition-all ${sidebarCollapsed ? "justify-center" : ""}`}
                title="Settings"
              >
                <div className="w-8 h-8 bg-amber-200 rounded-lg flex items-center justify-center flex-shrink-0 border-2 border-gray-900 group-hover:bg-amber-300">
                  <span className="material-icons-outlined text-gray-900 text-sm">
                    settings
                  </span>
                </div>
                {!sidebarCollapsed && (
                  <div className="flex flex-col items-start min-w-0 text-left">
                    <span className="text-gray-900 font-bold text-xs">
                      Settings
                    </span>
                    <span className="text-gray-500 text-[9px] leading-tight line-clamp-2">
                      Configure quiz title, time limit, and options
                    </span>
                  </div>
                )}
              </button>
              <button
                onClick={() => void handleDuplicateQuestion()}
                className={`group flex items-center gap-2 p-2 rounded-xl hover:bg-amber-200 border-2 border-transparent hover:border-gray-900 transition-all ${sidebarCollapsed ? "justify-center" : ""}`}
                title="Duplicate"
              >
                <div className="w-8 h-8 bg-amber-200 rounded-lg flex items-center justify-center flex-shrink-0 border-2 border-gray-900 group-hover:bg-amber-300">
                  <span className="material-icons-outlined text-gray-900 text-sm">
                    content_copy
                  </span>
                </div>
                {!sidebarCollapsed && (
                  <div className="flex flex-col items-start min-w-0 text-left">
                    <span className="text-gray-900 font-bold text-xs">
                      Duplicate
                    </span>
                    <span className="text-gray-500 text-[9px] leading-tight line-clamp-2">
                      Create a copy of the current question
                    </span>
                  </div>
                )}
              </button>
              {questions.length > 1 && (
                <button
                  onClick={() =>
                    handleRemoveQuestion(currentQuestion?.id ?? "")
                  }
                  className={`group flex items-center gap-2 p-2 rounded-xl hover:bg-red-100 border-2 border-transparent hover:border-red-500 transition-all ${sidebarCollapsed ? "justify-center" : ""}`}
                  title="Delete"
                >
                  <div className="w-8 h-8 bg-amber-200 rounded-lg flex items-center justify-center flex-shrink-0 border-2 border-gray-900 group-hover:bg-red-200">
                    <span className="material-icons-outlined text-gray-900 text-sm group-hover:text-red-600">
                      delete
                    </span>
                  </div>
                  {!sidebarCollapsed && (
                    <div className="flex flex-col items-start min-w-0 text-left">
                      <span className="text-gray-900 font-bold text-xs group-hover:text-red-600">
                        Delete
                      </span>
                      <span className="text-gray-500 text-[9px] leading-tight line-clamp-2 group-hover:text-red-500">
                        Remove the current question from quiz
                      </span>
                    </div>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Save Draft & Publish Buttons */}
          <div className="mt-auto p-3 flex flex-col gap-2">
            <button
              onClick={() => void handleSaveAsDraft()}
              disabled={savingDraft || loading}
              className="w-full flex items-center justify-center gap-2 p-2.5 bg-amber-200 hover:bg-amber-300 text-gray-900 font-bold rounded-xl border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(17,24,39,1)] hover:shadow-[3px_3px_0px_0px_rgba(17,24,39,1)] hover:-translate-x-0.5 hover:-translate-y-0.5 active:shadow-[1px_1px_0px_0px_rgba(17,24,39,1)] active:translate-x-0.5 active:translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {savingDraft ? (
                <div className="w-4 h-4 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
              ) : (
                <span className="material-icons-outlined text-sm">
                  save_alt
                </span>
              )}
              {!sidebarCollapsed && (
                <span className="text-xs">
                  {savingDraft ? "Saving..." : "Save Draft"}
                </span>
              )}
            </button>
            <button
              onClick={() => void handlePublish()}
              disabled={loading || savingDraft}
              className={`w-full flex items-center justify-center gap-2 p-3 ${editMode ? "bg-cyan-400 hover:bg-cyan-500" : "bg-amber-400 hover:bg-amber-500"} text-gray-900 font-black rounded-xl border-2 border-gray-900 shadow-[3px_3px_0px_0px_rgba(17,24,39,1)] hover:shadow-[4px_4px_0px_0px_rgba(17,24,39,1)] hover:-translate-x-0.5 hover:-translate-y-0.5 active:shadow-[1px_1px_0px_0px_rgba(17,24,39,1)] active:translate-x-0.5 active:translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
              ) : (
                <span className="material-icons-outlined">
                  {editMode ? "save" : "publish"}
                </span>
              )}
              {!sidebarCollapsed && (
                <span className="text-sm">
                  {loading
                    ? editMode
                      ? "Updating..."
                      : "Publishing..."
                    : editMode
                      ? "Update"
                      : "Publish"}
                </span>
              )}
            </button>
          </div>
        </aside>

        {/* MAIN CANVAS */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Canvas Area */}
          <div className="flex-1 overflow-y-auto p-8 bg-amber-50">
            <div className="mx-auto">
              {currentQuestion !== null && (
                <div className="bg-white rounded-2xl border-2 border-gray-900 shadow-[6px_6px_0px_0px_rgba(17,24,39,1)] overflow-hidden">
                  {/* Card Header */}
                  <div className="bg-amber-200 px-6 py-4 flex items-center justify-between border-b-2 border-gray-900">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(17,24,39,1)]">
                        <span className="text-2xl font-black text-gray-900">
                          {currentQuestionIndex + 1}
                        </span>
                      </div>
                      <div>
                        <p className="text-gray-900 font-black text-lg">
                          {typeInfo.label}
                        </p>
                        <p className="text-gray-700 text-sm font-medium">
                          Question {currentQuestionIndex + 1} of{" "}
                          {questions.length}
                        </p>
                      </div>
                    </div>
                    <select
                      value={currentQuestion.type}
                      onChange={(e) =>
                        handleQuestionChange(
                          currentQuestion.id,
                          "type",
                          e.target.value
                        )
                      }
                      className="px-4 py-2 bg-white border-2 border-gray-900 rounded-xl font-bold text-gray-900 text-sm cursor-pointer focus:outline-none shadow-[2px_2px_0px_0px_rgba(17,24,39,1)]"
                    >
                      {QUESTION_TYPES.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Card Body */}
                  <div className="p-6 flex flex-col gap-6 bg-amber-50">
                    {/* Question + Image Row */}
                    <div className="flex gap-6">
                      {/* Question Text - Left Side */}
                      <div className="flex-1">
                        <label className="text-sm font-black text-gray-900 mb-2 block">
                          Question <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          value={currentQuestion.question}
                          onChange={(e) =>
                            handleQuestionChange(
                              currentQuestion.id,
                              "question",
                              e.target.value
                            )
                          }
                          className="w-full h-40 px-4 py-4 bg-white border-2 border-gray-900 rounded-xl text-gray-900 font-medium text-lg placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none shadow-[2px_2px_0px_0px_rgba(17,24,39,1)]"
                          placeholder="Type your question here..."
                        />
                      </div>

                      {/* Image Upload - Right Side */}
                      <div className="w-64 flex-shrink-0">
                        <label className="text-sm font-black text-gray-900 mb-2 block">
                          Image (Optional)
                        </label>
                        {(currentQuestion.imagePreview !== undefined &&
                          currentQuestion.imagePreview !== "") ||
                        (currentQuestion.imageUrl !== undefined &&
                          currentQuestion.imageUrl !== "") ? (
                          <div className="relative h-40 border-2 border-gray-900 rounded-xl overflow-hidden bg-white group">
                            <Image
                              src={
                                currentQuestion.imagePreview ??
                                currentQuestion.imageUrl ??
                                ""
                              }
                              alt="Question"
                              fill
                              className="object-contain"
                              unoptimized={
                                currentQuestion.imagePreview !== undefined &&
                                currentQuestion.imagePreview !== ""
                              }
                            />
                            <button
                              onClick={() =>
                                handleRemoveImage(currentQuestion.id)
                              }
                              className="absolute top-2 right-2 w-8 h-8 bg-red-400 text-gray-900 rounded-lg border-2 border-gray-900 hover:bg-red-500 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100"
                            >
                              <span className="material-icons-outlined text-sm">
                                close
                              </span>
                            </button>
                          </div>
                        ) : (
                          <label className="flex flex-col items-center justify-center gap-2 h-40 bg-white border-2 border-dashed border-gray-400 rounded-xl cursor-pointer hover:border-gray-900 hover:bg-amber-100 transition-all">
                            <span className="material-icons-outlined text-gray-400 text-4xl">
                              add_photo_alternate
                            </span>
                            <span className="text-xs font-bold text-gray-500">
                              Click to upload
                            </span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file !== undefined && file !== null)
                                  handleImageSelect(currentQuestion.id, file);
                                e.target.value = "";
                              }}
                              className="hidden"
                            />
                          </label>
                        )}
                      </div>
                    </div>

                    {/* Multiple Choice */}
                    {currentQuestion.type === "multiple_choice" && (
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <label className="text-sm font-black text-gray-900">
                            Choices <span className="text-red-500">*</span>
                          </label>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() =>
                                setShowExplanations(!showExplanations)
                              }
                              className={`px-3 py-1.5 font-bold text-xs rounded-lg border-2 transition-colors flex items-center gap-1 ${showExplanations ? "bg-green-400 border-gray-900 text-gray-900 shadow-[2px_2px_0px_0px_rgba(17,24,39,1)]" : "bg-green-100 border-green-400 text-green-700 hover:bg-green-200"}`}
                            >
                              <span className="material-icons-outlined text-sm">
                                lightbulb
                              </span>
                              {showExplanations ? "Hide" : "Show"} Explanations
                            </button>
                            {currentQuestion.choices.length < 6 && (
                              <button
                                onClick={() =>
                                  handleAddChoice(currentQuestion.id)
                                }
                                className="px-3 py-1.5 bg-amber-200 text-gray-900 font-bold text-xs rounded-lg border-2 border-gray-900 hover:bg-amber-300 transition-colors flex items-center gap-1 shadow-[2px_2px_0px_0px_rgba(17,24,39,1)]"
                              >
                                <span className="material-icons-outlined text-sm">
                                  add
                                </span>{" "}
                                Add
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          {currentQuestion.choices.map((choice, idx) => {
                            const isDuplicate = duplicateIndices.includes(idx);
                            const isCorrect =
                              currentQuestion.answer.trim() === choice.trim() &&
                              choice.trim().length > 0;
                            const choiceExplanation =
                              currentQuestion.choiceExplanations?.[idx] ?? "";
                            return (
                              <div key={idx} className="flex flex-col gap-2">
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() =>
                                      choice.trim() &&
                                      handleQuestionChange(
                                        currentQuestion.id,
                                        "answer",
                                        choice.trim()
                                      )
                                    }
                                    className={`w-8 h-8 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${isCorrect ? "bg-green-400 border-gray-900 shadow-[2px_2px_0px_0px_rgba(17,24,39,1)]" : "bg-white border-gray-400 hover:border-gray-900 hover:bg-green-100"}`}
                                  >
                                    {isCorrect && (
                                      <span className="material-icons-outlined text-gray-900 text-xs">
                                        check
                                      </span>
                                    )}
                                  </button>
                                  <input
                                    type="text"
                                    value={choice}
                                    onChange={(e) =>
                                      handleChoiceChange(
                                        currentQuestion.id,
                                        idx,
                                        e.target.value
                                      )
                                    }
                                    className={`flex-1 min-w-0 px-3 py-2 bg-white border-2 rounded-xl font-medium text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400 transition-all ${isDuplicate ? "border-red-500" : isCorrect ? "border-green-500 bg-green-50" : "border-gray-300 focus:border-gray-900"}`}
                                    placeholder={`Choice ${idx + 1}`}
                                  />
                                  {currentQuestion.choices.length > 2 && (
                                    <button
                                      onClick={() =>
                                        handleRemoveChoice(
                                          currentQuestion.id,
                                          idx
                                        )
                                      }
                                      className="w-7 h-7 bg-amber-100 rounded-lg flex items-center justify-center border-2 border-gray-300 hover:bg-red-100 hover:border-red-500 hover:text-red-600 transition-colors flex-shrink-0"
                                    >
                                      <span className="material-icons-outlined text-xs">
                                        close
                                      </span>
                                    </button>
                                  )}
                                </div>
                                {/* Choice Explanation */}
                                {showExplanations && (
                                  <div className="ml-10">
                                    <div
                                      className={`flex items-start gap-2 p-2 rounded-xl border-2 ${isCorrect ? "bg-green-50 border-green-300" : "bg-gray-50 border-gray-300"}`}
                                    >
                                      <span
                                        className={`material-icons-outlined text-xs mt-0.5 ${isCorrect ? "text-green-600" : "text-gray-400"}`}
                                      >
                                        {isCorrect ? "check_circle" : "cancel"}
                                      </span>
                                      <div className="flex-1">
                                        <label
                                          className={`text-xs font-bold mb-1 block ${isCorrect ? "text-green-700" : "text-gray-500"}`}
                                        >
                                          {isCorrect
                                            ? "Why correct:"
                                            : "Why wrong:"}
                                        </label>
                                        <textarea
                                          value={choiceExplanation}
                                          onChange={(e) =>
                                            handleChoiceExplanationChange(
                                              currentQuestion.id,
                                              idx,
                                              e.target.value
                                            )
                                          }
                                          className={`w-full px-2 py-1.5 bg-white border-2 rounded-lg text-xs font-medium placeholder:text-gray-400 focus:outline-none resize-none transition-all ${isCorrect ? "border-green-300 focus:border-green-500 focus:ring-2 focus:ring-green-200" : "border-gray-300 focus:border-gray-500 focus:ring-2 focus:ring-gray-200"}`}
                                          placeholder={
                                            isCorrect
                                              ? "Why this is correct..."
                                              : "Why this is incorrect..."
                                          }
                                          rows={2}
                                        />
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                        {hasDuplicateChoices(currentQuestion.id) && (
                          <p className="text-sm text-red-500 font-bold mt-3 flex items-center gap-1">
                            <span className="material-icons-outlined text-sm">
                              warning
                            </span>{" "}
                            Duplicate choices
                          </p>
                        )}
                        <p className="text-xs text-gray-600 font-medium mt-3">
                          Click the circle to mark the correct answer • Max 6
                          choices
                        </p>
                      </div>
                    )}

                    {/* True/False */}
                    {currentQuestion.type === "true_or_false" && (
                      <div>
                        <label className="text-sm font-black text-gray-900 mb-3 block">
                          Correct Answer <span className="text-red-500">*</span>
                        </label>
                        <div className="flex gap-4">
                          <button
                            onClick={() =>
                              handleQuestionChange(
                                currentQuestion.id,
                                "answer",
                                "true"
                              )
                            }
                            className={`flex-1 py-4 rounded-xl border-2 font-bold text-lg transition-all ${currentQuestion.answer === "true" ? "bg-green-400 border-gray-900 text-gray-900 shadow-[3px_3px_0px_0px_rgba(17,24,39,1)]" : "bg-white border-gray-300 text-gray-700 hover:border-green-500"}`}
                          >
                            <span className="flex items-center justify-center gap-2">
                              <span className="material-icons-outlined">
                                check
                              </span>{" "}
                              True
                            </span>
                          </button>
                          <button
                            onClick={() =>
                              handleQuestionChange(
                                currentQuestion.id,
                                "answer",
                                "false"
                              )
                            }
                            className={`flex-1 py-4 rounded-xl border-2 font-bold text-lg transition-all ${currentQuestion.answer === "false" ? "bg-red-400 border-gray-900 text-gray-900 shadow-[3px_3px_0px_0px_rgba(17,24,39,1)]" : "bg-white border-gray-300 text-gray-700 hover:border-red-500"}`}
                          >
                            <span className="flex items-center justify-center gap-2">
                              <span className="material-icons-outlined">
                                close
                              </span>{" "}
                              False
                            </span>
                          </button>
                        </div>
                        {/* Explanation for True/False */}
                        <div className="mt-4">
                          <label className="text-sm font-black text-gray-900 mb-2 flex items-center gap-2">
                            <span className="material-icons-outlined text-green-500 text-sm">
                              lightbulb
                            </span>
                            Explanation (Optional)
                          </label>
                          <textarea
                            value={currentQuestion.explanation ?? ""}
                            onChange={(e) =>
                              handleExplanationChange(
                                currentQuestion.id,
                                e.target.value
                              )
                            }
                            className="w-full px-4 py-3 bg-green-50 border-2 border-green-300 rounded-xl font-medium placeholder:text-gray-400 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-200 resize-none transition-all shadow-[2px_2px_0px_0px_rgba(34,197,94,0.3)]"
                            placeholder="Explain why this statement is true or false..."
                            rows={3}
                          />
                        </div>
                      </div>
                    )}

                    {/* Text Answer Types */}
                    {(currentQuestion.type === "identification" ||
                      currentQuestion.type === "enumeration" ||
                      currentQuestion.type === "essay" ||
                      currentQuestion.type === "reflection") && (
                      <div>
                        <label className="text-sm font-black text-gray-900 mb-2 block">
                          {currentQuestion.type === "enumeration"
                            ? "Answers (comma-separated)"
                            : currentQuestion.type === "essay" ||
                                currentQuestion.type === "reflection"
                              ? "Sample Answer / Rubric"
                              : "Correct Answer"}{" "}
                          <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          value={currentQuestion.answer}
                          onChange={(e) =>
                            handleQuestionChange(
                              currentQuestion.id,
                              "answer",
                              e.target.value
                            )
                          }
                          className="w-full px-4 py-3 bg-white border-2 border-gray-900 rounded-xl font-medium placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none shadow-[2px_2px_0px_0px_rgba(17,24,39,1)]"
                          placeholder={
                            currentQuestion.type === "enumeration"
                              ? "Answer 1, Answer 2, Answer 3..."
                              : currentQuestion.type === "essay" ||
                                  currentQuestion.type === "reflection"
                                ? "Enter sample answer or rubric..."
                                : "Enter the correct answer..."
                          }
                          rows={
                            currentQuestion.type === "essay" ||
                            currentQuestion.type === "reflection"
                              ? 4
                              : 2
                          }
                        />
                        {/* Explanation for Identification */}
                        {currentQuestion.type === "identification" && (
                          <div className="mt-4">
                            <label className="text-sm font-black text-gray-900 mb-2 flex items-center gap-2">
                              <span className="material-icons-outlined text-green-500 text-sm">
                                lightbulb
                              </span>
                              Explanation (Optional)
                            </label>
                            <textarea
                              value={currentQuestion.explanation ?? ""}
                              onChange={(e) =>
                                handleExplanationChange(
                                  currentQuestion.id,
                                  e.target.value
                                )
                              }
                              className="w-full px-4 py-3 bg-green-50 border-2 border-green-300 rounded-xl font-medium placeholder:text-gray-400 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-200 resize-none transition-all shadow-[2px_2px_0px_0px_rgba(34,197,94,0.3)]"
                              placeholder="Explain why this is the correct answer..."
                              rows={3}
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* BOTTOM PAGINATION */}
          <nav className="flex flex-col gap-2 px-4 py-3 bg-amber-100 border-t-2 border-gray-900">
            {/* Search Bar & Filters */}
            <div className="flex items-center gap-2">
              {/* Filter Buttons */}
              <div className="flex items-center bg-white border-2 border-gray-900 rounded-xl overflow-hidden shadow-[2px_2px_0px_0px_rgba(17,24,39,1)] h-[42px]">
                <button
                  onClick={() => setSearchFilter("all")}
                  className={`px-3 h-full text-xs font-bold transition-colors ${searchFilter === "all" ? "bg-amber-300 text-gray-900" : "bg-white text-gray-600 hover:bg-amber-100"}`}
                >
                  All
                </button>
                <button
                  onClick={() => setSearchFilter("questions")}
                  className={`px-3 h-full text-xs font-bold border-l-2 border-gray-900 transition-colors ${searchFilter === "questions" ? "bg-amber-300 text-gray-900" : "bg-white text-gray-600 hover:bg-amber-100"}`}
                >
                  Questions
                </button>
                <button
                  onClick={() => setSearchFilter("answers")}
                  className={`px-3 h-full text-xs font-bold border-l-2 border-gray-900 transition-colors ${searchFilter === "answers" ? "bg-amber-300 text-gray-900" : "bg-white text-gray-600 hover:bg-amber-100"}`}
                >
                  Answers
                </button>
              </div>

              {/* Search Input */}
              <div className="relative flex-1 max-w-xs h-[42px]">
                <span className="material-icons-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                  search
                </span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={`Search ${searchFilter === "all" ? "all" : searchFilter}...`}
                  className="w-full h-full pl-9 pr-8 bg-white border-2 border-gray-900 rounded-xl text-sm font-medium placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400 shadow-[2px_2px_0px_0px_rgba(17,24,39,1)]"
                />
                {searchQuery.length > 0 && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 bg-gray-200 rounded-full flex items-center justify-center hover:bg-gray-300 transition-colors"
                  >
                    <span className="material-icons-outlined text-gray-600 text-xs">
                      close
                    </span>
                  </button>
                )}
              </div>

              {/* Results Count */}
              {searchQuery.length > 0 && (
                <span className="text-xs font-bold text-gray-600 px-2 py-1.5 bg-amber-200 border-2 border-gray-900 rounded-lg">
                  {
                    questions.filter((q) => {
                      const query = searchQuery.toLowerCase();
                      if (searchFilter === "questions") {
                        return q.question.toLowerCase().includes(query);
                      } else if (searchFilter === "answers") {
                        return (
                          q.answer.toLowerCase().includes(query) ||
                          (q.choices !== undefined &&
                            q.choices !== null &&
                            q.choices.some((c) =>
                              c.toLowerCase().includes(query)
                            ))
                        );
                      } else {
                        return (
                          q.question.toLowerCase().includes(query) ||
                          q.answer.toLowerCase().includes(query) ||
                          (q.choices !== undefined &&
                            q.choices !== null &&
                            q.choices.some((c) =>
                              c.toLowerCase().includes(query)
                            ))
                        );
                      }
                    }).length
                  }{" "}
                  found
                </span>
              )}

              {/* Spacer */}
              <div className="flex-1"></div>

              {/* Page Indicator - Right Side */}
              <div className="flex items-center gap-1 px-2 py-1 bg-white border-2 border-gray-900 rounded-lg shadow-[2px_2px_0px_0px_rgba(17,24,39,1)]">
                <span className="text-gray-900 font-bold text-xs">
                  {currentQuestionIndex + 1}
                </span>
                <span className="text-gray-400 text-xs">/</span>
                <span className="text-gray-600 font-medium text-xs">
                  {questions.length}
                </span>
              </div>
            </div>

            {/* Pagination Row */}
            <div className="flex items-center gap-3">
              <button
                onClick={() =>
                  setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))
                }
                disabled={currentQuestionIndex === 0}
                className="w-10 h-full rounded-xl bg-amber-200 border-2 border-gray-900 hover:bg-amber-300 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed transition-colors shadow-[2px_2px_0px_0px_rgba(17,24,39,1)] flex-shrink-0"
              >
                <span className="material-icons-outlined text-gray-900">
                  chevron_left
                </span>
              </button>

              <div
                ref={paginationRef}
                className="flex-1 flex items-center gap-3 overflow-x-auto py-1 px-1"
              >
                {questions.map((q, index) => {
                  const qTypeInfo = getQuestionTypeInfo(q.type);
                  const isActive = currentQuestionIndex === index;
                  const hasContent = q.question.trim().length > 0;
                  const questionPreview =
                    q.question.trim().length > 0
                      ? q.question.trim()
                      : "Empty question...";

                  // Check if question is incomplete
                  const isIncomplete = ((): boolean => {
                    if (q.question.trim().length === 0) return true;
                    if (q.answer.trim().length === 0) return true;
                    if (q.type === "multiple_choice") {
                      const validChoices = q.choices.filter(
                        (c) => c.trim().length > 0
                      );
                      if (validChoices.length < 2) return true;
                      if (
                        !validChoices
                          .map((c) => c.trim())
                          .includes(q.answer.trim())
                      )
                        return true;
                    }
                    if (
                      q.type === "true_or_false" &&
                      q.answer !== "true" &&
                      q.answer !== "false"
                    )
                      return true;
                    return false;
                  })();

                  // Check if question matches search based on filter
                  const matchesSearch =
                    searchQuery.length > 0
                      ? (() => {
                          const query = searchQuery.toLowerCase();
                          if (searchFilter === "questions") {
                            return q.question.toLowerCase().includes(query);
                          } else if (searchFilter === "answers") {
                            return (
                              q.answer.toLowerCase().includes(query) ||
                              (q.choices !== undefined &&
                                q.choices !== null &&
                                q.choices.some((c) =>
                                  c.toLowerCase().includes(query)
                                ))
                            );
                          } else {
                            return (
                              q.question.toLowerCase().includes(query) ||
                              q.answer.toLowerCase().includes(query) ||
                              (q.choices !== undefined &&
                                q.choices !== null &&
                                q.choices.some((c) =>
                                  c.toLowerCase().includes(query)
                                ))
                            );
                          }
                        })()
                      : true;

                  // Dim non-matching questions when searching
                  const dimmed = searchQuery.length > 0 && !matchesSearch;

                  return (
                    <div
                      key={q.id}
                      onClick={() => setCurrentQuestionIndex(index)}
                      className={`flex-shrink-0 rounded-xl border-2 overflow-hidden transition-all flex flex-col cursor-pointer relative ${
                        dimmed ? "opacity-30" : ""
                      } ${
                        matchesSearch && searchQuery.length > 0
                          ? "ring-2 ring-amber-500"
                          : ""
                      } ${
                        isIncomplete
                          ? "border-red-500 ring-2 ring-red-300"
                          : isActive
                            ? `border-gray-900 shadow-[3px_3px_0px_0px_rgba(17,24,39,1)] ring-2 ring-amber-400`
                            : hasContent
                              ? "border-gray-900 hover:shadow-[2px_2px_0px_0px_rgba(17,24,39,1)] hover:-translate-y-0.5"
                              : "border-gray-400 border-dashed hover:border-gray-900"
                      }`}
                      style={{ width: "240px", height: "152px" }}
                    >
                      {/* Red overlay for incomplete questions */}
                      {isIncomplete && (
                        <div className="absolute inset-0 bg-red-500/10 pointer-events-none z-10">
                          <div className="absolute top-1 right-8 bg-red-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded">
                            Incomplete
                          </div>
                        </div>
                      )}

                      {/* Card Header with Type Icon */}
                      <div
                        className={`${isIncomplete ? "bg-red-100" : isActive ? "bg-amber-300" : "bg-amber-200"} px-2 py-1.5 flex items-center justify-between border-b-2 ${isIncomplete ? "border-red-300" : isActive ? "border-gray-900" : "border-gray-300"}`}
                      >
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`material-icons-outlined text-xs ${isIncomplete ? "text-red-600" : "text-gray-900"}`}
                          >
                            {qTypeInfo.icon}
                          </span>
                          <span
                            className={`text-xs font-black truncate ${isIncomplete ? "text-red-700" : isActive ? "text-gray-900" : "text-gray-700"}`}
                          >
                            {index + 1}. {qTypeInfo.label.split(" ")[0]}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          {matchesSearch && searchQuery.length > 0 && (
                            <span className="material-icons-outlined text-xs text-amber-600">
                              search
                            </span>
                          )}
                          {questions.length > 1 && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveQuestion(q.id);
                              }}
                              className="hover:opacity-70 transition-opacity z-20"
                              title="Delete question"
                            >
                              <span className="material-icons text-red-600 text-sm">
                                delete
                              </span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Card Body with Question Preview */}
                      <div
                        className={`flex-1 p-2 ${isIncomplete ? "bg-red-50" : isActive ? "bg-white" : "bg-amber-50"}`}
                      >
                        <p
                          className={`text-[10px] leading-tight font-medium line-clamp-3 ${isIncomplete ? "text-red-700" : hasContent ? (isActive ? "text-gray-900" : "text-gray-700") : "text-gray-400 italic"}`}
                        >
                          {questionPreview}
                        </p>
                      </div>

                      {/* Card Footer with Answer Preview */}
                      <div
                        className={`px-2 py-1 ${isIncomplete ? "bg-red-100/50" : isActive ? "bg-amber-100" : "bg-amber-100/50"} border-t ${isIncomplete ? "border-red-200" : isActive ? "border-gray-300" : "border-gray-200"}`}
                      >
                        <p
                          className={`text-[9px] leading-tight font-medium line-clamp-2 ${isIncomplete ? "text-red-600" : q.answer.trim().length > 0 ? (isActive ? "text-gray-700" : "text-gray-500") : "text-gray-400 italic"}`}
                        >
                          {q.answer.trim().length > 0
                            ? q.answer.trim()
                            : "No answer yet"}
                        </p>
                      </div>
                    </div>
                  );
                })}

                {/* Add Question Button */}
                <button
                  onClick={() => handleAddQuestion()}
                  className="flex-shrink-0 rounded-xl border-2 border-dashed border-gray-400 flex flex-col items-center justify-center hover:border-gray-900 hover:bg-amber-200 transition-all group"
                  style={{ width: "128px", height: "152px" }}
                >
                  <div className="w-10 h-10 rounded-full bg-amber-100 border-2 border-gray-400 group-hover:border-gray-900 group-hover:bg-amber-300 flex items-center justify-center transition-all">
                    <span className="material-icons-outlined text-gray-500 group-hover:text-gray-900 text-xl">
                      add
                    </span>
                  </div>
                  <span className="text-xs font-bold text-gray-500 group-hover:text-gray-900 mt-2">
                    Add Question
                  </span>
                </button>
              </div>

              <button
                onClick={() =>
                  setCurrentQuestionIndex(
                    Math.min(questions.length - 1, currentQuestionIndex + 1)
                  )
                }
                disabled={currentQuestionIndex === questions.length - 1}
                className="w-10 h-full rounded-xl bg-amber-200 border-2 border-gray-900 hover:bg-amber-300 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed transition-colors shadow-[2px_2px_0px_0px_rgba(17,24,39,1)] flex-shrink-0"
              >
                <span className="material-icons-outlined text-gray-900">
                  chevron_right
                </span>
              </button>
            </div>
          </nav>
        </main>
      </div>

      {/* AI GENERATION MODAL */}
      {idToken !== null && (
        <PDFUploadModal
          isOpen={showAIModal}
          onClose={() => setShowAIModal(false)}
          onEdit={handleAIGenerated}
          onSave={handleAIGenerated}
          idToken={idToken}
        />
      )}

      {/* SETTINGS MODAL */}
      {showSettingsModal && (
        <Modal
          isOpen={showSettingsModal}
          onClose={() => setShowSettingsModal(false)}
          className="w-full max-w-2xl max-h-[90vh]"
        >
          <div className="bg-amber-50 border-3 border-gray-900 rounded-2xl shadow-[8px_8px_0px_0px_rgba(17,24,39,1)] w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b-2 border-gray-900 bg-amber-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-400 rounded-xl flex items-center justify-center border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(17,24,39,1)]">
                  <span className="material-icons-outlined text-gray-900">
                    settings
                  </span>
                </div>
                <h3 className="text-xl font-black text-gray-900">
                  Quiz Settings
                </h3>
              </div>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="w-10 h-10 bg-red-400 rounded-xl flex items-center justify-center border-2 border-gray-900 hover:bg-red-500 transition-colors shadow-[2px_2px_0px_0px_rgba(17,24,39,1)]"
              >
                <span className="material-icons-outlined text-gray-900">
                  close
                </span>
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
              {/* Basic Info */}
              <div className="flex flex-col gap-4">
                <h4 className="text-sm font-black text-gray-900 uppercase tracking-wider">
                  Basic Information
                </h4>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-bold text-gray-700">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={settings.title}
                    onChange={(e) =>
                      handleSettingChange("title", e.target.value)
                    }
                    placeholder="Enter quiz title..."
                    className="px-4 py-3 bg-white border-2 border-gray-900 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-amber-400 shadow-[2px_2px_0px_0px_rgba(17,24,39,1)]"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-bold text-gray-700">
                    Description
                  </label>
                  <textarea
                    value={settings.description}
                    onChange={(e) =>
                      handleSettingChange("description", e.target.value)
                    }
                    placeholder="Enter description..."
                    rows={3}
                    className="px-4 py-3 bg-white border-2 border-gray-900 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none shadow-[2px_2px_0px_0px_rgba(17,24,39,1)]"
                  />
                </div>
              </div>

              {/* Time Settings */}
              <div className="flex flex-col gap-4">
                <h4 className="text-sm font-black text-gray-900 uppercase tracking-wider">
                  Time & Attempts
                </h4>
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-bold text-gray-700">
                      Duration (minutes)
                    </label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {[15, 30, 45, 60, 90, 120].map((mins) => (
                        <button
                          key={mins}
                          onClick={() => handleSettingChange("duration", mins)}
                          className={`px-4 py-2 rounded-full border-2 font-bold text-sm transition-all ${
                            settings.duration === mins
                              ? "bg-amber-200 border-gray-900 text-gray-900 shadow-[2px_2px_0px_0px_rgba(17,24,39,1)]"
                              : "bg-white border-gray-300 text-gray-700 hover:border-gray-900"
                          }`}
                        >
                          {mins} min
                        </button>
                      ))}
                      <button
                        onClick={() => handleSettingChange("duration", null)}
                        className={`px-4 py-2 rounded-full border-2 font-bold text-sm transition-all ${
                          settings.duration === null
                            ? "bg-amber-200 border-gray-900 text-gray-900 shadow-[2px_2px_0px_0px_rgba(17,24,39,1)]"
                            : "bg-white border-gray-300 text-gray-700 hover:border-gray-900"
                        }`}
                      >
                        No limit
                      </button>
                    </div>
                    <input
                      type="number"
                      min="0"
                      value={settings.duration ?? ""}
                      onChange={(e) =>
                        handleSettingChange(
                          "duration",
                          e.target.value ? parseInt(e.target.value) : null
                        )
                      }
                      placeholder="Custom duration..."
                      className="px-4 py-3 bg-white border-2 border-gray-900 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-amber-400 shadow-[2px_2px_0px_0px_rgba(17,24,39,1)]"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-bold text-gray-700">
                      Max Attempts
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={settings.maxAttempts}
                      onChange={(e) =>
                        handleSettingChange(
                          "maxAttempts",
                          parseInt(e.target.value) || 1
                        )
                      }
                      className="px-4 py-3 bg-white border-2 border-gray-900 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-amber-400 shadow-[2px_2px_0px_0px_rgba(17,24,39,1)]"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-bold text-gray-700">
                      Deadline
                    </label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {[
                        { label: "1 Day", days: 1 },
                        { label: "2 Days", days: 2 },
                        { label: "3 Days", days: 3 },
                        { label: "1 Week", days: 7 },
                      ].map((preset) => {
                        const presetDate = new Date();
                        presetDate.setDate(presetDate.getDate() + preset.days);
                        presetDate.setHours(23, 59, 0, 0);
                        const presetValue = presetDate
                          .toISOString()
                          .slice(0, 16);
                        const isSelected =
                          settings.deadline !== "" &&
                          settings.deadline?.slice(0, 10) ===
                            presetValue.slice(0, 10);
                        return (
                          <button
                            key={preset.days}
                            onClick={() =>
                              handleSettingChange("deadline", presetValue)
                            }
                            className={`px-4 py-2 rounded-full border-2 font-bold text-sm transition-all ${
                              isSelected
                                ? "bg-amber-200 border-gray-900 text-gray-900 shadow-[2px_2px_0px_0px_rgba(17,24,39,1)]"
                                : "bg-white border-gray-300 text-gray-700 hover:border-gray-900"
                            }`}
                          >
                            {preset.label}
                          </button>
                        );
                      })}
                      <button
                        onClick={() => handleSettingChange("deadline", "")}
                        className={`px-4 py-2 rounded-full border-2 font-bold text-sm transition-all ${
                          settings.deadline === "" ||
                          settings.deadline === undefined
                            ? "bg-amber-200 border-gray-900 text-gray-900 shadow-[2px_2px_0px_0px_rgba(17,24,39,1)]"
                            : "bg-white border-gray-300 text-gray-700 hover:border-gray-900"
                        }`}
                      >
                        No deadline
                      </button>
                    </div>
                    <input
                      type="datetime-local"
                      value={settings.deadline}
                      onChange={(e) =>
                        handleSettingChange("deadline", e.target.value)
                      }
                      className="px-4 py-3 bg-white border-2 border-gray-900 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-amber-400 shadow-[2px_2px_0px_0px_rgba(17,24,39,1)]"
                    />
                  </div>
                </div>
              </div>

              {/* Quiz Options */}
              <div className="flex flex-col gap-4">
                <h4 className="text-sm font-black text-gray-900 uppercase tracking-wider">
                  Quiz Options
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <ToggleButton
                    label="Shuffle Questions"
                    checked={settings.shuffleQuestions}
                    onChange={(v) => handleSettingChange("shuffleQuestions", v)}
                  />
                  <ToggleButton
                    label="Shuffle Choices"
                    checked={settings.shuffleChoices}
                    onChange={(v) => handleSettingChange("shuffleChoices", v)}
                  />
                  <ToggleButton
                    label="Show Results"
                    checked={settings.showResults}
                    onChange={(v) => handleSettingChange("showResults", v)}
                  />
                  <ToggleButton
                    label="Allow Retake"
                    checked={settings.allowRetake}
                    onChange={(v) => handleSettingChange("allowRetake", v)}
                  />
                </div>
              </div>

              {/* Anti-Cheat */}
              <div className="flex flex-col gap-4">
                <h4 className="text-sm font-black text-gray-900 uppercase tracking-wider">
                  Anti-Cheat
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-2">
                    <ToggleButton
                      label="Prevent Tab Switch"
                      checked={settings.preventTabSwitch}
                      onChange={(v) =>
                        handleSettingChange("preventTabSwitch", v)
                      }
                    />
                    {settings.preventTabSwitch && (
                      <div className="flex items-center gap-2 pl-2">
                        <label className="text-xs font-medium text-gray-600">
                          Max violations:
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="10"
                          value={settings.maxTabSwitches}
                          onChange={(e) =>
                            handleSettingChange(
                              "maxTabSwitches",
                              Math.max(
                                1,
                                Math.min(10, parseInt(e.target.value) || 3)
                              )
                            )
                          }
                          className="w-16 px-2 py-1 bg-white border-2 border-gray-900 rounded-lg font-bold text-center text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 shadow-[2px_2px_0px_0px_rgba(17,24,39,1)]"
                        />
                      </div>
                    )}
                  </div>
                  <ToggleButton
                    label="Prevent Copy/Paste"
                    checked={settings.preventCopyPaste}
                    onChange={(v) => handleSettingChange("preventCopyPaste", v)}
                  />
                  <ToggleButton
                    label="Fullscreen Mode"
                    checked={settings.fullscreenMode}
                    onChange={(v) => handleSettingChange("fullscreenMode", v)}
                  />
                  <ToggleButton
                    label="Disable Right Click"
                    checked={settings.disableRightClick}
                    onChange={(v) =>
                      handleSettingChange("disableRightClick", v)
                    }
                  />
                </div>
              </div>

              {/* Instructions */}
              <div className="bg-amber-100 border-2 border-amber-400 rounded-xl p-4">
                <p className="text-gray-900 font-bold text-sm mb-2">
                  How to Configure Your Quiz
                </p>
                <p className="text-gray-700 text-xs leading-relaxed">
                  Set a clear title and description so students know what to
                  expect. Choose an appropriate duration based on the number and
                  complexity of questions. Use deadline presets for quick
                  scheduling or set a custom date. Enable anti-cheat options for
                  high-stakes assessments to maintain academic integrity during
                  the quiz.
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-3 px-6 py-4 border-t-2 border-gray-900 bg-amber-100">
              <button
                onClick={() => setShowSettingsModal(false)}
                className="px-6 py-3 bg-amber-200 text-gray-900 font-bold rounded-xl border-2 border-gray-900 hover:bg-amber-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="px-6 py-3 bg-amber-400 text-gray-900 font-bold rounded-xl border-2 border-gray-900 shadow-[3px_3px_0px_0px_rgba(17,24,39,1)] hover:shadow-[4px_4px_0px_0px_rgba(17,24,39,1)] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all flex items-center gap-2"
              >
                <span className="material-icons-outlined">check</span> Save
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ============================================================================
// TOGGLE BUTTON COMPONENT
// ============================================================================
function ToggleButton({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}): React.ReactElement {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`flex items-center justify-between p-3 rounded-xl border-2 transition-all ${checked ? "bg-amber-200 text-gray-900 border-gray-900 shadow-[2px_2px_0px_0px_rgba(17,24,39,1)]" : "bg-white text-gray-900 border-gray-300 hover:border-gray-900"}`}
    >
      <span className="font-bold text-sm">{label}</span>
      <div
        className={`w-5 h-5 rounded-md border-2 flex items-center justify-center ${checked ? "bg-amber-400 border-gray-900" : "bg-white border-gray-400"}`}
      >
        {checked && (
          <span className="material-icons-outlined text-gray-900 text-sm">
            check
          </span>
        )}
      </div>
    </button>
  );
}

export default function ComposerPage(): React.ReactNode {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ComposerPageContent />
    </Suspense>
  );
}
