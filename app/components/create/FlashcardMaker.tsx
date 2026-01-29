/* eslint-disable @typescript-eslint/strict-boolean-expressions, @typescript-eslint/no-unnecessary-condition, @typescript-eslint/prefer-nullish-coalescing, @typescript-eslint/explicit-function-return-type */
"use client";

import { useState, useEffect } from "react";
import { getAuth } from "firebase/auth";
import app from "@/lib/firebase";
import { uploadImageToImgbb } from "@/lib/imgbb";
import Image from "next/image";
import ShareFlashcardModal from "../flashcards/ShareFlashcardModal";

type Flashcard = {
  front: string;
  back: string;
  frontImageUrl?: string;
  backImageUrl?: string;
  frontImageFile?: File;
  backImageFile?: File;
  frontImagePreview?: string;
  backImagePreview?: string;
};

type GeneratedFlashcardSet = {
  title: string;
  description: string;
  cards: {
    front: string;
    back: string;
  }[];
};

type FlashcardMakerProps = {
  onSuccess?: () => void;
  initialData?: GeneratedFlashcardSet;
  flashcardId?: string;
  idToken?: string;
};

export default function FlashcardMaker({
  onSuccess,
  initialData,
  flashcardId,
  idToken,
}: FlashcardMakerProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [cards, setCards] = useState<Flashcard[]>([{ front: "", back: "" }]);
  const [isPublic, setIsPublic] = useState(false);
  const [loading, setLoading] = useState(false);
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
        const { apiGet } = await import("../../lib/api");
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
        setCoverImageUrl(flashcardSet.coverImageUrl);
        setIsPublic(flashcardSet.isPublic ?? false);

        const flashcardCards = flashcardSet.cards;
        if (flashcardCards !== undefined && flashcardCards.length > 0) {
          setCards(
            flashcardCards.map((card) => ({
              front: card.front ?? "",
              back: card.back ?? "",
              frontImageUrl: card.frontImageUrl,
              backImageUrl: card.backImageUrl,
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
    const previewUrl = imagePreviewUrls[cardId][side];

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

  const handleSubmit = async (): Promise<void> => {
    setError(null);

    if (title.trim().length === 0) {
      setError("Please enter a title for your flashcard set");
      return;
    }

    const validCards = cards.filter(
      (card) => card.front.trim().length > 0 && card.back.trim().length > 0
    );

    if (validCards.length === 0) {
      setError("Please add at least one flashcard with both front and back");
      return;
    }

    setLoading(true);

    try {
      const auth = getAuth(app);
      const currentUser = auth.currentUser;
      if (currentUser === null || currentUser === undefined) {
        setError("You must be logged in to create flashcards");
        setLoading(false);
        return;
      }

      const idToken = await currentUser.getIdToken();

      // Upload cover image first if exists
      let finalCoverImageUrl = coverImageUrl;
      if (coverImageFile !== null && coverImageFile !== undefined) {
        try {
          finalCoverImageUrl = await uploadImageToImgbb(
            coverImageFile,
            idToken
          );
          if (
            coverImagePreview !== null &&
            coverImagePreview !== undefined &&
            coverImagePreview !== ""
          ) {
            URL.revokeObjectURL(coverImagePreview);
          }
        } catch (error) {
          console.error("Error uploading cover image:", error);
          throw new Error(
            `Failed to upload cover image. ${error instanceof Error ? error.message : "Please try again."}`
          );
        }
      }

      // Upload all images first
      const cardsWithImages = await Promise.all(
        validCards.map(async (card, index) => {
          let frontImageUrl = card.frontImageUrl;
          let backImageUrl = card.backImageUrl;

          // Upload front image if file exists
          if (
            card.frontImageFile !== undefined &&
            card.frontImageFile !== null
          ) {
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

          // Upload back image if file exists
          if (card.backImageFile !== undefined && card.backImageFile !== null) {
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
      };

      // #region agent log
      fetch(
        "http://127.0.0.1:7244/ingest/0cdefbcf-c0dd-4af8-9322-fa937123a23b",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            location: "FlashcardMaker.tsx:328",
            message: "FlashcardMaker: submitting flashcard",
            data: {
              flashcardId: flashcardId ?? null,
              hasIdToken: idToken !== undefined,
              idTokenLength: idToken?.length ?? 0,
              method: flashcardId !== undefined ? "PUT" : "POST",
            },
            timestamp: Date.now(),
            sessionId: "debug-session",
            runId: "run1",
            hypothesisId: "E",
          }),
        }
      ).catch((error) => {
        console.error("FlashcardMaker agent log submit error:", error);
      });
      // #endregion
      const { apiPost, apiPut } = await import("../../lib/api");
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
      // #region agent log
      fetch(
        "http://127.0.0.1:7244/ingest/0cdefbcf-c0dd-4af8-9322-fa937123a23b",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            location: "FlashcardMaker.tsx:345",
            message: "FlashcardMaker: response received",
            data: { status: response.status, ok: response.ok },
            timestamp: Date.now(),
            sessionId: "debug-session",
            runId: "run1",
            hypothesisId: "D",
          }),
        }
      ).catch((error) => {
        console.error("FlashcardMaker agent log response error:", error);
      });
      // #endregion

      if (response.ok === false) {
        const data = (await response.json()) as { error?: string };
        setError(
          data.error ??
            (flashcardId !== undefined
              ? "Failed to update flashcard set"
              : "Failed to create flashcard set")
        );
        setLoading(false);
        return;
      }

      const responseData = (await response.json()) as {
        cloned?: boolean;
        id?: string;
      };

      // Handle clone-on-edit: If a clone was created, redirect to the new flashcard
      if (responseData.cloned === true && responseData.id !== undefined) {
        // Clean up all remaining preview URLs
        Object.values(imagePreviewUrls).forEach((urls) => {
          if (urls.front !== undefined && urls.front !== "") {
            URL.revokeObjectURL(urls.front);
          }
          if (urls.back !== undefined && urls.back !== "") {
            URL.revokeObjectURL(urls.back);
          }
        });

        // Redirect to the cloned flashcard edit page
        if (onSuccess !== undefined) {
          // Update the flashcard ID in the URL
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

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h3 className="text-2xl font-light text-black mb-4">
        {flashcardId ? "Edit Flashcard Set" : "Create Flashcard Set"}
      </h3>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-600">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-6">
        {/* Title */}
        <div>
          <label
            htmlFor="flashcard-title"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Title <span className="text-red-500">*</span>
          </label>
          <input
            id="flashcard-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter flashcard set title"
            className="w-full px-4 py-2 border border-gray-300 text-black font-light focus:outline-none focus:ring-2 focus:ring-black"
            disabled={loading}
          />
        </div>

        {/* Description */}
        <div>
          <label
            htmlFor="flashcard-description"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Description (Optional)
          </label>
          <textarea
            id="flashcard-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enter a description for your flashcard set"
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 text-black font-light focus:outline-none focus:ring-2 focus:ring-black resize-none"
            disabled={loading}
          />
        </div>

        {/* Cover Image */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Cover Image (Optional)
          </label>
          {coverImagePreview || coverImageUrl ? (
            <div className="flex flex-col gap-2">
              <div className="relative w-full max-w-xs h-48 border-2 border-gray-300">
                <Image
                  src={(coverImagePreview || coverImageUrl) ?? ""}
                  alt="Cover"
                  fill
                  className="object-cover"
                  unoptimized={!!coverImagePreview}
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setCoverImageFile(null);
                    setCoverImageUrl(undefined);
                    if (
                      coverImagePreview !== undefined &&
                      coverImagePreview !== null
                    ) {
                      URL.revokeObjectURL(coverImagePreview);
                      setCoverImagePreview(null);
                    }
                  }}
                  className="px-3 py-1 bg-red-600 text-white text-xs font-light hover:bg-red-700 transition-colors"
                  disabled={loading}
                >
                  Remove Cover Image
                </button>
                {coverImageFile && !coverImageUrl && (
                  <span className="text-xs font-light text-gray-600">
                    (Will be uploaded when saved)
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file !== undefined && file !== null) {
                    if (!file.type.startsWith("image/")) {
                      console.error("Please select an image file");
                      return;
                    }
                    if (file.size > 10 * 1024 * 1024) {
                      console.error("Image size must be less than 10MB");
                      return;
                    }
                    const previewUrl = URL.createObjectURL(file);
                    setCoverImageFile(file);
                    setCoverImagePreview(previewUrl);
                  }
                  e.target.value = "";
                }}
                className="w-full px-3 py-2 text-xs border border-gray-300 text-black font-light focus:outline-none focus:ring-2 focus:ring-black file:mr-2 file:py-1 file:px-2 file:border-0 file:bg-black file:text-white file:text-xs file:font-light file:cursor-pointer hover:file:bg-gray-800"
                disabled={loading}
              />
              <p className="text-xs font-light text-gray-500">
                Cover image will be displayed on your flashcard set card
              </p>
            </div>
          )}
        </div>

        {/* Cards */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <label className="block text-sm font-medium text-gray-700">
              Flashcards <span className="text-red-500">*</span>
            </label>
            <button
              type="button"
              onClick={() => void handleAddCard()}
              className="text-sm font-light text-blue-600 hover:text-blue-800"
              disabled={loading}
            >
              + Add Card
            </button>
          </div>

          <div className="flex flex-col gap-4">
            {cards.map((card, index) => (
              <div
                key={index}
                className="border border-gray-200 rounded-lg p-4"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-600">
                    Card {index + 1}
                  </span>
                  {cards.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveCard(index)}
                      className="text-sm font-light text-red-600 hover:text-red-800"
                      disabled={loading}
                    >
                      Remove
                    </button>
                  )}
                </div>
                <div className="flex flex-col gap-3">
                  <div>
                    <label
                      htmlFor={`card-front-${index}`}
                      className="block text-xs font-medium text-gray-600 mb-1"
                    >
                      Front
                    </label>
                    <textarea
                      id={`card-front-${index}`}
                      value={card.front}
                      onChange={(e) =>
                        handleCardChange(index, "front", e.target.value)
                      }
                      placeholder="Enter the front of the card"
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 text-black font-light focus:outline-none focus:ring-2 focus:ring-black resize-none"
                      disabled={loading}
                    />
                    <div className="mt-2">
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Front Image (Optional)
                      </label>
                      {card.frontImagePreview || card.frontImageUrl ? (
                        <div className="flex flex-col gap-2">
                          <div className="relative w-full max-w-xs h-48 border-2 border-gray-300">
                            <Image
                              src={
                                card.frontImagePreview ||
                                card.frontImageUrl ||
                                ""
                              }
                              alt="Front image"
                              fill
                              className="object-contain"
                              unoptimized={!!card.frontImagePreview}
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleRemoveImage(index, "front")}
                              className="px-3 py-1 bg-red-600 text-white text-xs font-light hover:bg-red-700 transition-colors"
                              disabled={loading}
                            >
                              Remove Image
                            </button>
                            {card.frontImageFile && !card.frontImageUrl && (
                              <span className="text-xs font-light text-gray-600">
                                (Will be uploaded when saved)
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-1">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file !== undefined && file !== null) {
                                handleImageSelect(index, "front", file);
                              }
                              e.target.value = "";
                            }}
                            className="w-full px-3 py-2 text-xs border border-gray-300 text-black font-light focus:outline-none focus:ring-2 focus:ring-black file:mr-2 file:py-1 file:px-2 file:border-0 file:bg-black file:text-white file:text-xs file:font-light file:cursor-pointer hover:file:bg-gray-800"
                            disabled={loading}
                          />
                          <p className="text-xs font-light text-gray-500">
                            Image will be uploaded when you save
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <label
                      htmlFor={`card-back-${index}`}
                      className="block text-xs font-medium text-gray-600 mb-1"
                    >
                      Back
                    </label>
                    <textarea
                      id={`card-back-${index}`}
                      value={card.back}
                      onChange={(e) =>
                        handleCardChange(index, "back", e.target.value)
                      }
                      placeholder="Enter the back of the card"
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 text-black font-light focus:outline-none focus:ring-2 focus:ring-black resize-none"
                      disabled={loading}
                    />
                    <div className="mt-2">
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Back Image (Optional)
                      </label>
                      {card.backImagePreview || card.backImageUrl ? (
                        <div className="flex flex-col gap-2">
                          <div className="relative w-full max-w-xs h-48 border-2 border-gray-300">
                            <Image
                              src={
                                (card.backImagePreview || card.backImageUrl) ??
                                ""
                              }
                              alt="Back image"
                              fill
                              className="object-contain"
                              unoptimized={!!card.backImagePreview}
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleRemoveImage(index, "back")}
                              className="px-3 py-1 bg-red-600 text-white text-xs font-light hover:bg-red-700 transition-colors"
                              disabled={loading}
                            >
                              Remove Image
                            </button>
                            {card.backImageFile && !card.backImageUrl && (
                              <span className="text-xs font-light text-gray-600">
                                (Will be uploaded when saved)
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-1">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file !== undefined && file !== null) {
                                handleImageSelect(index, "back", file);
                              }
                              e.target.value = "";
                            }}
                            className="w-full px-3 py-2 text-xs border border-gray-300 text-black font-light focus:outline-none focus:ring-2 focus:ring-black file:mr-2 file:py-1 file:px-2 file:border-0 file:bg-black file:text-white file:text-xs file:font-light file:cursor-pointer hover:file:bg-gray-800"
                            disabled={loading}
                          />
                          <p className="text-xs font-light text-gray-500">
                            Image will be uploaded when you save
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Public Toggle */}
        <div className="flex items-center gap-2">
          <input
            id="flashcard-public"
            type="checkbox"
            checked={isPublic}
            onChange={(e) => setIsPublic(e.target.checked)}
            className="w-4 h-4 border-gray-300 focus:ring-black"
            disabled={loading}
          />
          <label
            htmlFor="flashcard-public"
            className="text-sm font-light text-gray-700"
          >
            Make this flashcard set public (others can view it)
          </label>
        </div>

        {/* Share Section - Only show if flashcardId exists (editing existing flashcard) */}
        {flashcardId && (
          <div className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="flex flex-col gap-1">
              <span className="text-sm font-light text-black">
                Share with Connections
              </span>
              <span className="text-xs font-light text-gray-600">
                Share this flashcard set with your connections
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowShareModal(true)}
              className="px-4 py-2 bg-black text-white font-light hover:bg-gray-800 transition-colors"
              disabled={loading}
            >
              Share
            </button>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={loading}
          className="px-6 py-3 bg-black text-white font-light hover:bg-gray-800 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg
                className="animate-spin h-5 w-5"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              {flashcardId ? "Updating..." : "Creating..."}
            </span>
          ) : flashcardId ? (
            "Update Flashcard Set"
          ) : (
            "Create Flashcard Set"
          )}
        </button>

        {/* Share Modal */}
        {flashcardId && (
          <ShareFlashcardModal
            flashcardId={flashcardId}
            isOpen={showShareModal}
            onClose={() => setShowShareModal(false)}
            onShareSuccess={() => {
              // Optionally refresh or show success message
            }}
          />
        )}
      </div>
    </div>
  );
}
