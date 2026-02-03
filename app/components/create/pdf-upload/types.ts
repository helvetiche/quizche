import { type GeneratedQuizData } from "../quiz-form/types";

export type Difficulty = "easy" | "medium" | "hard";

export type PDFUploadModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (quiz: GeneratedQuizData) => void;
  onEdit: (quiz: GeneratedQuizData) => void;
  idToken: string;
};

export type Step = 1 | 2 | 3 | 4;
