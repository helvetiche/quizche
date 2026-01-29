import { type NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import { adminDb } from "@/lib/firebase-admin";
import { verifyCSRF } from "@/lib/csrf";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import {
  getSecurityHeaders,
  getErrorSecurityHeaders,
} from "@/lib/security-headers";
import {
  QuizDataSchema,
  validateInput,
  sanitizeString,
  sanitizeStringArray,
} from "@/lib/validation";
import { handleApiError } from "@/lib/error-handler";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const user = await verifyAuth(request);

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized: Invalid or missing authentication token" },
        { status: 401, headers: getErrorSecurityHeaders() }
      );
    }

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "Quiz ID is required" },
        { status: 400, headers: getErrorSecurityHeaders() }
      );
    }

    // Rate limiting
    const rateLimitResult = await rateLimit({
      identifier: user.uid,
      key: `quizzes:get:${id}`,
      limit: RATE_LIMITS.general.limit,
      window: RATE_LIMITS.general.window,
    });

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please try again later." },
        {
          status: 429,
          headers: getErrorSecurityHeaders({
            rateLimitHeaders: rateLimitResult.headers,
          }),
        }
      );
    }

    const quizDoc = await adminDb.collection("quizzes").doc(id).get();

    if (!quizDoc.exists) {
      return NextResponse.json(
        { error: "Quiz not found" },
        { status: 404, headers: getErrorSecurityHeaders() }
      );
    }

    const quizData = quizDoc.data();

    // Check access permissions
    if (user.role === "teacher") {
      if (quizData?.teacherId !== user.uid) {
        return NextResponse.json(
          { error: "Forbidden: You can only access your own quizzes" },
          { status: 403, headers: getErrorSecurityHeaders() }
        );
      }
    } else if (user.role === "student") {
      // Check if quiz is active
      if (quizData?.isActive !== true) {
        return NextResponse.json(
          { error: "Quiz is not available" },
          { status: 403, headers: getErrorSecurityHeaders() }
        );
      }

      // Check if quiz is assigned to student's sections
      const quizSectionsSnapshot = await adminDb
        .collection("quiz_sections")
        .where("quizId", "==", quizDoc.id)
        .get();

      const quizSectionIds = quizSectionsSnapshot.docs.map(
        (doc) => doc.data().sectionId as string
      );

      // If quiz has section assignments, check if student is in any of those sections
      if (quizSectionIds.length > 0) {
        const studentSectionsSnapshot = await adminDb
          .collection("section_students")
          .where("studentId", "==", user.uid)
          .get();

        const studentSectionIds = studentSectionsSnapshot.docs.map(
          (doc) => doc.data().sectionId as string
        );
        const hasAccess = quizSectionIds.some((sectionId) =>
          studentSectionIds.includes(sectionId)
        );

        if (hasAccess === false) {
          return NextResponse.json(
            { error: "Forbidden: You don't have access to this quiz" },
            { status: 403, headers: getErrorSecurityHeaders() }
          );
        }
      }

      // Check availability dates
      const now = new Date();
      if (
        quizData?.availableDate !== undefined &&
        quizData?.availableDate !== null
      ) {
        const availableDateValue = quizData.availableDate;
        const availableDate =
          (availableDateValue as { toDate?: () => Date }).toDate !== undefined
            ? (availableDateValue as { toDate: () => Date }).toDate()
            : availableDateValue instanceof Date
              ? availableDateValue
              : new Date(availableDateValue as string | number | Date);
        if (now < availableDate) {
          return NextResponse.json(
            { error: "Quiz is not yet available" },
            { status: 403, headers: getErrorSecurityHeaders() }
          );
        }
      }

      if (quizData?.dueDate !== undefined && quizData?.dueDate !== null) {
        const dueDateValue = quizData.dueDate;
        const dueDate =
          (dueDateValue as { toDate?: () => Date }).toDate !== undefined
            ? (dueDateValue as { toDate: () => Date }).toDate()
            : dueDateValue instanceof Date
              ? dueDateValue
              : new Date(dueDateValue as string | number | Date);
        if (now > dueDate) {
          return NextResponse.json(
            { error: "Quiz deadline has passed" },
            { status: 403, headers: getErrorSecurityHeaders() }
          );
        }
      }
    }

    const createdAtValue = quizData?.createdAt;
    const createdAt =
      createdAtValue !== undefined &&
      createdAtValue !== null &&
      (createdAtValue as { toDate?: () => Date }).toDate !== undefined
        ? (createdAtValue as { toDate: () => Date }).toDate().toISOString()
        : createdAtValue instanceof Date
          ? createdAtValue.toISOString()
          : createdAtValue !== undefined && createdAtValue !== null
            ? String(createdAtValue)
            : new Date().toISOString();

    const updatedAtValue = quizData?.updatedAt;
    const updatedAt =
      updatedAtValue !== undefined &&
      updatedAtValue !== null &&
      (updatedAtValue as { toDate?: () => Date }).toDate !== undefined
        ? (updatedAtValue as { toDate: () => Date }).toDate().toISOString()
        : updatedAtValue instanceof Date
          ? updatedAtValue.toISOString()
          : updatedAtValue !== undefined && updatedAtValue !== null
            ? String(updatedAtValue)
            : createdAt;

    const availableDateValue = quizData?.availableDate;
    const availableDate =
      availableDateValue !== undefined &&
      availableDateValue !== null &&
      (availableDateValue as { toDate?: () => Date }).toDate !== undefined
        ? (availableDateValue as { toDate: () => Date }).toDate().toISOString()
        : availableDateValue instanceof Date
          ? availableDateValue.toISOString()
          : availableDateValue !== undefined && availableDateValue !== null
            ? String(availableDateValue)
            : null;

    const dueDateValue = quizData?.dueDate;
    const dueDate =
      dueDateValue !== undefined &&
      dueDateValue !== null &&
      (dueDateValue as { toDate?: () => Date }).toDate !== undefined
        ? (dueDateValue as { toDate: () => Date }).toDate().toISOString()
        : dueDateValue instanceof Date
          ? dueDateValue.toISOString()
          : dueDateValue !== undefined && dueDateValue !== null
            ? String(dueDateValue)
            : null;

    // Get section IDs for this quiz
    const quizSectionsSnapshot = await adminDb
      .collection("quiz_sections")
      .where("quizId", "==", quizDoc.id)
      .get();

    const sectionIds = quizSectionsSnapshot.docs.map(
      (doc) => doc.data().sectionId as string
    );

    // For students, check if they've completed the quiz
    // If completed, include answers; otherwise, hide them
    let questions: Record<string, unknown>[] =
      quizData?.questions !== undefined && Array.isArray(quizData.questions)
        ? (quizData.questions as Record<string, unknown>[])
        : [];

    if (user.role === "student") {
      // Check if student has completed this quiz
      const attemptSnapshot = await adminDb
        .collection("quizAttempts")
        .where("userId", "==", user.uid)
        .where("quizId", "==", quizDoc.id)
        .limit(1)
        .get();

      const hasCompleted = attemptSnapshot.empty === false;

      if (hasCompleted === false) {
        // Hide answers if quiz not completed
        const quizQuestions =
          quizData?.questions !== undefined && Array.isArray(quizData.questions)
            ? (quizData.questions as Record<string, unknown>[])
            : [];
        questions = quizQuestions.map((q) => {
          const questionData: Record<string, unknown> = {
            question: q.question,
            type: q.type,
          };
          if (
            q.type === "multiple_choice" &&
            q.choices !== undefined &&
            q.choices !== null
          ) {
            questionData.choices = q.choices;
          }
          if (q.imageUrl !== undefined && q.imageUrl !== null) {
            questionData.imageUrl = q.imageUrl;
          }
          return questionData;
        });
      }
      // If completed, include full question data with answers
    }

    const quiz = {
      id: quizDoc.id,
      teacherId: quizData?.teacherId,
      title: quizData?.title ?? "",
      description: quizData?.description ?? "",
      questions,
      totalQuestions: quizData?.totalQuestions ?? 0,
      isActive: quizData?.isActive !== undefined ? quizData.isActive : true,
      duration: quizData?.duration ?? null,
      availableDate,
      dueDate,
      allowRetake:
        quizData?.allowRetake !== undefined ? quizData.allowRetake : false,
      showResults:
        quizData?.showResults !== undefined ? quizData.showResults : true,
      sectionIds: user.role === "teacher" ? sectionIds : undefined,
      antiCheat: quizData?.antiCheat ?? {
        enabled: true,
        tabChangeLimit: 3,
        timeAwayThreshold: 5,
        autoDisqualifyOnRefresh: true,
        autoSubmitOnDisqualification: true,
      },
      createdAt,
      updatedAt,
    };

    return NextResponse.json(
      { quiz },
      {
        status: 200,
        headers: getSecurityHeaders({
          rateLimitHeaders: rateLimitResult.headers,
        }),
      }
    );
  } catch (error) {
    // Try to get user for error context, but don't fail if auth fails
    let userId: string | undefined;
    try {
      const user = await verifyAuth(request);
      userId = user?.uid;
    } catch {
      // Ignore auth errors in error handler
    }
    return handleApiError(error, { route: "/api/quizzes/[id]", userId });
  }
}

const QUESTION_TYPES = [
  "multiple_choice",
  "identification",
  "true_or_false",
  "essay",
  "enumeration",
  "reflection",
] as const;

type QuestionType = (typeof QUESTION_TYPES)[number];

type Question = {
  question: string;
  type: QuestionType;
  choices?: string[];
  answer: string;
  imageUrl?: string;
  explanation?: string;
  choiceExplanations?: string[];
};

type QuizData = {
  title: string;
  description?: string;
  questions: Question[];
  isActive?: boolean;
  duration?: number;
  availableDate?: string | Date;
  dueDate?: string | Date;
  allowRetake?: boolean;
  showResults?: boolean;
  antiCheat?: {
    enabled?: boolean;
    tabChangeLimit?: number;
    timeAwayThreshold?: number;
    autoDisqualifyOnRefresh?: boolean;
    autoSubmitOnDisqualification?: boolean;
  };
  sectionIds?: string[];
};

const validateQuestion = (question: unknown): question is Question => {
  if (
    question === null ||
    question === undefined ||
    typeof question !== "object"
  )
    return false;
  const q = question as Record<string, unknown>;
  if (typeof q.question !== "string" || q.question.trim().length === 0)
    return false;
  if (
    typeof q.type !== "string" ||
    !QUESTION_TYPES.includes(q.type as QuestionType)
  )
    return false;
  if (typeof q.answer !== "string" || q.answer.trim().length === 0)
    return false;

  if (q.type === "multiple_choice") {
    if (!Array.isArray(q.choices) || q.choices.length < 2) {
      return false;
    }
    if (!q.choices.every((c) => typeof c === "string")) {
      return false;
    }
  }

  if (q.type === "true_or_false") {
    if (q.answer !== "true" && q.answer !== "false") {
      return false;
    }
  }

  return true;
};

const validateQuizData = (data: unknown): data is QuizData => {
  if (data === null || data === undefined || typeof data !== "object")
    return false;
  const d = data as Record<string, unknown>;
  if (typeof d.title !== "string" || d.title.trim().length === 0) {
    return false;
  }
  if (d.title.length > 200) return false;

  if (
    d.description !== undefined &&
    (typeof d.description !== "string" || d.description.length > 1000)
  ) {
    return false;
  }

  if (!Array.isArray(d.questions) || d.questions.length === 0) {
    return false;
  }

  if (d.questions.length > 100) return false;

  return d.questions.every(validateQuestion);
};

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const user = await verifyAuth(request);

    if (user === null || user === undefined) {
      return NextResponse.json(
        { error: "Unauthorized: Invalid or missing authentication token" },
        { status: 401, headers: getErrorSecurityHeaders() }
      );
    }

    if (user.role !== "teacher") {
      return NextResponse.json(
        { error: "Forbidden: Teacher role required to update quizzes" },
        { status: 403, headers: getErrorSecurityHeaders() }
      );
    }

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "Quiz ID is required" },
        { status: 400, headers: getErrorSecurityHeaders() }
      );
    }

    // Rate limiting
    const rateLimitResult = await rateLimit({
      identifier: user.uid,
      key: `quizzes:update:${id}`,
      limit: RATE_LIMITS.general.limit,
      window: RATE_LIMITS.general.window,
    });

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please try again later." },
        {
          status: 429,
          headers: getErrorSecurityHeaders({
            rateLimitHeaders: rateLimitResult.headers,
          }),
        }
      );
    }

    // CSRF protection
    const csrfError = await verifyCSRF(request, user.uid);
    if (csrfError !== null && csrfError !== undefined) {
      return NextResponse.json(
        { error: csrfError.error },
        { status: csrfError.status, headers: csrfError.headers }
      );
    }

    const quizDoc = await adminDb.collection("quizzes").doc(id).get();

    if (!quizDoc.exists) {
      return NextResponse.json(
        { error: "Quiz not found" },
        { status: 404, headers: getErrorSecurityHeaders() }
      );
    }

    const quizData = quizDoc.data();

    if (quizData?.teacherId !== user.uid) {
      return NextResponse.json(
        { error: "Forbidden: You can only update your own quizzes" },
        { status: 403, headers: getErrorSecurityHeaders() }
      );
    }

    const body = await request.json();

    // Validate input using Zod
    const validation = validateInput(QuizDataSchema, body);
    if (validation.success === false) {
      return NextResponse.json(
        {
          error: "Invalid quiz data. Please check all fields.",
          details: validation.error.issues,
        },
        { status: 400, headers: getErrorSecurityHeaders() }
      );
    }

    const validatedData = validation.data; // Already sanitized by validateInput

    const sanitizedQuestions = validatedData.questions.map((q) => {
      const questionData: any = {
        question: sanitizeString(q.question),
        type: q.type,
        answer: sanitizeString(q.answer),
      };

      // Only include choices for multiple_choice questions
      if (q.type === "multiple_choice" && q.choices) {
        questionData.choices = sanitizeStringArray(q.choices);

        // Handle choice explanations for multiple choice
        if (q.choiceExplanations && Array.isArray(q.choiceExplanations)) {
          questionData.choiceExplanations = sanitizeStringArray(
            q.choiceExplanations
          );
        }
      }

      if (q.imageUrl) {
        questionData.imageUrl = sanitizeString(q.imageUrl);
      }

      // Handle explanation for identification and true_or_false
      if (
        (q.type === "identification" || q.type === "true_or_false") &&
        q.explanation &&
        typeof q.explanation === "string"
      ) {
        questionData.explanation = sanitizeString(q.explanation);
      }

      return questionData;
    });

    const updateData: any = {
      title: sanitizeString(validatedData.title),
      description: validatedData.description
        ? sanitizeString(validatedData.description)
        : "",
      questions: sanitizedQuestions,
      totalQuestions: sanitizedQuestions.length,
      isActive:
        validatedData.isActive !== undefined
          ? validatedData.isActive
          : quizData?.isActive !== undefined
            ? quizData.isActive
            : true,
      updatedAt: new Date(),
    };

    if (validatedData.timeLimit !== undefined) {
      updateData.duration =
        validatedData.timeLimit && validatedData.timeLimit > 0
          ? validatedData.timeLimit
          : null;
    }

    if (validatedData.coverImageUrl) {
      updateData.coverImageUrl = sanitizeString(validatedData.coverImageUrl);
    }

    await adminDb.collection("quizzes").doc(id).update(updateData);

    return NextResponse.json(
      {
        success: true,
        id,
        message: "Quiz updated successfully",
      },
      {
        status: 200,
        headers: getSecurityHeaders({
          rateLimitHeaders: rateLimitResult.headers,
        }),
      }
    );
  } catch (error) {
    // Try to get user for error context, but don't fail if auth fails
    let userId: string | undefined;
    try {
      const user = await verifyAuth(request);
      userId = user?.uid;
    } catch {
      // Ignore auth errors in error handler
    }
    return handleApiError(error, { route: "/api/quizzes/[id]", userId });
  }
}
