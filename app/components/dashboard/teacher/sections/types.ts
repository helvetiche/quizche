export type Student = {
  id: string;
  email: string;
  displayName?: string;
  role: string;
};

export type Section = {
  id: string;
  name: string;
  description?: string;
  teacherId: string;
  students: Student[];
  createdAt: string;
  updatedAt: string;
};
