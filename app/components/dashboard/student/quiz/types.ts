export type Question = {
  question: string;
  type: string;
  choices?: string[];
  imageUrl?: string;
};

export type Quiz = {
  id: string;
  title: string;
  description?: string;
  questions: Question[];
  totalQuestions: number;
  duration?: number;
  allowRetake: boolean;
  showResults: boolean;
  antiCheat?: {
    enabled?: boolean;
    tabChangeLimit?: number;
    timeAwayThreshold?: number;
    autoDisqualifyOnRefresh?: boolean;
    autoSubmitOnDisqualification?: boolean;
  };
};

export type User = {
  uid: string;
  email: string;
};
