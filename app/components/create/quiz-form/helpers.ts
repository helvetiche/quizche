import {
  EXPLANATION_SUPPORTED_TYPES,
  type GeneratedQuizData,
  type Question,
  type QuestionType,
} from "./types";

export type DraftResponse = {
  draft: {
    title?: string;
    description?: string;
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
  };
};

export type QuizResponse = {
  quiz: {
    title?: string;
    description?: string;
    isActive?: boolean;
    questions?: {
      question?: string;
      type?: QuestionType;
      choices?: string[];
      answer?: string;
      imageUrl?: string;
      explanation?: string;
      choiceExplanations?: string[];
    }[];
  };
};

export const createDefaultQuestion = (): Question => ({
  id: Date.now().toString(),
  question: "",
  type: "multiple_choice",
  choices: ["", "", "", ""],
  answer: "",
  explanation: "",
  choiceExplanations: ["", "", "", ""],
});

export const mapGeneratedQuestions = (data: GeneratedQuizData): Question[] =>
  data.questions.map((q, index) => ({
    id: `${Date.now()}-${index}`,
    question: q.question,
    type: q.type,
    choices:
      q.type === "multiple_choice"
        ? (q.choices ?? []).length > 0
          ? q.choices!
          : ["", "", "", ""]
        : [],
    answer: q.answer,
    imageUrl: q.imageUrl,
    explanation: q.explanation ?? "",
    choiceExplanations:
      q.type === "multiple_choice"
        ? (q.choiceExplanations ?? []).length > 0
          ? q.choiceExplanations!
          : (q.choices ?? ["", "", "", ""]).map(() => "")
        : [],
  }));

export const mapDraftQuestions = (
  questions: DraftResponse["draft"]["questions"]
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
        ? q.choiceExplanations ??
          (q.choices ?? ["", "", "", ""]).map(() => "")
        : [],
  }));

export const mapQuizQuestions = (
  questions: QuizResponse["quiz"]["questions"]
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
        ? q.choiceExplanations ??
          (q.choices ?? ["", "", "", ""]).map(() => "")
        : [],
  }));

export const getDuplicateChoices = (question: Question): number[] => {
  if (!question.choices || question.type !== "multiple_choice") return [];
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

export const hasDuplicateChoices = (question: Question): boolean =>
  getDuplicateChoices(question).length > 0;

export type ValidationResult = {
  isValid: boolean;
  errorIndex?: number;
  errorMessage?: string;
};

export const validateQuizForm = (
  questions: Question[],
  title: string
): ValidationResult => {
  if (!title.trim()) {
    return {
      isValid: false,
      errorMessage: "Please enter a quiz title in Quiz Settings",
    };
  }

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    if (!q.question.trim()) {
      return {
        isValid: false,
        errorIndex: i,
        errorMessage: `Please enter a question for question ${i + 1}`,
      };
    }
    if (q.type === "multiple_choice") {
      const validChoices = q.choices.filter((c) => c.trim().length > 0);
      if (validChoices.length < 2) {
        return {
          isValid: false,
          errorIndex: i,
          errorMessage: `Question ${i + 1}: Multiple choice questions must have at least 2 choices`,
        };
      }
      if (hasDuplicateChoices(q)) {
        return {
          isValid: false,
          errorIndex: i,
          errorMessage: `Question ${i + 1}: Duplicate choices are not allowed.`,
        };
      }
      if (!q.answer.trim()) {
        return {
          isValid: false,
          errorIndex: i,
          errorMessage: `Question ${i + 1}: Please enter the correct answer`,
        };
      }
      if (!validChoices.includes(q.answer.trim())) {
        return {
          isValid: false,
          errorIndex: i,
          errorMessage: `Question ${i + 1}: The answer must be one of the choices`,
        };
      }
    } else if (q.type === "true_or_false") {
      if (q.answer !== "true" && q.answer !== "false") {
        return {
          isValid: false,
          errorIndex: i,
          errorMessage: `Question ${i + 1}: Please select true or false as the answer`,
        };
      }
    } else {
      if (!q.answer.trim()) {
        return {
          isValid: false,
          errorIndex: i,
          errorMessage: `Question ${i + 1}: Please enter the answer`,
        };
      }
    }
  }
  return { isValid: true };
};

export const prepareDraftData = (
  draftId: string | undefined,
  title: string,
  description: string,
  questions: Question[]
) => {
  return {
    draftId: draftId,
    title: title.trim(),
    description: description.trim(),
    questions: questions.map((q) => ({
      id: q.id,
      question: q.question.trim(),
      type: q.type,
      choices:
        q.type === "multiple_choice"
          ? q.choices.filter((c) => c.trim().length > 0).map((c) => c.trim())
          : [],
      answer: q.answer.trim(),
      imageUrl: q.imageUrl,
      explanation: EXPLANATION_SUPPORTED_TYPES.includes(q.type)
        ? (q.explanation ?? "").trim()
        : undefined,
      choiceExplanations:
        q.type === "multiple_choice"
          ? (q.choiceExplanations ?? []).map((e) => (e ?? "").trim())
          : undefined,
    })),
  };
};
