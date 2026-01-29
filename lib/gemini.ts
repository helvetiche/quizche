/* eslint-disable no-await-in-loop, @typescript-eslint/no-unnecessary-condition, @typescript-eslint/prefer-nullish-coalescing */
import { GoogleGenerativeAI } from "@google/generative-ai";
import { adminDb } from "./firebase-admin";
import cache from "./cache";
import { env } from "./env";
import * as crypto from "crypto";

let genAI: GoogleGenerativeAI | null = null;

const PRIMARY_MODEL = "gemini-2.0-flash-exp";
const FALLBACK_MODEL = "gemini-1.5-flash";

const initializeGemini = (): GoogleGenerativeAI => {
  if (genAI) {
    return genAI;
  }

  genAI = new GoogleGenerativeAI(env.NEXT_PRIVATE_GEMINI_API_KEY);
  return genAI;
};

const hashPDF = (pdfBuffer: Buffer): string => {
  return crypto.createHash("sha256").update(pdfBuffer).digest("hex");
};

const getCachedPDFExtraction = async (
  pdfHash: string
): Promise<string | null> => {
  try {
    const cacheKey = `pdf_extraction:${pdfHash}`;
    const cached = await cache.get<string>(cacheKey);
    if (cached !== null) {
      return cached;
    }

    const cacheDoc = await adminDb
      .collection("pdfExtractionCache")
      .doc(pdfHash)
      .get();

    if (!cacheDoc.exists) {
      return null;
    }

    const data = cacheDoc.data() as Record<string, unknown> | undefined;
    const extractedText = data?.extractedText;
    if (typeof extractedText === "string") {
      void cache.set(cacheKey, extractedText, 3600);
      return extractedText;
    }

    return null;
  } catch (error) {
    console.error("Error checking PDF cache:", error);
    return null;
  }
};

const cachePDFExtraction = async (
  pdfHash: string,
  extractedText: string
): Promise<void> => {
  try {
    const cacheKey = `pdf_extraction:${pdfHash}`;
    await cache.set(cacheKey, extractedText, 3600);

    await adminDb
      .collection("pdfExtractionCache")
      .doc(pdfHash)
      .set({
        extractedText,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });
  } catch (error) {
    console.error("Error caching PDF extraction:", error);
  }
};

export const extractTextFromPDF = async (
  pdfBuffer: Buffer
): Promise<string> => {
  try {
    const pdfHash = hashPDF(pdfBuffer);
    const cached = await getCachedPDFExtraction(pdfHash);
    if (cached !== null) {
      return cached;
    }

    const genAIInstance = initializeGemini();

    let extractedText: string | null = null;
    let lastError: Error | null = null;

    for (const modelName of [PRIMARY_MODEL, FALLBACK_MODEL]) {
      try {
        const model = genAIInstance.getGenerativeModel({ model: modelName });

        const base64Pdf = pdfBuffer.toString("base64");
        const mimeType = "application/pdf";

        const result = await model.generateContent([
          {
            inlineData: {
              data: base64Pdf,
              mimeType,
            },
          },
          {
            text: "Extract all text content from this PDF. Return only the extracted text, preserving the structure and formatting as much as possible. Do not include any explanations or additional text, just return the extracted content.",
          },
        ]);

        const response = result.response;
        extractedText = response.text();

        if (extractedText.trim().length > 0) {
          break;
        }
      } catch (error) {
        console.warn(`Model ${modelName} failed:`, error);
        lastError = error instanceof Error ? error : new Error(String(error));
      }
    }

    if (extractedText === null || extractedText.trim().length === 0) {
      throw lastError !== null
        ? lastError
        : new Error("Failed to extract text from PDF");
    }

    await cachePDFExtraction(pdfHash, extractedText);

    return extractedText;
  } catch (error) {
    console.error("Error extracting text from PDF:", error);
    throw new Error(
      error instanceof Error
        ? `PDF text extraction failed: ${error.message}`
        : "Something went wrong reading the PDF"
    );
  }
};

const hashContent = (
  content: string,
  difficulty: string,
  numQuestions: number,
  additionalInstructions?: string
): string => {
  const contentHash = crypto
    .createHash("sha256")
    .update(content.substring(0, 1000))
    .digest("hex");
  return `quiz:${contentHash}:${difficulty}:${numQuestions}:${
    additionalInstructions !== undefined ? additionalInstructions : ""
  }`;
};

type QuizQuestion = {
  question: string;
  type: string;
  choices?: string[];
  answer: string;
  explanation?: string;
  choiceExplanations?: string[];
};

type QuizResponse = {
  title: string;
  description: string;
  questions: QuizQuestion[];
};

type RawQuizData = {
  title?: string;
  description?: string;
  questions?: {
    question?: string;
    type?: string;
    choices?: string[];
    answer?: string;
    explanation?: string;
    choiceExplanations?: string[];
  }[];
};

const createTimeoutPromise = <T>(
  promise: Promise<T>,
  timeoutMs: number
): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(
        () =>
          reject(new Error("AI generation took too long, please try again")),
        timeoutMs
      )
    ),
  ]);
};

export const generateQuizFromContent = async (
  content: string,
  difficulty: "easy" | "medium" | "hard",
  numQuestions: number,
  additionalInstructions?: string
): Promise<QuizResponse> => {
  try {
    const cacheKey = hashContent(
      content,
      difficulty,
      numQuestions,
      additionalInstructions
    );
    const cached = await cache.get<QuizResponse>(`quiz_gen:${cacheKey}`);

    if (cached) {
      return cached;
    }

    const genAIInstance = initializeGemini();

    const difficultyInstructions = {
      easy: "Use the original descriptions and terminology from the content. Questions should be straightforward and directly reference the material.",
      medium:
        "Rewrite descriptions but keep recognizable terms. Questions should require some understanding but remain accessible.",
      hard: "Completely rewrite descriptions requiring deep understanding. Questions should test comprehensive knowledge and critical thinking.",
    };

    let prompt = `You are an expert quiz generator. Based on the following content, generate a comprehensive quiz.

Content:
${content}

Requirements:
- Generate exactly ${numQuestions} questions
- Difficulty level: ${difficulty}
- ${difficultyInstructions[difficulty]}`;

    if (
      additionalInstructions !== undefined &&
      additionalInstructions.trim().length > 0
    ) {
      prompt += `\n\nAdditional Instructions:
${additionalInstructions.trim()}`;
    }

    prompt += `

Question Types to Use:
- multiple_choice: For questions with 4 options (A, B, C, D)
- identification: For questions requiring a specific answer
- true_or_false: For binary true/false questions

Output Format (JSON only, no markdown):
{
  "title": "Quiz title based on content",
  "description": "Brief description of the quiz topic",
  "questions": [
    {
      "question": "Question text",
      "type": "multiple_choice|identification|true_or_false",
      "choices": ["Option A", "Option B", "Option C", "Option D"],
      "answer": "Correct answer",
      "choiceExplanations": ["Explanation for Option A", "Explanation for Option B", "Explanation for Option C", "Explanation for Option D"],
      "explanation": "Explanation for identification/true_or_false questions"
    }
  ]
}

Important:
- For multiple_choice: Include exactly 4 choices, and the answer must match one of the choices exactly
- For multiple_choice: Include "choiceExplanations" array with explanations for EACH choice (why it's correct or why it's wrong)
- For true_or_false: Answer must be exactly "true" or "false"
- For true_or_false: Include "explanation" field explaining why the statement is true or false
- For identification: Answer should be concise and specific
- For identification: Include "explanation" field explaining why this is the correct answer
- Ensure questions cover different aspects of the content
- Make sure all questions are answerable based on the provided content
- Explanations should be educational and help students understand the concept
- Return ONLY valid JSON, no additional text or markdown formatting`;

    let quizData: RawQuizData | null = null;
    let lastError: Error | null = null;

    for (const modelName of [PRIMARY_MODEL, FALLBACK_MODEL]) {
      try {
        const model = genAIInstance.getGenerativeModel({ model: modelName });

        const aiResult = await createTimeoutPromise(
          model.generateContent(prompt),
          120000
        );
        const response = aiResult.response;
        const text = response.text();

        try {
          const jsonMatch = /\{[\s\S]*\}/.exec(text);
          const jsonStr = jsonMatch !== null ? jsonMatch[0] : text;
          quizData = JSON.parse(jsonStr) as RawQuizData;

          if (
            quizData.title !== undefined &&
            quizData.questions !== undefined &&
            Array.isArray(quizData.questions)
          ) {
            break;
          }
        } catch {
          console.warn(
            `Failed to parse response from ${modelName}:`,
            text.substring(0, 200)
          );
          lastError = new Error("AI response was invalid, please try again");
        }
      } catch (error) {
        console.warn(`Model ${modelName} failed:`, error);
        lastError = error instanceof Error ? error : new Error(String(error));
      }
    }

    if (quizData?.title === undefined || quizData.questions === undefined) {
      throw lastError !== null
        ? lastError
        : new Error("AI couldn't generate the quiz, please try again");
    }

    if (quizData.questions.length !== numQuestions) {
      console.warn(
        `Requested ${numQuestions} questions but got ${quizData.questions.length}`
      );
    }

    const validatedQuestions = quizData.questions.map((q, index: number) => {
      const questionObj = q;
      if (
        questionObj.question === undefined ||
        questionObj.type === undefined ||
        questionObj.answer === undefined
      ) {
        throw new Error(`Question ${index + 1} is missing required fields`);
      }

      if (questionObj.type === "multiple_choice") {
        if (
          questionObj.choices === undefined ||
          !Array.isArray(questionObj.choices) ||
          questionObj.choices.length < 2
        ) {
          throw new Error(
            `Question ${
              index + 1
            }: Multiple choice must have at least 2 choices`
          );
        }
        const choices = questionObj.choices;
        const answer = String(questionObj.answer);
        if (!choices.includes(answer)) {
          throw new Error(
            `Question ${index + 1}: Answer must be one of the choices`
          );
        }
      }

      if (questionObj.type === "true_or_false") {
        if (questionObj.answer !== "true" && questionObj.answer !== "false") {
          throw new Error(
            `Question ${index + 1}: True/false answer must be "true" or "false"`
          );
        }
      }

      const result: QuizQuestion = {
        question: String(questionObj.question).trim(),
        type: String(questionObj.type),
        answer: String(questionObj.answer).trim(),
      };

      if (
        questionObj.choices !== undefined &&
        Array.isArray(questionObj.choices)
      ) {
        result.choices = questionObj.choices.map((c: string) =>
          String(c).trim()
        );
      }

      if (
        questionObj.type === "multiple_choice" &&
        questionObj.choiceExplanations !== undefined &&
        Array.isArray(questionObj.choiceExplanations)
      ) {
        result.choiceExplanations = questionObj.choiceExplanations.map(
          (e: string) => (e !== undefined ? e : "").trim()
        );
      }

      if (
        (questionObj.type === "identification" ||
          questionObj.type === "true_or_false") &&
        questionObj.explanation !== undefined
      ) {
        result.explanation = String(questionObj.explanation).trim();
      }

      return result;
    });

    const result: QuizResponse = {
      title: quizData.title.trim(),
      description: (quizData.description !== undefined
        ? quizData.description
        : ""
      ).trim(),
      questions: validatedQuestions,
    };

    await cache.set(`quiz_gen:${cacheKey}`, result, 3600);

    return result;
  } catch (error) {
    console.error("Error generating quiz:", error);
    throw new Error(
      error instanceof Error
        ? error.message
        : "AI couldn't generate the quiz, please try again"
    );
  }
};

const hashFlashcardContent = (
  content: string,
  difficulty: string,
  numCards: number,
  additionalInstructions?: string
): string => {
  const contentHash = crypto
    .createHash("sha256")
    .update(content.substring(0, 1000))
    .digest("hex");
  return `flashcard:${contentHash}:${difficulty}:${numCards}:${
    additionalInstructions !== undefined ? additionalInstructions : ""
  }`;
};

type FlashcardCard = {
  front: string;
  back: string;
};

type FlashcardResponse = {
  title: string;
  description: string;
  cards: FlashcardCard[];
};

type RawFlashcardData = {
  title?: string;
  description?: string;
  cards?: { front?: string; back?: string }[];
};

export const generateFlashcardsFromContent = async (
  content: string,
  difficulty: "easy" | "medium" | "hard",
  numCards: number,
  additionalInstructions?: string
): Promise<FlashcardResponse> => {
  try {
    const cacheKey = hashFlashcardContent(
      content,
      difficulty,
      numCards,
      additionalInstructions
    );
    const cached = await cache.get<FlashcardResponse>(
      `flashcard_gen:${cacheKey}`
    );

    if (cached) {
      return cached;
    }

    const genAIInstance = initializeGemini();

    const difficultyInstructions = {
      easy: "Use the original descriptions and terminology from the content. Front side should be straightforward questions or terms, back side should directly reference the material.",
      medium:
        "Rewrite descriptions but keep recognizable terms. Front side should require some understanding, back side should explain concepts clearly.",
      hard: "Completely rewrite descriptions requiring deep understanding. Front side should test comprehensive knowledge, back side should provide detailed explanations.",
    };

    let prompt = `You are an expert flashcard generator. Based on the following content, generate a comprehensive flashcard set.

Content:
${content}

Requirements:
- Generate exactly ${numCards} flashcards
- Difficulty level: ${difficulty}
- ${difficultyInstructions[difficulty]}`;

    if (
      additionalInstructions !== null &&
      additionalInstructions !== undefined &&
      additionalInstructions.trim().length > 0
    ) {
      prompt += `\n\nAdditional Instructions:
${additionalInstructions.trim()}`;
    }

    prompt += `

Flashcard Format:
- Front: Question, term, or concept prompt
- Back: Answer, definition, or explanation

Output Format (JSON only, no markdown):
{
  "title": "Flashcard set title based on content",
  "description": "Brief description of the flashcard set topic",
  "cards": [
    {
      "front": "Front side text (question, term, or concept)",
      "back": "Back side text (answer, definition, or explanation)"
    }
  ]
}

Important:
- Ensure each card has meaningful front and back content
- Front should be concise (preferably under 200 characters)
- Back should be informative but clear (preferably under 500 characters)
- Cover different aspects of the content
- Make sure all flashcards are based on the provided content
- Return ONLY valid JSON, no additional text or markdown formatting`;

    let flashcardData: RawFlashcardData | null = null;
    let lastError: Error | null = null;

    for (const modelName of [PRIMARY_MODEL, FALLBACK_MODEL]) {
      try {
        const model = genAIInstance.getGenerativeModel({ model: modelName });

        const aiResult = await model.generateContent(prompt);
        const response = aiResult.response;
        const text = response.text();

        try {
          const jsonMatch = /\{[\s\S]*\}/.exec(text);
          const jsonStr = jsonMatch !== null ? jsonMatch[0] : text;
          flashcardData = JSON.parse(jsonStr) as RawFlashcardData;

          if (
            flashcardData.title !== undefined &&
            flashcardData.cards !== undefined &&
            Array.isArray(flashcardData.cards)
          ) {
            break;
          }
        } catch {
          console.warn(
            `Failed to parse response from ${modelName}:`,
            text.substring(0, 200)
          );
          lastError = new Error(
            "Failed to parse flashcard generation response"
          );
        }
      } catch (error) {
        console.warn(`Model ${modelName} failed:`, error);
        lastError = error instanceof Error ? error : new Error(String(error));
      }
    }

    if (
      flashcardData?.title === undefined ||
      flashcardData.cards === undefined
    ) {
      throw lastError !== null
        ? lastError
        : new Error("Something went wrong generating flashcards");
    }

    if (flashcardData.cards.length !== numCards) {
      console.warn(
        `Requested ${numCards} flashcards but got ${flashcardData.cards.length}`
      );
    }

    const validatedCards = flashcardData.cards.map(
      (card: { front?: string; back?: string }, index: number) => {
        if (card.front === undefined || card.back === undefined) {
          throw new Error(`Card ${index + 1} is missing required fields`);
        }

        if (typeof card.front !== "string" || card.front.trim().length === 0) {
          throw new Error(`Card ${index + 1}: Front side cannot be empty`);
        }

        if (typeof card.back !== "string" || card.back.trim().length === 0) {
          throw new Error(`Card ${index + 1}: Back side cannot be empty`);
        }

        return {
          front: card.front.trim(),
          back: card.back.trim(),
        };
      }
    );

    const result: FlashcardResponse = {
      title: flashcardData.title.trim(),
      description: (flashcardData.description !== undefined
        ? flashcardData.description
        : ""
      ).trim(),
      cards: validatedCards,
    };

    await cache.set(`flashcard_gen:${cacheKey}`, result, 3600);

    return result;
  } catch (error) {
    console.error("Error generating flashcards:", error);
    throw new Error(
      error instanceof Error
        ? `Flashcard generation failed: ${error.message}`
        : "Something went wrong creating flashcards"
    );
  }
};
