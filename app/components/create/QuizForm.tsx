"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { uploadImageToImgbb } from "@/lib/imgbb";
import Image from "next/image";

type QuestionType =
  | "multiple_choice"
  | "identification"
  | "true_or_false"
  | "essay"
  | "enumeration"
  | "reflection";

interface Question {
  id: string;
  question: string;
  type: QuestionType;
  choices: string[];
  answer: string;
  imageUrl?: string;
  imageFile?: File;
  imagePreview?: string;
}

const QUESTION_TYPES: { value: QuestionType; label: string }[] = [
  { value: "multiple_choice", label: "Multiple Choice" },
  { value: "identification", label: "Identification" },
  { value: "true_or_false", label: "True or False" },
  { value: "essay", label: "Essay" },
  { value: "enumeration", label: "Enumeration" },
  { value: "reflection", label: "Reflection" },
];

export interface GeneratedQuizData {
  title: string;
  description: string;
  questions: Array<{
    question: string;
    type: QuestionType;
    choices?: string[];
    answer: string;
    imageUrl?: string;
  }>;
}

interface QuizFormProps {
  idToken: string;
  quizId?: string;
  initialData?: GeneratedQuizData;
}

const QuizForm = ({ idToken, quizId, initialData }: QuizFormProps) => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [loadingQuiz, setLoadingQuiz] = useState(!!quizId);
  const [title, setTitle] = useState(initialData?.title || "");
  const [description, setDescription] = useState(
    initialData?.description || ""
  );
  const [isActive, setIsActive] = useState(true);
  const [questions, setQuestions] = useState<Question[]>(
    initialData?.questions
      ? initialData.questions.map((q, index) => ({
          id: `${Date.now()}-${index}`,
          question: q.question,
          type: q.type,
          choices:
            q.type === "multiple_choice"
              ? q.choices && q.choices.length > 0
                ? q.choices
                : ["", "", "", ""]
              : [],
          answer: q.answer,
          imageUrl: q.imageUrl,
        }))
      : [
          {
            id: Date.now().toString(),
            question: "",
            type: "multiple_choice",
            choices: ["", "", "", ""],
            answer: "",
          },
        ]
  );
  const [uploadingImages, setUploadingImages] = useState<
    Record<string, boolean>
  >({});
  const [imagePreviewUrls, setImagePreviewUrls] = useState<
    Record<string, string>
  >({});

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title);
      setDescription(initialData.description || "");
      setQuestions(
        initialData.questions.map((q, index) => ({
          id: `${Date.now()}-${index}`,
          question: q.question,
          type: q.type,
          choices:
            q.type === "multiple_choice"
              ? q.choices && q.choices.length > 0
                ? q.choices
                : ["", "", "", ""]
              : [],
          answer: q.answer,
          imageUrl: q.imageUrl,
        }))
      );
      return;
    }

    const fetchQuiz = async () => {
      if (!quizId || !idToken) return;

      try {
        setLoadingQuiz(true);
        const { apiGet } = await import("../../lib/api");
        const response = await apiGet(`/api/quizzes/${quizId}`, {
          idToken,
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to fetch quiz");
        }

        const quiz = data.quiz;
        setTitle(quiz.title);
        setDescription(quiz.description || "");
        setIsActive(quiz.isActive !== undefined ? quiz.isActive : true);

        const loadedQuestions = quiz.questions.map((q: any, index: number) => ({
          id: `${Date.now()}-${index}`,
          question: q.question,
          type: q.type,
          choices:
            q.choices || (q.type === "multiple_choice" ? ["", "", "", ""] : []),
          answer: q.answer,
          imageUrl: q.imageUrl,
        }));

        setQuestions(
          loadedQuestions.length > 0
            ? loadedQuestions
            : [
                {
                  id: Date.now().toString(),
                  question: "",
                  type: "multiple_choice",
                  choices: ["", "", "", ""],
                  answer: "",
                },
              ]
        );
      } catch (err) {
        console.error("Error fetching quiz:", err);
        alert(err instanceof Error ? err.message : "Failed to load quiz");
      } finally {
        setLoadingQuiz(false);
      }
    };

    fetchQuiz();
  }, [quizId, idToken, initialData]);

  const handleAddQuestion = () => {
    setQuestions([
      ...questions,
      {
        id: Date.now().toString(),
        question: "",
        type: "multiple_choice",
        choices: ["", "", "", ""],
        answer: "",
      },
    ]);
  };

  const handleImageSelect = (questionId: string, file: File) => {
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert("Image size must be less than 10MB");
      return;
    }

    // Create preview URL
    const previewUrl = URL.createObjectURL(file);
    setImagePreviewUrls((prev) => ({ ...prev, [questionId]: previewUrl }));

    // Store file locally
    setQuestions(
      questions.map((q) =>
        q.id === questionId
          ? { ...q, imageFile: file, imagePreview: previewUrl }
          : q
      )
    );
  };

  const handleRemoveImage = (questionId: string) => {
    // Clean up preview URL
    const previewUrl = imagePreviewUrls[questionId];
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setImagePreviewUrls((prev) => {
        const newUrls = { ...prev };
        delete newUrls[questionId];
        return newUrls;
      });
    }

    setQuestions(
      questions.map((q) =>
        q.id === questionId
          ? {
              ...q,
              imageFile: undefined,
              imagePreview: undefined,
              imageUrl: undefined,
            }
          : q
      )
    );
  };

  // Cleanup preview URLs on unmount
  useEffect(() => {
    return () => {
      Object.values(imagePreviewUrls).forEach((url) => {
        URL.revokeObjectURL(url);
      });
    };
  }, [imagePreviewUrls]);

  const handleRemoveQuestion = (id: string) => {
    if (questions.length === 1) {
      alert("You must have at least one question");
      return;
    }
    setQuestions(questions.filter((q) => q.id !== id));
  };

  const handleQuestionChange = (
    id: string,
    field: keyof Question,
    value: string | QuestionType | string[]
  ) => {
    setQuestions(
      questions.map((q) => {
        if (q.id === id) {
          const updated = { ...q, [field]: value };
          if (field === "type") {
            const newType = value as QuestionType;
            if (newType === "multiple_choice") {
              updated.choices =
                updated.choices.length > 0 ? updated.choices : ["", "", "", ""];
            } else {
              updated.choices = [];
            }
            if (newType === "true_or_false") {
              updated.answer = "";
            }
          }
          return updated;
        }
        return q;
      })
    );
  };

  const handleChoiceChange = (
    questionId: string,
    choiceIndex: number,
    value: string
  ) => {
    setQuestions(
      questions.map((q) => {
        if (q.id === questionId) {
          const newChoices = [...q.choices];
          newChoices[choiceIndex] = value;
          return { ...q, choices: newChoices };
        }
        return q;
      })
    );
  };

  const handleAddChoice = (questionId: string) => {
    setQuestions(
      questions.map((q) => {
        if (q.id === questionId) {
          return { ...q, choices: [...q.choices, ""] };
        }
        return q;
      })
    );
  };

  const handleRemoveChoice = (questionId: string, choiceIndex: number) => {
    setQuestions(
      questions.map((q) => {
        if (q.id === questionId) {
          if (q.choices.length <= 2) {
            alert("Multiple choice questions must have at least 2 choices");
            return q;
          }
          const newChoices = q.choices.filter((_, i) => i !== choiceIndex);
          return { ...q, choices: newChoices };
        }
        return q;
      })
    );
  };

  const getDuplicateChoices = (questionId: string): number[] => {
    const question = questions.find((q) => q.id === questionId);
    if (!question || question.type !== "multiple_choice") {
      return [];
    }

    const duplicates: number[] = [];
    const choiceMap = new Map<string, number[]>();

    question.choices.forEach((choice, index) => {
      const trimmed = choice.trim().toLowerCase();
      if (trimmed.length > 0) {
        if (!choiceMap.has(trimmed)) {
          choiceMap.set(trimmed, []);
        }
        choiceMap.get(trimmed)!.push(index);
      }
    });

    choiceMap.forEach((indices) => {
      if (indices.length > 1) {
        duplicates.push(...indices);
      }
    });

    return duplicates;
  };

  const hasDuplicateChoices = (questionId: string): boolean => {
    return getDuplicateChoices(questionId).length > 0;
  };

  const validateForm = (): boolean => {
    if (!title.trim()) {
      alert("Please enter a quiz title");
      return false;
    }

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.question.trim()) {
        alert(`Please enter a question for question ${i + 1}`);
        return false;
      }

      if (q.type === "multiple_choice") {
        const validChoices = q.choices.filter((c) => c.trim().length > 0);
        if (validChoices.length < 2) {
          alert(
            `Question ${
              i + 1
            }: Multiple choice questions must have at least 2 choices`
          );
          return false;
        }
        if (hasDuplicateChoices(q.id)) {
          alert(
            `Question ${
              i + 1
            }: Duplicate choices are not allowed. Please make each choice unique.`
          );
          return false;
        }
        if (!q.answer.trim()) {
          alert(`Question ${i + 1}: Please enter the correct answer`);
          return false;
        }
        if (!validChoices.includes(q.answer.trim())) {
          alert(`Question ${i + 1}: The answer must be one of the choices`);
          return false;
        }
      } else if (q.type === "true_or_false") {
        if (q.answer !== "true" && q.answer !== "false") {
          alert(`Question ${i + 1}: Please select true or false as the answer`);
          return false;
        }
      } else {
        if (!q.answer.trim()) {
          alert(`Question ${i + 1}: Please enter the answer`);
          return false;
        }
      }
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    if (!idToken) {
      alert("Authentication required. Please refresh the page.");
      return;
    }

    setLoading(true);

    try {
      // Upload all images first
      const questionsWithImages = await Promise.all(
        questions.map(async (q) => {
          let imageUrl = q.imageUrl; // Keep existing URL if already uploaded

          // Upload new image if file exists
          if (q.imageFile) {
            try {
              setUploadingImages((prev: Record<string, boolean>) => ({
                ...prev,
                [q.id]: true,
              }));
              imageUrl = await uploadImageToImgbb(q.imageFile, idToken);
              // Clean up preview URL after successful upload
              if (q.imagePreview) {
                URL.revokeObjectURL(q.imagePreview);
                setImagePreviewUrls((prev) => {
                  const newUrls = { ...prev };
                  delete newUrls[q.id];
                  return newUrls;
                });
              }
            } catch (error) {
              console.error(
                `Error uploading image for question ${q.id}:`,
                error
              );
              throw new Error(
                `Failed to upload image for question. ${
                  error instanceof Error ? error.message : "Please try again."
                }`
              );
            } finally {
              setUploadingImages((prev: Record<string, boolean>) => ({
                ...prev,
                [q.id]: false,
              }));
            }
          }

          return {
            question: q.question.trim(),
            type: q.type,
            choices:
              q.type === "multiple_choice"
                ? q.choices
                    .filter((c) => c.trim().length > 0)
                    .map((c) => c.trim())
                : undefined,
            answer: q.answer.trim(),
            imageUrl,
          };
        })
      );

      const quizData = {
        title: title.trim(),
        description: description.trim(),
        isActive: isActive,
        questions: questionsWithImages,
      };

      const { apiPost, apiPut } = await import("../../lib/api");
      const url = quizId ? `/api/quizzes/${quizId}` : "/api/quizzes";
      const response = quizId
        ? await apiPut(url, {
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(quizData),
            idToken,
          })
        : await apiPost(url, {
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(quizData),
            idToken,
          });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || `Failed to ${quizId ? "update" : "create"} quiz`
        );
      }

      alert(`Quiz ${quizId ? "updated" : "created"} successfully!`);
      router.push(quizId ? `/teacher/quizzes/${quizId}` : "/teacher/quizzes");
    } catch (error) {
      console.error(`Error ${quizId ? "updating" : "creating"} quiz:`, error);
      alert(
        error instanceof Error
          ? error.message
          : `Failed to ${quizId ? "update" : "create"} quiz. Please try again.`
      );
    } finally {
      setLoading(false);
    }
  };

  const renderPreview = () => {
    return (
      <div className="flex flex-col gap-6 h-full overflow-y-auto">
        <div className="sticky top-0 bg-white border-b-2 border-black pb-4 z-10">
          <h2 className="text-2xl font-light text-black mb-2">Preview</h2>
          {title && <h3 className="text-xl font-light text-black">{title}</h3>}
          {description && (
            <p className="text-base font-light text-gray-600 mt-2">
              {description}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-6">
          {questions.length === 0 ? (
            <p className="text-base font-light text-gray-500">
              No questions yet. Add questions to see preview.
            </p>
          ) : (
            questions.map((question, index) => (
              <div
                key={question.id}
                className="flex flex-col gap-4 p-6 border-2 border-gray-300 bg-white"
              >
                <div className="flex items-start gap-3">
                  <span className="text-lg font-light text-black min-w-[30px]">
                    {index + 1}.
                  </span>
                  <div className="flex-1 flex flex-col gap-4">
                    {question.question ? (
                      <p className="text-base font-light text-black">
                        {question.question}
                      </p>
                    ) : (
                      <p className="text-base font-light text-gray-400 italic">
                        Enter question text...
                      </p>
                    )}

                    {(question.imagePreview || question.imageUrl) && (
                      <div className="relative w-full max-w-md h-64 border-2 border-gray-300">
                        <Image
                          src={question.imagePreview || question.imageUrl || ""}
                          alt="Question image"
                          fill
                          className="object-contain"
                          unoptimized={!!question.imagePreview}
                        />
                      </div>
                    )}

                    {question.type === "multiple_choice" && (
                      <div className="flex flex-wrap gap-3 ml-4">
                        {question.choices
                          .filter((c) => c.trim().length > 0)
                          .map((choice, choiceIndex) => {
                            const isCorrectAnswer =
                              question.answer.trim() === choice.trim();
                            return (
                              <div
                                key={choiceIndex}
                                className={`px-6 py-2 rounded-full border-2 font-light ${
                                  isCorrectAnswer
                                    ? "bg-green-100 text-green-800 border-green-600"
                                    : "bg-white text-black border-gray-300"
                                }`}
                              >
                                {choice}
                              </div>
                            );
                          })}
                        {question.choices.filter((c) => c.trim().length > 0)
                          .length === 0 && (
                          <p className="text-sm font-light text-gray-400 italic">
                            Add choices...
                          </p>
                        )}
                      </div>
                    )}

                    {question.type === "true_or_false" && (
                      <div className="flex gap-3 ml-4">
                        <div
                          className={`px-6 py-2 rounded-full border-2 font-light ${
                            question.answer === "true"
                              ? "bg-green-100 text-green-800 border-green-600"
                              : "bg-white text-black border-gray-300"
                          }`}
                        >
                          True
                        </div>
                        <div
                          className={`px-6 py-2 rounded-full border-2 font-light ${
                            question.answer === "false"
                              ? "bg-green-100 text-green-800 border-green-600"
                              : "bg-white text-black border-gray-300"
                          }`}
                        >
                          False
                        </div>
                      </div>
                    )}

                    {(question.type === "identification" ||
                      question.type === "enumeration") && (
                      <div className="ml-4">
                        <input
                          type="text"
                          placeholder="Enter your answer..."
                          className="w-full px-4 py-2 border-2 border-gray-300 bg-white text-black font-light focus:outline-none"
                          disabled
                        />
                      </div>
                    )}

                    {(question.type === "essay" ||
                      question.type === "reflection") && (
                      <div className="ml-4">
                        <textarea
                          placeholder="Enter your answer..."
                          className="w-full px-4 py-3 border-2 border-gray-300 bg-white text-black font-light focus:outline-none resize-none"
                          rows={4}
                          disabled
                        />
                      </div>
                    )}

                    <div className="ml-4 mt-2 p-3 bg-gray-100 border border-gray-300">
                      <p className="text-xs font-light text-gray-600 mb-1">
                        Correct Answer:
                      </p>
                      <p className="text-sm font-light text-black">
                        {question.answer || (
                          <span className="text-gray-400 italic">Not set</span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex gap-6 h-[calc(100vh-200px)]">
      <div className="flex-1 overflow-y-auto pr-4">
        {loadingQuiz ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-black font-light">Loading quiz...</div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-8">
            <div className="flex flex-col gap-4">
              <label htmlFor="title" className="text-lg font-light text-black">
                Quiz Title *
              </label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-3 border-2 border-black bg-white text-black font-light focus:outline-none focus:ring-2 focus:ring-black"
                placeholder="Enter quiz title"
                required
              />
            </div>

            <div className="flex flex-col gap-4">
              <label
                htmlFor="description"
                className="text-lg font-light text-black"
              >
                Description (Optional)
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-3 border-2 border-black bg-white text-black font-light focus:outline-none focus:ring-2 focus:ring-black resize-none"
                placeholder="Enter quiz description"
                rows={3}
              />
            </div>

            <div className="flex flex-col gap-6">
              <h3 className="text-xl font-light text-black">Questions</h3>

              {questions.map((question, index) => (
                <div
                  key={question.id}
                  className="flex flex-col gap-4 p-6 border-2 border-black bg-white"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="text-lg font-light text-black">
                      Question {index + 1}
                    </h4>
                    {questions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveQuestion(question.id)}
                        className="px-3 py-1 bg-red-600 text-white font-light hover:bg-red-700 transition-colors"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  <div className="flex flex-col gap-4">
                    <label className="text-base font-light text-black">
                      Question Text *
                    </label>
                    <textarea
                      value={question.question}
                      onChange={(e) =>
                        handleQuestionChange(
                          question.id,
                          "question",
                          e.target.value
                        )
                      }
                      className="w-full px-4 py-3 border-2 border-black bg-white text-black font-light focus:outline-none focus:ring-2 focus:ring-black resize-none"
                      placeholder="Enter your question"
                      rows={2}
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-4">
                    <label className="text-base font-light text-black">
                      Question Image (Optional)
                    </label>
                    {question.imagePreview || question.imageUrl ? (
                      <div className="flex flex-col gap-2">
                        <div className="relative w-full max-w-md h-64 border-2 border-gray-300">
                          <Image
                            src={
                              question.imagePreview || question.imageUrl || ""
                            }
                            alt="Question image"
                            fill
                            className="object-contain"
                            unoptimized={!!question.imagePreview}
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(question.id)}
                            className="px-4 py-2 bg-red-600 text-white font-light hover:bg-red-700 transition-colors"
                          >
                            Remove Image
                          </button>
                          {question.imageFile && !question.imageUrl && (
                            <span className="text-xs font-light text-gray-600">
                              (Will be uploaded when quiz is saved)
                            </span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              handleImageSelect(question.id, file);
                            }
                            // Reset input so same file can be selected again
                            e.target.value = "";
                          }}
                          className="w-full px-4 py-3 border-2 border-black bg-white text-black font-light focus:outline-none focus:ring-2 focus:ring-black file:mr-4 file:py-2 file:px-4 file:border-0 file:bg-black file:text-white file:font-light file:cursor-pointer hover:file:bg-gray-800"
                        />
                        <p className="text-xs font-light text-gray-500">
                          Image will be uploaded when you save the quiz
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-4">
                    <label className="text-base font-light text-black">
                      Question Type *
                    </label>
                    <select
                      value={question.type}
                      onChange={(e) =>
                        handleQuestionChange(
                          question.id,
                          "type",
                          e.target.value as QuestionType
                        )
                      }
                      className="w-full px-4 py-3 border-2 border-black bg-white text-black font-light focus:outline-none focus:ring-2 focus:ring-black"
                    >
                      {QUESTION_TYPES.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {question.type === "multiple_choice" && (
                    <div className="flex flex-col gap-4">
                      <div className="flex items-center justify-between">
                        <label className="text-base font-light text-black">
                          Choices *
                        </label>
                        <button
                          type="button"
                          onClick={() => handleAddChoice(question.id)}
                          className="px-3 py-1 bg-gray-200 text-black font-light hover:bg-gray-300 transition-colors"
                        >
                          Add Choice
                        </button>
                      </div>
                      {question.choices.map((choice, choiceIndex) => {
                        const duplicateIndices = getDuplicateChoices(
                          question.id
                        );
                        const isDuplicate =
                          duplicateIndices.includes(choiceIndex);
                        return (
                          <div
                            key={choiceIndex}
                            className="flex items-center gap-2"
                          >
                            <input
                              type="text"
                              value={choice}
                              onChange={(e) =>
                                handleChoiceChange(
                                  question.id,
                                  choiceIndex,
                                  e.target.value
                                )
                              }
                              className={`flex-1 px-4 py-2 border-2 bg-white text-black font-light focus:outline-none focus:ring-2 ${
                                isDuplicate
                                  ? "border-red-600 focus:ring-red-600"
                                  : "border-black focus:ring-black"
                              }`}
                              placeholder={`Choice ${choiceIndex + 1}`}
                            />
                            {question.choices.length > 2 && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleRemoveChoice(question.id, choiceIndex)
                                }
                                className="px-3 py-2 bg-red-600 text-white font-light hover:bg-red-700 transition-colors"
                              >
                                Remove
                              </button>
                            )}
                          </div>
                        );
                      })}
                      {hasDuplicateChoices(question.id) && (
                        <p className="text-sm font-light text-red-600">
                          Duplicate choices detected. Please make each choice
                          unique.
                        </p>
                      )}
                    </div>
                  )}

                  <div className="flex flex-col gap-4">
                    <label className="text-base font-light text-black">
                      {question.type === "true_or_false"
                        ? "Correct Answer *"
                        : question.type === "multiple_choice"
                        ? "Select Correct Answer *"
                        : "Answer *"}
                    </label>
                    {question.type === "true_or_false" ? (
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() =>
                            handleQuestionChange(question.id, "answer", "true")
                          }
                          className={`px-6 py-2 rounded-full border-2 font-light transition-colors ${
                            question.answer === "true"
                              ? "bg-black text-white border-black"
                              : "bg-white text-black border-black hover:bg-gray-100"
                          }`}
                        >
                          True
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleQuestionChange(question.id, "answer", "false")
                          }
                          className={`px-6 py-2 rounded-full border-2 font-light transition-colors ${
                            question.answer === "false"
                              ? "bg-black text-white border-black"
                              : "bg-white text-black border-black hover:bg-gray-100"
                          }`}
                        >
                          False
                        </button>
                      </div>
                    ) : question.type === "multiple_choice" ? (
                      <div className="flex flex-wrap gap-3">
                        {question.choices
                          .filter((c) => c.trim().length > 0)
                          .map((choice, choiceIndex) => {
                            const isSelected =
                              question.answer.trim() === choice.trim();
                            return (
                              <button
                                key={choiceIndex}
                                type="button"
                                onClick={() =>
                                  handleQuestionChange(
                                    question.id,
                                    "answer",
                                    choice.trim()
                                  )
                                }
                                className={`px-6 py-2 rounded-full border-2 font-light transition-colors ${
                                  isSelected
                                    ? "bg-black text-white border-black"
                                    : "bg-white text-black border-black hover:bg-gray-100"
                                }`}
                              >
                                {choice}
                              </button>
                            );
                          })}
                        {question.choices.filter((c) => c.trim().length > 0)
                          .length === 0 && (
                          <p className="text-sm font-light text-gray-500">
                            Add choices first to select the correct answer
                          </p>
                        )}
                      </div>
                    ) : (
                      <textarea
                        value={question.answer}
                        onChange={(e) =>
                          handleQuestionChange(
                            question.id,
                            "answer",
                            e.target.value
                          )
                        }
                        className="w-full px-4 py-3 border-2 border-black bg-white text-black font-light focus:outline-none focus:ring-2 focus:ring-black resize-none"
                        placeholder={
                          question.type === "enumeration"
                            ? "Enter answers separated by commas"
                            : question.type === "essay" ||
                              question.type === "reflection"
                            ? "Enter sample answer or rubric"
                            : "Enter the correct answer"
                        }
                        rows={
                          question.type === "essay" ||
                          question.type === "reflection"
                            ? 4
                            : 2
                        }
                        required
                      />
                    )}
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={handleAddQuestion}
                className="px-6 py-3 bg-black text-white font-light hover:bg-gray-800 transition-colors w-full"
              >
                Add Question
              </button>
            </div>

            <div className="flex gap-4 pb-4">
              <button
                type="submit"
                disabled={loading || loadingQuiz}
                className="px-6 py-3 bg-black text-white font-light hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {loading && (
                  <svg
                    className="animate-spin h-5 w-5 text-white"
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
                )}
                {loading
                  ? quizId
                    ? "Updating..."
                    : "Creating..."
                  : quizId
                  ? "Update Quiz"
                  : "Create Quiz"}
              </button>
              <button
                type="button"
                onClick={() => router.back()}
                className="px-6 py-3 bg-gray-200 text-black font-light hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      <div className="flex-1 border-l-2 border-black pl-6">
        {renderPreview()}
      </div>
    </div>
  );
};

export default QuizForm;
