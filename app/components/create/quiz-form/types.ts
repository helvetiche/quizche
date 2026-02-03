export type QuestionType =
  | "multiple_choice"
  | "identification"
  | "true_or_false"
  | "essay"
  | "enumeration"
  | "reflection";

// Question types that support explanations (not essay/reflection/enumeration which are written responses)
export const EXPLANATION_SUPPORTED_TYPES: QuestionType[] = [
  "multiple_choice",
  "identification",
  "true_or_false",
];

export type Question = {
  id: string;
  question: string;
  type: QuestionType;
  choices: string[];
  answer: string;
  imageUrl?: string;
  imageFile?: File;
  imagePreview?: string;
  // Explanation for the correct answer (used for identification, true_or_false)
  explanation?: string;
  // Explanations for each choice in multiple choice (why each is right/wrong)
  choiceExplanations?: string[];
};

export const QUESTION_TYPES: {
  value: QuestionType;
  label: string;
  icon: string;
  color: string;
}[] = [
  {
    value: "multiple_choice",
    label: "Multiple Choice",
    icon: "radio_button_checked",
    color: "bg-blue-400",
  },
  {
    value: "identification",
    label: "Identification",
    icon: "text_fields",
    color: "bg-purple-400",
  },
  {
    value: "true_or_false",
    label: "True / False",
    icon: "toggle_on",
    color: "bg-green-400",
  },
  { value: "essay", label: "Essay", icon: "article", color: "bg-orange-400" },
  {
    value: "enumeration",
    label: "Enumeration",
    icon: "format_list_numbered",
    color: "bg-pink-400",
  },
  {
    value: "reflection",
    label: "Reflection",
    icon: "psychology",
    color: "bg-cyan-400",
  },
];

export type GeneratedQuizData = {
  title: string;
  description: string;
  questions: {
    question: string;
    type: QuestionType;
    choices?: string[];
    answer: string;
    imageUrl?: string;
    explanation?: string;
    choiceExplanations?: string[];
  }[];
};
