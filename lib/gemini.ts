import { GoogleGenerativeAI } from "@google/generative-ai";

let genAI: GoogleGenerativeAI | null = null;

const initializeGemini = (): GoogleGenerativeAI => {
  if (genAI) {
    return genAI;
  }

  const apiKey = process.env.NEXT_PRIVATE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("NEXT_PRIVATE_GEMINI_API_KEY is not set");
  }

  genAI = new GoogleGenerativeAI(apiKey);
  return genAI;
};

export const extractTextFromPDF = async (
  pdfBuffer: Buffer
): Promise<string> => {
  try {
    const genAIInstance = initializeGemini();
    const model = genAIInstance.getGenerativeModel({
      model: "gemini-2.0-flash-exp",
    });

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
    const extractedText = response.text();

    if (!extractedText || extractedText.trim().length === 0) {
      throw new Error("Failed to extract text from PDF");
    }

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
  }>;
}> => {
  try {
    const genAIInstance = initializeGemini();
    const model = genAIInstance.getGenerativeModel({
      model: "gemini-2.0-flash-exp",
    });

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
      "choices": ["Option A", "Option B", "Option C", "Option D"], // Only for multiple_choice
      "answer": "Correct answer"
    }
  ]
}

Important:
- For multiple_choice: Include exactly 4 choices, and the answer must match one of the choices exactly
- For true_or_false: Answer must be exactly "true" or "false"
- For identification: Answer should be concise and specific
- Ensure questions cover different aspects of the content
- Make sure all questions are answerable based on the provided content
- Return ONLY valid JSON, no additional text or markdown formatting`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    let quizData;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        quizData = JSON.parse(jsonMatch[0]);
      } else {
        quizData = JSON.parse(text);
      }
    } catch (parseError) {
      console.error("Failed to parse Gemini response:", text);
      throw new Error("Failed to parse quiz generation response");
    }

    if (
      !quizData.title ||
      !quizData.questions ||
      !Array.isArray(quizData.questions)
    ) {
      throw new Error("Invalid quiz data structure from AI");
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

        return {
          question: q.question.trim(),
          type: q.type,
          choices: q.choices?.map((c: string) => c.trim()),
          answer: q.answer.trim(),
        };
      }
    );

    return {
      title: quizData.title.trim(),
      description: (quizData.description || "").trim(),
      questions: validatedQuestions,
    };
  } catch (error) {
    console.error("Error generating quiz:", error);
    throw new Error(
      error instanceof Error
        ? `Quiz generation failed: ${error.message}`
        : "Failed to generate quiz"
    );
  }
};
