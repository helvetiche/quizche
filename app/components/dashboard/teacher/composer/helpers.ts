import { uploadImageToImgbb } from "@/lib/imgbb";
import type { GeneratedQuizData, Question, QuestionType } from "./types";

export const createQuestion = (
  type: QuestionType = "multiple_choice"
): Question => ({
  id: Date.now().toString(),
  question: "",
  type,
  choices: type === "multiple_choice" ? ["", "", "", ""] : [],
  answer: "",
  explanation: "",
  choiceExplanations: type === "multiple_choice" ? ["", "", "", ""] : [],
});

export const mapGeneratedQuestions = (data: GeneratedQuizData): Question[] =>
  data.questions.map((q, index) => ({
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
  }));

export const mapDraftQuestions = (
  questions:
    | {
        id?: string;
        question?: string;
        type?: QuestionType;
        choices?: string[];
        answer?: string;
        imageUrl?: string;
        explanation?: string;
        choiceExplanations?: string[];
      }[]
    | undefined
): Question[] =>
  (questions ?? []).map((q, index: number) => ({
    id: q.id ?? `${Date.now()}-${index}`,
    question: q.question ?? "",
    type: q.type ?? "multiple_choice",
    choices:
      q.choices ?? (q.type === "multiple_choice" ? ["", "", "", ""] : []),
    answer: q.answer ?? "",
    imageUrl: q.imageUrl,
    explanation: q.explanation ?? "",
    choiceExplanations:
      q.type === "multiple_choice"
        ? (q.choiceExplanations ??
          (q.choices ?? ["", "", "", ""]).map(() => ""))
        : [],
  }));

export const mapQuizQuestions = (
  questions:
    | {
        question?: string;
        type?: QuestionType;
        choices?: string[];
        answer?: string;
        imageUrl?: string;
        explanation?: string;
        choiceExplanations?: string[];
      }[]
    | undefined
): Question[] =>
  (questions ?? []).map((q, index: number) => ({
    id: `${Date.now()}-${index}`,
    question: q.question ?? "",
    type: q.type ?? "multiple_choice",
    choices:
      q.choices ?? (q.type === "multiple_choice" ? ["", "", "", ""] : []),
    answer: q.answer ?? "",
    imageUrl: q.imageUrl,
    explanation: q.explanation ?? "",
    choiceExplanations:
      q.type === "multiple_choice"
        ? (q.choiceExplanations ??
          (q.choices ?? ["", "", "", ""]).map(() => ""))
        : [],
  }));

export const getDuplicateChoicesHelper = (
  questionId: string,
  questions: Question[]
): number[] => {
  const question = questions.find((q) => q.id === questionId);
  if (!question?.choices || question.type !== "multiple_choice") return [];
  const duplicates: number[] = [];
  const choiceMap = new Map<string, number[]>();
  question.choices.forEach((choice, index) => {
    const trimmed = choice.trim().toLowerCase();
    if (trimmed.length > 0) {
      if (!choiceMap.has(trimmed)) choiceMap.set(trimmed, []);
      choiceMap.get(trimmed)?.push(index);
    }
  });
  choiceMap.forEach((indices) => {
    if (indices.length > 1) duplicates.push(...indices);
  });
  return duplicates;
};

export const buildQuestionPayload = async (
  q: Question,
  idToken: string
): Promise<{
  question: string;
  type: QuestionType;
  choices?: string[];
  answer: string;
  imageUrl?: string;
  explanation?: string;
  choiceExplanations?: string[];
}> => {
  let imageUrl = q.imageUrl;
  if (q.imageFile !== undefined) {
    imageUrl = await uploadImageToImgbb(q.imageFile, idToken);
  }
  const payload: {
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
            .filter((c: string) => c.trim().length > 0)
            .map((c: string) => c.trim())
        : undefined,
    answer: q.answer.trim(),
    imageUrl,
  };
  if (["multiple_choice", "identification", "true_or_false"].includes(q.type)) {
    if (q.type === "multiple_choice") {
      const validChoiceIndices = q.choices
        .map((c: string, i: number) => (c.trim().length > 0 ? i : -1))
        .filter((i: number) => i !== -1);
      payload.choiceExplanations = validChoiceIndices.map((i: number) =>
        (q.choiceExplanations?.[i] ?? "").trim()
      );
    } else {
      payload.explanation = (q.explanation ?? "").trim();
    }
  }
  return payload;
};
