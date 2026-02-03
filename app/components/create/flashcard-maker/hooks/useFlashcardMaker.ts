/* eslint-disable @typescript-eslint/explicit-function-return-type */
 
 
import { useState, useEffect } from "react";
import { uploadImageToImgbb } from "@/lib/imgbb";
import { apiGet, apiPost, apiPut } from "../../../../lib/api";
import type { Flashcard, GeneratedFlashcardSet } from "../types";

type UseFlashcardMakerProps = {
  onSuccess?: () => void;
  initialData?: GeneratedFlashcardSet;
  flashcardId?: string;
  idToken?: string;
};

export function useFlashcardMaker({
  onSuccess,
  initialData,
  flashcardId,
  idToken,
}: UseFlashcardMakerProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [cards, setCards] = useState<Flashcard[]>([{ front: "", back: "" }]);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [loading, setLoading] = useState(
    flashcardId !== undefined && initialData === undefined
  );
  const [error, setError] = useState<string | null>(null);
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [coverImagePreview, setCoverImagePreview] = useState<string | null>(
    null
  );
  const [coverImageUrl, setCoverImageUrl] = useState<string | undefined>(
    undefined
  );
  const [imagePreviewUrls, setImagePreviewUrls] = useState<
    Record<string, { front?: string; back?: string }>
  >({});
  const [showShareModal, setShowShareModal] = useState(false);

  // Populate form with initial data or load from API
  useEffect(() => {
    if (initialData !== undefined) {
      setTitle(initialData.title ?? "");
      setDescription(initialData.description ?? "");
      if (initialData.cards.length > 0) {
        setCards(
          initialData.cards.map((card) => ({
            front: card.front ?? "",
            back: card.back ?? "",
          }))
        );
      }
      return;
    }

    const fetchFlashcardSet = async (): Promise<void> => {
      if (flashcardId === undefined || idToken === undefined) {
        return;
      }

      try {
        const response = await apiGet(`/api/flashcards/${flashcardId}`, {
          idToken,
        });

        const data = (await response.json()) as {
          error?: string;
          flashcardSet?: {
            title?: string;
            description?: string;
            coverImageUrl?: string;
            isPublic?: boolean;
            tags?: string[];
            cards?: {
              front?: string;
              back?: string;
              frontImageUrl?: string;
              backImageUrl?: string;
            }[];
          };
        };

        if (response.ok === false) {
          const errorData = data as { error?: string };
          throw new Error(errorData.error ?? "Failed to fetch flashcard set");
        }

        const flashcardSetData = data as {
          flashcardSet: {
            title?: string;
            description?: string;
            coverImageUrl?: string;
            isPublic?: boolean;
            tags?: string[];
            cards?: {
              front?: string;
              back?: string;
              frontImageUrl?: string;
              backImageUrl?: string;
            }[];
          };
        };
        const flashcardSet = flashcardSetData.flashcardSet;
        setTitle(flashcardSet.title ?? "");
        setDescription(flashcardSet.description ?? "");
        setCoverImageUrl(flashcardSet.coverImageUrl ?? undefined);
        setTags(flashcardSet.tags ?? []);
        setIsPublic(flashcardSet.isPublic ?? false);

        const flashcardCards = flashcardSet.cards;
        if (flashcardCards !== undefined && flashcardCards.length > 0) {
          setCards(
            flashcardCards.map((card) => ({
              front: card.front ?? "",
              back: card.back ?? "",
              frontImageUrl: card.frontImageUrl ?? undefined,
              backImageUrl: card.backImageUrl ?? undefined,
            }))
          );
        }
      } catch (err) {
        console.error("Error fetching flashcard set:", err);
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load flashcard set. Please try again."
        );
      } finally {
        setLoading(false);
      }
    };

    if (flashcardId !== undefined && idToken !== undefined) {
      void fetchFlashcardSet();
    }
  }, [initialData, flashcardId, idToken]);

  // Cleanup preview URLs on unmount
  useEffect(() => {
    return () => {
      Object.values(imagePreviewUrls).forEach((urls) => {
        if (urls.front !== undefined && urls.front !== "") {
          URL.revokeObjectURL(urls.front);
        }
        if (urls.back !== undefined && urls.back !== "") {
          URL.revokeObjectURL(urls.back);
        }
      });
      if (coverImagePreview !== null && coverImagePreview !== "") {
        URL.revokeObjectURL(coverImagePreview);
      }
    };
  }, [imagePreviewUrls, coverImagePreview]);

  const handleAddCard = (): void => {
    setCards([...cards, { front: "", back: "" }]);
  };

  const handleRemoveCard = (index: number): void => {
    if (cards.length > 1) {
      setCards(cards.filter((_, i) => i !== index));
    }
  };

  const handleCardChange = (
    index: number,
    field: "front" | "back",
    value: string
  ): void => {
    const updatedCards = [...cards];
    updatedCards[index][field] = value;
    setCards(updatedCards);
  };

  const handleImageSelect = (
    cardIndex: number,
    side: "front" | "back",
    file: File
  ): void => {
    if (file.type.startsWith("image/") === false) {
      console.error("Please select an image file");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      console.error("Image size must be less than 10MB");
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    const cardId = `card-${cardIndex}`;

    setImagePreviewUrls((prev) => ({
      ...prev,
      [cardId]: {
        ...prev[cardId],
        [side]: previewUrl,
      },
    }));

    const updatedCards = [...cards];
    if (side === "front") {
      updatedCards[cardIndex] = {
        ...updatedCards[cardIndex],
        frontImageFile: file,
        frontImagePreview: previewUrl,
      };
    } else {
      updatedCards[cardIndex] = {
        ...updatedCards[cardIndex],
        backImageFile: file,
        backImagePreview: previewUrl,
      };
    }
    setCards(updatedCards);
  };

  const handleRemoveImage = (
    cardIndex: number,
    side: "front" | "back"
  ): void => {
    const cardId = `card-${cardIndex}`;
    const previewUrl = imagePreviewUrls[cardId]?.[side];

    if (previewUrl !== undefined && previewUrl !== "") {
      URL.revokeObjectURL(previewUrl);
      setImagePreviewUrls((prev) => {
        const newUrls = { ...prev };
        if (newUrls[cardId] !== undefined) {
          delete newUrls[cardId][side];
          if (
            (newUrls[cardId].front === undefined ||
              newUrls[cardId].front === "") &&
            (newUrls[cardId].back === undefined || newUrls[cardId].back === "")
          ) {
            delete newUrls[cardId];
          }
        }
        return newUrls;
      });
    }

    const updatedCards = [...cards];
    if (side === "front") {
      updatedCards[cardIndex] = {
        ...updatedCards[cardIndex],
        frontImageFile: undefined,
        frontImagePreview: undefined,
        frontImageUrl: undefined,
      };
    } else {
      updatedCards[cardIndex] = {
        ...updatedCards[cardIndex],
        backImageFile: undefined,
        backImagePreview: undefined,
        backImageUrl: undefined,
      };
    }
    setCards(updatedCards);
  };

  const handleAddTag = (): void => {
    const trimmedTag = tagInput.trim();
    if (trimmedTag.length === 0) return;
    if (tags.length >= 4) return;
    if (tags.includes(trimmedTag)) {
      setTagInput("");
      return;
    }
    setTags([...tags, trimmedTag]);
    setTagInput("");
  };

  const handleRemoveTag = (tagToRemove: string): void => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  const handleSave = async (): Promise<void> => {
    if (idToken === undefined) {
      setError("You must be logged in to save flashcards.");
      return;
    }

    if (title.trim().length === 0) {
      setError("Please enter a title for your flashcard set.");
      return;
    }

    const validCards = cards.filter(
      (card) =>
        card.front.trim().length > 0 && card.back.trim().length > 0
    );

    if (validCards.length === 0) {
      setError("Please add at least one card with both front and back text.");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Upload cover image if exists
      let finalCoverImageUrl = coverImageUrl;
      if (coverImageFile !== null) {
        try {
          finalCoverImageUrl = await uploadImageToImgbb(
            coverImageFile,
            idToken
          );
        } catch (error) {
          console.error("Error uploading cover image:", error);
          throw new Error(
            "Failed to upload cover image. Please try again or remove the image."
          );
        }
      }

      // Upload card images
      const cardsWithImages = await Promise.all(
        validCards.map(async (card, index) => {
          let frontImageUrl = card.frontImageUrl;
          let backImageUrl = card.backImageUrl;

          if (card.frontImageFile !== undefined) {
            try {
              frontImageUrl = await uploadImageToImgbb(
                card.frontImageFile,
                idToken
              );
              // Clean up preview URL
              if (
                card.frontImagePreview !== undefined &&
                card.frontImagePreview !== null &&
                card.frontImagePreview !== ""
              ) {
                URL.revokeObjectURL(card.frontImagePreview);
              }
            } catch (error) {
              console.error(
                `Error uploading front image for card ${index}:`,
                error
              );
              throw new Error(
                `Failed to upload front image for card ${index + 1}. ${error instanceof Error ? error.message : "Please try again."}`
              );
            }
          }

          if (card.backImageFile !== undefined) {
            try {
              backImageUrl = await uploadImageToImgbb(
                card.backImageFile,
                idToken
              );
              // Clean up preview URL
              if (
                card.backImagePreview !== undefined &&
                card.backImagePreview !== null &&
                card.backImagePreview !== ""
              ) {
                URL.revokeObjectURL(card.backImagePreview);
              }
            } catch (error) {
              console.error(
                `Error uploading back image for card ${index}:`,
                error
              );
              throw new Error(
                `Failed to upload back image for card ${index + 1}. ${error instanceof Error ? error.message : "Please try again."}`
              );
            }
          }

          return {
            front: card.front.trim(),
            back: card.back.trim(),
            frontImageUrl,
            backImageUrl,
          };
        })
      );

      const flashcardData = {
        title: title.trim(),
        description: description.trim(),
        cards: cardsWithImages,
        isPublic,
        coverImageUrl: finalCoverImageUrl,
        tags,
      };

      const url =
        flashcardId !== undefined
          ? `/api/flashcards/${flashcardId}`
          : "/api/flashcards";
      const response =
        flashcardId !== undefined
          ? await apiPut(url, {
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(flashcardData),
              idToken,
            })
          : await apiPost(url, {
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(flashcardData),
              idToken,
            });

      const responseData = (await response.json()) as {
        id?: string;
        error?: string;
      };

      if (response.ok === false) {
        throw new Error(responseData.error ?? "Failed to save flashcard set");
      }

      if (flashcardId === undefined) {
        // Created new flashcard set
        if (onSuccess !== undefined) {
          onSuccess();
        } else {
          window.location.href = `/student/flashcards/${responseData.id}/edit`;
        }
        return;
      }

      // Clean up all remaining preview URLs
      Object.values(imagePreviewUrls).forEach((urls) => {
        if (
          urls.front !== undefined &&
          urls.front !== null &&
          urls.front !== ""
        )
          URL.revokeObjectURL(urls.front);
        if (urls.back !== undefined && urls.back !== null && urls.back !== "")
          URL.revokeObjectURL(urls.back);
      });

      // Reset form
      setTitle("");
      setDescription("");
      setCards([{ front: "", back: "" }]);
      setTags([]);
      setTagInput("");
      setIsPublic(false);
      setError(null);
      setImagePreviewUrls({});
      setCoverImageFile(null);
      setCoverImagePreview(null);
      setCoverImageUrl(undefined);

      if (onSuccess !== undefined && onSuccess !== null) {
        onSuccess();
      }
    } catch (err) {
      console.error("Error creating flashcard set:", err);
      setError(
        err instanceof Error
          ? err.message
          : "An unexpected error occurred. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return {
    title,
    setTitle,
    description,
    setDescription,
    cards,
    tags,
    tagInput,
    setTagInput,
    isPublic,
    setIsPublic,
    loading,
    error,
    coverImageFile,
    setCoverImageFile,
    coverImagePreview,
    setCoverImagePreview,
    coverImageUrl,
    setCoverImageUrl,
    showShareModal,
    setShowShareModal,
    handleAddCard,
    handleRemoveCard,
    handleCardChange,
    handleImageSelect,
    handleRemoveImage,
    handleAddTag,
    handleRemoveTag,
    handleSave,
  };
}
