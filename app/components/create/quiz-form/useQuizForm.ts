/* eslint-disable @typescript-eslint/explicit-function-return-type */
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { uploadImageToImgbb } from "@/lib/imgbb";
import {
  EXPLANATION_SUPPORTED_TYPES,
  type GeneratedQuizData,
  type Question,
  type QuestionType,
} from "./types";
import {
  createDefaultQuestion,
  mapGeneratedQuestions,
  mapDraftQuestions,
  mapQuizQuestions,
  prepareDraftData,
  validateQuizForm,
  getDuplicateChoices as getDuplicateChoicesHelper,
  type DraftResponse,
  type QuizResponse,
} from "./helpers";

type ApiErrorResponse = {
  error?: string;
};

type UseQuizFormParams = {
  idToken: string;
  quizId?: string;
  draftId?: string;
  initialData?: GeneratedQuizData;
  title?: string;
  description?: string;
  onDraftSaved?: (draftId: string) => void;
};

export const useQuizForm = ({
  idToken,
  quizId,
  draftId: initialDraftId,
  initialData,
  title: propTitle,
  description: propDescription,
  onDraftSaved,
}: UseQuizFormParams) => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [loadingQuiz, setLoadingQuiz] = useState(
    quizId !== undefined || initialDraftId !== undefined
  );
  const [draftId, setDraftId] = useState<string | undefined>(initialDraftId);
  const [title, setTitle] = useState(initialData?.title ?? "");
  const [description, setDescription] = useState(
    initialData?.description ?? ""
  );
  const [isActive, setIsActive] = useState(true);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [questions, setQuestions] = useState<Question[]>(
    initialData ? mapGeneratedQuestions(initialData) : [createDefaultQuestion()]
  );
  const [imagePreviewUrls, setImagePreviewUrls] = useState<
    Record<string, string>
  >({});
  const [showExplanations, setShowExplanations] = useState(false);

  const currentQuestion = questions[currentQuestionIndex];

  useEffect(() => {
    if (initialData !== undefined) {
      setTitle(initialData.title);
      setDescription(initialData.description ?? "");
      setQuestions(mapGeneratedQuestions(initialData));
      setCurrentQuestionIndex(0);
      return;
    }
    const fetchQuizOrDraft = async (): Promise<void> => {
      if (quizId === undefined && initialDraftId === undefined) return;
      try {
        setLoadingQuiz(true);
        const { apiGet } = await import("../../../lib/api");

        if (initialDraftId !== undefined && initialDraftId !== null) {
          const response = await apiGet(
            `/api/quizzes/drafts/${initialDraftId}`,
            { idToken }
          );
          const data = (await response.json()) as
            | DraftResponse
            | ApiErrorResponse;
          if (!response.ok) {
            const errorData = data as ApiErrorResponse;
            throw new Error(errorData.error ?? "Failed to fetch draft");
          }
          const draftData = data as DraftResponse;
          const draft = draftData.draft;
          setTitle(draft.title ?? "");
          setDescription(draft.description ?? "");
          setDraftId(initialDraftId);
          const loadedQuestions = mapDraftQuestions(draft.questions);
          setQuestions(
            loadedQuestions.length > 0
              ? loadedQuestions
              : [createDefaultQuestion()]
          );
          setCurrentQuestionIndex(0);
        } else if (quizId !== undefined && quizId !== null) {
          const response = await apiGet(`/api/quizzes/${quizId}`, { idToken });
          const data = (await response.json()) as
            | QuizResponse
            | ApiErrorResponse;
          if (!response.ok) {
            const errorData = data as ApiErrorResponse;
            throw new Error(errorData.error ?? "Failed to fetch quiz");
          }
          const quizData = data as QuizResponse;
          const quiz = quizData.quiz;
          setTitle(quiz.title ?? "");
          setDescription(quiz.description ?? "");
          setIsActive(quiz.isActive ?? true);
          const loadedQuestions = mapQuizQuestions(quiz.questions);
          setQuestions(
            loadedQuestions.length > 0
              ? loadedQuestions
              : [createDefaultQuestion()]
          );
          setCurrentQuestionIndex(0);
        }
      } catch (err) {
        console.error("Error fetching quiz/draft:", err);
        console.error(
          err instanceof Error ? err.message : "Failed to load quiz/draft"
        );
      } finally {
        setLoadingQuiz(false);
      }
    };
    void fetchQuizOrDraft();
  }, [quizId, initialDraftId, idToken, initialData]);

  useEffect(() => {
    return () => {
      Object.values(imagePreviewUrls).forEach((url) =>
        URL.revokeObjectURL(url)
      );
    };
  }, [imagePreviewUrls]);

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
  };

  const handleDuplicateQuestion = (): void => {
    if (!currentQuestion) return;
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

  const handleImageSelect = (questionId: string, file: File): void => {
    if (!file.type.startsWith("image/")) {
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

  const handleRemoveImage = (questionId: string): void => {
    const previewUrl = imagePreviewUrls[questionId];
    if (previewUrl !== undefined && previewUrl !== null) {
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

  const handleRemoveQuestion = (id: string): void => {
    if (questions.length === 1) {
      console.error("You must have at least one question");
      return;
    }
    const questionIndex = questions.findIndex((q) => q.id === id);
    const newQuestions = questions.filter((q) => q.id !== id);
    setQuestions(newQuestions);
    if (currentQuestionIndex >= newQuestions.length)
      setCurrentQuestionIndex(newQuestions.length - 1);
    else if (questionIndex < currentQuestionIndex)
      setCurrentQuestionIndex(currentQuestionIndex - 1);
  };

  const handleQuestionChange = (
    id: string,
    field: keyof Question,
    value: Question[keyof Question]
  ) => {
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
            if (!EXPLANATION_SUPPORTED_TYPES.includes(newType)) {
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
  ) => {
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
      questions.map((q) =>
        q.id === questionId
          ? {
              ...q,
              choices: [...q.choices, ""],
              choiceExplanations: [
                ...(q.choiceExplanations ?? ([] as never[])),
                "",
              ],
            }
          : q
      )
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

  const handleChoiceExplanationChange = (
    questionId: string,
    choiceIndex: number,
    value: string
  ) => {
    setQuestions(
      questions.map((q) => {
        if (q.id === questionId) {
          const newExplanations = [
            ...(q.choiceExplanations || q.choices.map(() => "")),
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

  const getDuplicateChoices = (questionId: string): number[] => {
    const question = questions.find((q) => q.id === questionId);
    if (!question) return [];
    return getDuplicateChoicesHelper(question);
  };

  const hasDuplicateChoices = (questionId: string): boolean =>
    getDuplicateChoices(questionId).length > 0;

  const validateForm = (): boolean => {
    const displayTitle = propTitle || title;
    const result = validateQuizForm(questions, displayTitle);
    if (!result.isValid) {
      if (result.errorMessage) console.error(result.errorMessage);
      if (result.errorIndex !== undefined)
        setCurrentQuestionIndex(result.errorIndex);
      return false;
    }
    return true;
  };

  const handleSaveAsDraft = async (): Promise<void> => {
    if (!idToken) {
      console.error("Authentication required. Please refresh the page.");
      return;
    }
    setSavingDraft(true);
    try {
      const displayTitle = propTitle ?? title;
      const displayDescription = propDescription ?? description;
      const draftData = prepareDraftData(
        draftId,
        displayTitle,
        displayDescription,
        questions
      );

      const { apiPost } = await import("../../../lib/api");
      const response = await apiPost("/api/quizzes/drafts", {
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draftData),
        idToken,
      });
      const data = (await response.json()) as { error?: string; id?: string };
      if (!response.ok) throw new Error(data.error ?? "Failed to save draft");
      if (!draftId && data.id) {
        setDraftId(data.id);
        onDraftSaved?.(data.id);
      }
      console.error("Draft saved successfully");
    } catch (error) {
      console.error("Error saving draft:", error);
      console.error(
        error instanceof Error
          ? error.message
          : "Failed to save draft. Please try again."
      );
    } finally {
      setSavingDraft(false);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!validateForm()) return;
    if (!idToken) {
      console.error("Authentication required. Please refresh the page.");
      return;
    }
    setLoading(true);
    try {
      const questionsWithImages = await Promise.all(
        questions.map(async (q) => {
          let imageUrl = q.imageUrl;
          if (q.imageFile !== undefined) {
            try {
              imageUrl = await uploadImageToImgbb(q.imageFile, idToken);
              if (q.imagePreview !== undefined) {
                URL.revokeObjectURL(q.imagePreview);
                setImagePreviewUrls((prev) => {
                  const newUrls = { ...prev };
                  delete newUrls[q.id];
                  return newUrls;
                });
              }
            } catch (error) {
              throw new Error(
                `Failed to upload image for question. ${error instanceof Error ? error.message : "Please try again."}`
              );
            }
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
                ? q.choices
                    .filter((c) => c.trim().length > 0)
                    .map((c) => c.trim())
                : undefined,
            answer: q.answer.trim(),
            imageUrl,
          };
          if (EXPLANATION_SUPPORTED_TYPES.includes(q.type)) {
            if (q.type === "multiple_choice") {
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
      const displayTitle = propTitle || title;
      const displayDescription = propDescription || description;
      const quizData = {
        title: displayTitle.trim(),
        description: displayDescription.trim(),
        isActive,
        questions: questionsWithImages,
      };
      const { apiPost, apiPut } = await import("../../../lib/api");
      const url = quizId ? `/api/quizzes/${quizId}` : "/api/quizzes";
      const response = quizId
        ? await apiPut(url, {
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(quizData),
            idToken,
          })
        : await apiPost(url, {
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(quizData),
            idToken,
          });
      const data = await response.json();
      if (!response.ok)
        throw new Error(
          data.error || `Failed to ${quizId ? "update" : "create"} quiz`
        );
      console.error(`Quiz ${quizId ? "updated" : "created"} successfully`);
      router.push(quizId ? `/teacher/quizzes/${quizId}` : "/teacher/quizzes");
    } catch (error) {
      console.error(`Error ${quizId ? "updating" : "creating"} quiz:`, error);
      console.error(
        error instanceof Error
          ? error.message
          : `Failed to ${quizId ? "update" : "create"} quiz. Please try again.`
      );
    } finally {
      setLoading(false);
    }
  };

  const duplicateIndices = currentQuestion
    ? getDuplicateChoices(currentQuestion.id)
    : [];

  return {
    loading,
    savingDraft,
    loadingQuiz,
    title,
    description,
    isActive,
    currentQuestionIndex,
    sidebarCollapsed,
    questions,
    showExplanations,
    currentQuestion,
    duplicateIndices,
    hasDuplicateChoices,
    setSidebarCollapsed,
    setCurrentQuestionIndex,
    setShowExplanations,
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
    handleSaveAsDraft,
    handleSubmit,
  };
};
