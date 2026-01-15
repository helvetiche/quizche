import { GoogleGenerativeAI } from "@google/generative-ai";
import { adminDb } from "./firebase-admin";
import cache, { withCache } from "./cache";
import { env } from "./env";
import * as crypto from "crypto";

let genAI: GoogleGenerativeAI | null = null;

// Primary and fallback models
const PRIMARY_MODEL = "gemini-2.0-flash-exp";
const FALLBACK_MODEL = "gemini-1.5-flash";

const initializeGemini = (): GoogleGenerativeAI => {
  if (genAI) {
    return genAI;
  }

  genAI = new GoogleGenerativeAI(env.NEXT_PRIVATE_GEMINI_API_KEY);
  return genAI;
};

/**
 * Get model with fallback support
 */
const getModelWithFallback = async (genAIInstance: GoogleGenerativeAI, preferredModel: string = PRIMARY_MODEL) => {
  try {
    const model = genAIInstance.getGenerativeModel({ model: preferredModel });
    return { model, modelName: preferredModel };
  } catch (error) {
    console.warn(`Failed to get model ${preferredModel}, falling back to ${FALLBACK_MODEL}`);
    const model = genAIInstance.getGenerativeModel({ model: FALLBACK_MODEL });
    return { model, modelName: FALLBACK_MODEL };
  }
};

/**
 * Generate hash for PDF content deduplication
 */
const hashPDF = (pdfBuffer: Buffer): string => {
  return crypto.createHash("sha256").update(pdfBuffer).digest("hex");
};

/**
 * Check if PDF was already processed (deduplication)
 */
const getCachedPDFExtraction = async (
  pdfHash: string
): Promise<string | null> => {
  try {
    // Check cache first
    const cacheKey = `pdf_extraction:${pdfHash}`;
    const cached = await cache.get<string>(cacheKey);
    if (cached) {
      return cached;
    }

    // Check database cache
    const cacheDoc = await adminDb
      .collection("pdfExtractionCache")
      .doc(pdfHash)
      .get();

    if (cacheDoc.exists) {
      const data = cacheDoc.data();
      const extractedText = data?.extractedText;
      if (extractedText) {
        // Cache in memory for faster access
        cache.set(cacheKey, extractedText, 3600); // 1 hour
        return extractedText;
      }
    }

    return null;
  } catch (error) {
    console.error("Error checking PDF cache:", error);
    return null;
  }
};

/**
 * Cache PDF extraction result
 */
const cachePDFExtraction = async (
  pdfHash: string,
  extractedText: string
): Promise<void> => {
  try {
    const cacheKey = `pdf_extraction:${pdfHash}`;
    // Cache in Redis
    await cache.set(cacheKey, extractedText, 3600); // 1 hour

    // Cache in database (longer term)
    await adminDb
      .collection("pdfExtractionCache")
      .doc(pdfHash)
      .set({
        extractedText,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      });
  } catch (error) {
    console.error("Error caching PDF extraction:", error);
    // Don't throw - caching failure shouldn't break the operation
  }
};

export const extractTextFromPDF = async (
  pdfBuffer: Buffer
): Promise<string> => {
  try {
    // Check for duplicate PDF (deduplication)
    const pdfHash = hashPDF(pdfBuffer);
    const cached = await getCachedPDFExtraction(pdfHash);
    if (cached) {
      return cached;
    }

    const genAIInstance = initializeGemini();
    
    // Try primary model first, then fallback
    let extractedText: string | null = null;
    let lastError: Error | null = null;
    
    for (const modelName of [PRIMARY_MODEL, FALLBACK_MODEL]) {
      try {
        console.log(`Attempting PDF extraction with model: ${modelName}`);
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
        
        if (extractedText && extractedText.trim().length > 0) {
          console.log(`PDF extraction successful with model: ${modelName}`);
          break;
        }
      } catch (error) {
        console.warn(`Model ${modelName} failed:`, error);
        lastError = error instanceof Error ? error : new Error(String(error));
      }
    }

    if (!extractedText || extractedText.trim().length === 0) {
      throw lastError || new Error("Failed to extract text from PDF");
    }

    // Cache the result
    await cachePDFExtraction(pdfHash, extractedText);

    return extractedText;
  } catch (error) {
    console.error("Error extracting text from PDF:", error);
    throw new Error(
      error instanceof Error
        ? `PDF extraction failed: ${error.message}`
        : "Failed to extract text from PDF"
    );
  }
};

/**
 * Generate hash for content-based caching
 */
const hashContent = (
  content: string,
  difficulty: string,
  numQuestions: number,
  additionalInstructions?: string
): string => {
  const contentHash = crypto
    .createHash("sha256")
    .update(content.substring(0, 1000)) // Use first 1000 chars for hash
    .digest("hex");
  return `quiz:${contentHash}:${difficulty}:${numQuestions}:${
    additionalInstructions || ""
  }`;
};

export const generateQuizFromContent = async (
  content: string,
  difficulty: "easy" | "medium" | "hard",
  numQuestions: number,
  additionalInstructions?: string
): Promise<{
  title: string;
  description: string;
  questions: Array<{
    question: string;
    type: string;
    choices?: string[];
    answer: string;
    explanation?: string;
    choiceExplanations?: string[];
  }>;
}> => {
  try {
    // Check cache first
    const cacheKey = hashContent(
      content,
      difficulty,
      numQuestions,
      additionalInstructions
    );
    const cached = await cache.get<{
      title: string;
      description: string;
      questions: Array<{
        question: string;
        type: string;
        choices?: string[];
        answer: string;
        explanation?: string;
        choiceExplanations?: string[];
      }>;
    }>(`quiz_gen:${cacheKey}`);

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

    if (additionalInstructions && additionalInstructions.trim().length > 0) {
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

    // Try primary model first, then fallback
    let quizData: any = null;
    let lastError: Error | null = null;
    
    for (const modelName of [PRIMARY_MODEL, FALLBACK_MODEL]) {
      try {
        console.log(`Attempting quiz generation with model: ${modelName}`);
        const model = genAIInstance.getGenerativeModel({ model: modelName });
        
        const aiResult = await model.generateContent(prompt);
        const response = aiResult.response;
        const text = response.text();

        try {
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            quizData = JSON.parse(jsonMatch[0]);
          } else {
            quizData = JSON.parse(text);
          }
          
          if (quizData.title && quizData.questions && Array.isArray(quizData.questions)) {
            console.log(`Quiz generation successful with model: ${modelName}`);
            break;
          }
        } catch (parseError) {
          console.warn(`Failed to parse response from ${modelName}:`, text.substring(0, 200));
          lastError = new Error("Failed to parse quiz generation response");
        }
      } catch (error) {
        console.warn(`Model ${modelName} failed:`, error);
        lastError = error instanceof Error ? error : new Error(String(error));
      }
    }

    if (!quizData || !quizData.title || !quizData.questions) {
      throw lastError || new Error("Failed to generate quiz with all available models");
    }

    if (quizData.questions.length !== numQuestions) {
      console.warn(
        `Requested ${numQuestions} questions but got ${quizData.questions.length}`
      );
    }

    const validatedQuestions = quizData.questions.map(
      (q: any, index: number) => {
        if (!q.question || !q.type || !q.answer) {
          throw new Error(`Question ${index + 1} is missing required fields`);
        }

        if (q.type === "multiple_choice") {
          if (!q.choices || !Array.isArray(q.choices) || q.choices.length < 2) {
            throw new Error(
              `Question ${
                index + 1
              }: Multiple choice must have at least 2 choices`
            );
          }
          if (!q.choices.includes(q.answer)) {
            throw new Error(
              `Question ${index + 1}: Answer must be one of the choices`
            );
          }
        }

        if (q.type === "true_or_false") {
          if (q.answer !== "true" && q.answer !== "false") {
            throw new Error(
              `Question ${
                index + 1
              }: True/false answer must be "true" or "false"`
            );
          }
        }

        const result: any = {
          question: q.question.trim(),
          type: q.type,
          choices: q.choices?.map((c: string) => c.trim()),
          answer: q.answer.trim(),
        };

        // Add explanations based on question type
        if (q.type === "multiple_choice" && q.choiceExplanations && Array.isArray(q.choiceExplanations)) {
          result.choiceExplanations = q.choiceExplanations.map((e: string) => (e || "").trim());
        }
        
        if ((q.type === "identification" || q.type === "true_or_false") && q.explanation) {
          result.explanation = q.explanation.trim();
        }

        return result;
      }
    );

    const result = {
      title: quizData.title.trim(),
      description: (quizData.description || "").trim(),
      questions: validatedQuestions,
    };

    // Cache the result
    await cache.set(`quiz_gen:${cacheKey}`, result, 3600); // 1 hour

    return result;
  } catch (error) {
    console.error("Error generating quiz:", error);
    throw new Error(
      error instanceof Error
        ? `Quiz generation failed: ${error.message}`
        : "Failed to generate quiz"
    );
  }
};

/**
 * Generate hash for flashcard content-based caching
 */
const hashFlashcardContent = (
  content: string,
  difficulty: string,
  numCards: number,
  additionalInstructions?: string
): string => {
  const contentHash = crypto
    .createHash("sha256")
    .update(content.substring(0, 1000)) // Use first 1000 chars for hash
    .digest("hex");
  return `flashcard:${contentHash}:${difficulty}:${numCards}:${
    additionalInstructions || ""
  }`;
};

export const generateFlashcardsFromContent = async (
  content: string,
  difficulty: "easy" | "medium" | "hard",
  numCards: number,
  additionalInstructions?: string
): Promise<{
  title: string;
  description: string;
  cards: Array<{
    front: string;
    back: string;
  }>;
}> => {
  try {
    // Check cache first
    const cacheKey = hashFlashcardContent(
      content,
      difficulty,
      numCards,
      additionalInstructions
    );
    const cached = await cache.get<{
      title: string;
      description: string;
      cards: Array<{ front: string; back: string }>;
    }>(`flashcard_gen:${cacheKey}`);

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

    if (additionalInstructions && additionalInstructions.trim().length > 0) {
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

    // Try primary model first, then fallback
    let flashcardData: any = null;
    let lastError: Error | null = null;
    
    for (const modelName of [PRIMARY_MODEL, FALLBACK_MODEL]) {
      try {
        console.log(`Attempting flashcard generation with model: ${modelName}`);
        const model = genAIInstance.getGenerativeModel({ model: modelName });
        
        const aiResult = await model.generateContent(prompt);
        const response = aiResult.response;
        const text = response.text();

        try {
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            flashcardData = JSON.parse(jsonMatch[0]);
          } else {
            flashcardData = JSON.parse(text);
          }
          
          if (flashcardData.title && flashcardData.cards && Array.isArray(flashcardData.cards)) {
            console.log(`Flashcard generation successful with model: ${modelName}`);
            break;
          }
        } catch (parseError) {
          console.warn(`Failed to parse response from ${modelName}:`, text.substring(0, 200));
          lastError = new Error("Failed to parse flashcard generation response");
        }
      } catch (error) {
        console.warn(`Model ${modelName} failed:`, error);
        lastError = error instanceof Error ? error : new Error(String(error));
      }
    }

    if (!flashcardData || !flashcardData.title || !flashcardData.cards) {
      throw lastError || new Error("Failed to generate flashcards with all available models");
    }

    if (flashcardData.cards.length !== numCards) {
      console.warn(
        `Requested ${numCards} flashcards but got ${flashcardData.cards.length}`
      );
    }

    const validatedCards = flashcardData.cards.map(
      (card: any, index: number) => {
        if (!card.front || !card.back) {
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

    const result = {
      title: flashcardData.title.trim(),
      description: (flashcardData.description || "").trim(),
      cards: validatedCards,
    };

    // Cache the result
    await cache.set(`flashcard_gen:${cacheKey}`, result, 3600); // 1 hour

    return result;
  } catch (error) {
    console.error("Error generating flashcards:", error);
    throw new Error(
      error instanceof Error
        ? `Flashcard generation failed: ${error.message}`
        : "Failed to generate flashcards"
    );
  }
};
