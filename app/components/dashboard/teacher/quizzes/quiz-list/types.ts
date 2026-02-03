export type Quiz = {
  id: string;
  title: string;
  description: string;
  totalQuestions: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  deadline?: string;
  duration?: number | null;
};

export type Draft = {
  id: string;
  title: string;
  description: string;
  totalQuestions: number;
  createdAt: string;
  updatedAt: string;
};

export type FilterOption = {
  id: string;
  label: string;
  icon: string;
};
