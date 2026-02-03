export type QuestionType =
  | "multiple_choice"
  | "identification"
  | "true_or_false"
  | "essay"
  | "enumeration"
  | "reflection";

export type Question = {
  id: string;
  question: string;
  type: QuestionType;
  choices: string[];
  answer: string;
  imageUrl?: string;
  imageFile?: File;
  imagePreview?: string;
  explanation?: string;
  choiceExplanations?: string[];
};

export type QuizSettings = {
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

export type GeneratedQuizData = {
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

export const QUESTION_TYPES: {
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

export const DEFAULT_SETTINGS: QuizSettings = {
  title: "",
  description: "",
  duration: null,
  deadline: "",
  shuffleQuestions: false,
  shuffleChoices: false,
  showResults: true,
  allowRetake: false,
  maxAttempts: 1,
  preventTabSwitch: false,
  maxTabSwitches: 3,
  preventCopyPaste: false,
  fullscreenMode: false,
  webcamProctoring: false,
  disableRightClick: false,
  lockdownBrowser: false,
};

// ============================================================================
// API RESPONSE TYPES
// ============================================================================
export type DraftResponse = {
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

export type QuizResponse = {
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

export type ApiErrorResponse = {
  error?: string;
};
