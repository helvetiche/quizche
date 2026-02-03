export type Card = {
  front: string;
  back: string;
  frontImageUrl?: string;
  backImageUrl?: string;
};

export type Comment = {
  id: string;
  userId: string;
  userName: string;
  userPhotoUrl?: string | null;
  content: string;
  createdAt: string;
  likes: string[];
  replies: Comment[];
};

export type FlashcardSet = {
  id: string;
  title: string;
  description?: string;
  totalCards: number;
  isPublic: boolean;
  coverImageUrl?: string;
  createdAt: string;
  updatedAt: string;
  isShared?: boolean;
  sharedBy?: string;
  sharedByPhotoUrl?: string;
  sharedBySchool?: string;
  sharedByUserId?: string;
  tags?: string[];
  comments?: Comment[];
  ratings?: Record<string, number>;
  averageRating?: number;
  totalRatings?: number;
  cards?: Card[];
};
