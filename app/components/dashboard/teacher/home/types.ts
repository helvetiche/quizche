export type Quiz = {
  id: string;
  title: string;
  description?: string;
  totalQuestions: number;
  isActive: boolean;
  createdAt: string;
  deadline?: string;
  duration?: number | null;
};

export type FilterOption = {
  id: string;
  label: string;
  icon: string;
};
