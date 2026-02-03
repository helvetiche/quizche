export type Question = {
  question: string;
  type: string;
  choices?: string[];
  answer: string;
  imageUrl?: string;
  explanation?: string;
  choiceExplanations?: string[];
};

export type Quiz = {
  id: string;
  title: string;
  description: string;
  questions: Question[];
  totalQuestions: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  duration?: number;
  deadline?: string;
  allowRetake?: boolean;
  showResults?: boolean;
  shuffleQuestions?: boolean;
  shuffleChoices?: boolean;
  maxAttempts?: number;
  preventCopyPaste?: boolean;
  fullscreenMode?: boolean;
  disableRightClick?: boolean;
  antiCheat?: {
    enabled?: boolean;
    tabChangeLimit?: number;
    autoSubmitOnDisqualification?: boolean;
  };
};

export type QuizAttempt = {
  id: string;
  userId: string;
  studentEmail: string;
  studentName: string;
  answers: Record<number, string>;
  score: number;
  totalQuestions: number;
  percentage: number;
  completedAt: string;
  timeSpent: number;
};
