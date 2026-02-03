export type Flashcard = {
  front: string;
  back: string;
  frontImageUrl?: string;
  backImageUrl?: string;
  frontImageFile?: File;
  backImageFile?: File;
  frontImagePreview?: string;
  backImagePreview?: string;
};

export type GeneratedFlashcardSet = {
  title: string;
  description: string;
  cards: {
    front: string;
    back: string;
  }[];
};
