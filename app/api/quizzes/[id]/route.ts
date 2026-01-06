import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import { adminDb } from "@/lib/firebase-admin";
import { verifyCSRF } from "@/lib/csrf";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await verifyAuth(request);

    if (!user) {
      const headers = {
        "Content-Type": "application/json; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "no-store, no-cache, must-revalidate",
      };
      return NextResponse.json(
        { error: "Unauthorized: Invalid or missing authentication token" },
        { status: 401, headers }
      );
    }

    const { id } = await params;

    if (!id) {
      const headers = {
        "Content-Type": "application/json; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "no-store, no-cache, must-revalidate",
      };
      return NextResponse.json(
        { error: "Quiz ID is required" },
        { status: 400, headers }
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
      const headers = {
        "Content-Type": "application/json; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
        ...rateLimitResult.headers,
      };
      return NextResponse.json(
        { error: "Rate limit exceeded. Please try again later." },
        { status: 429, headers }
      );
    }

    const quizDoc = await adminDb.collection("quizzes").doc(id).get();

    if (!quizDoc.exists) {
      const headers = {
        "Content-Type": "application/json; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "no-store, no-cache, must-revalidate",
      };
      return NextResponse.json(
        { error: "Quiz not found" },
        { status: 404, headers }
      );
    }

    const quizData = quizDoc.data();

    // Check access permissions
    if (user.role === "teacher") {
      if (quizData?.teacherId !== user.uid) {
        const headers = {
          "Content-Type": "application/json; charset=utf-8",
          "X-Content-Type-Options": "nosniff",
          "Cache-Control": "no-store, no-cache, must-revalidate",
        };
        return NextResponse.json(
          { error: "Forbidden: You can only access your own quizzes" },
          { status: 403, headers }
        );
      }
    } else if (user.role === "student") {
      // Check if quiz is active
      if (!quizData?.isActive) {
        const headers = {
          "Content-Type": "application/json; charset=utf-8",
          "X-Content-Type-Options": "nosniff",
          "Cache-Control": "no-store, no-cache, must-revalidate",
        };
        return NextResponse.json(
          { error: "Quiz is not available" },
          { status: 403, headers }
        );
      }

      // Check if quiz is assigned to student's sections
      const quizSectionsSnapshot = await adminDb
        .collection("quiz_sections")
        .where("quizId", "==", quizDoc.id)
        .get();

      const quizSectionIds = quizSectionsSnapshot.docs.map(
        (doc) => doc.data().sectionId
      );

      // If quiz has section assignments, check if student is in any of those sections
      if (quizSectionIds.length > 0) {
        const studentSectionsSnapshot = await adminDb
          .collection("section_students")
          .where("studentId", "==", user.uid)
          .get();

        const studentSectionIds = studentSectionsSnapshot.docs.map(
          (doc) => doc.data().sectionId
        );
        const hasAccess = quizSectionIds.some((sectionId) =>
          studentSectionIds.includes(sectionId)
        );

        if (!hasAccess) {
          const headers = {
            "Content-Type": "application/json; charset=utf-8",
            "X-Content-Type-Options": "nosniff",
            "Cache-Control": "no-store, no-cache, must-revalidate",
          };
          return NextResponse.json(
            { error: "Forbidden: You don't have access to this quiz" },
            { status: 403, headers }
          );
        }
      }

      // Check availability dates
      const now = new Date();
      if (quizData?.availableDate) {
        const availableDate = quizData.availableDate?.toDate
          ? quizData.availableDate.toDate()
          : quizData.availableDate instanceof Date
          ? quizData.availableDate
          : new Date(quizData.availableDate);
        if (now < availableDate) {
          const headers = {
            "Content-Type": "application/json; charset=utf-8",
            "X-Content-Type-Options": "nosniff",
            "Cache-Control": "no-store, no-cache, must-revalidate",
          };
          return NextResponse.json(
            { error: "Quiz is not yet available" },
            { status: 403, headers }
          );
        }
      }

      if (quizData?.dueDate) {
        const dueDate = quizData.dueDate?.toDate
          ? quizData.dueDate.toDate()
          : quizData.dueDate instanceof Date
          ? quizData.dueDate
          : new Date(quizData.dueDate);
        if (now > dueDate) {
          const headers = {
            "Content-Type": "application/json; charset=utf-8",
            "X-Content-Type-Options": "nosniff",
            "Cache-Control": "no-store, no-cache, must-revalidate",
          };
          return NextResponse.json(
            { error: "Quiz deadline has passed" },
            { status: 403, headers }
          );
        }
      }
    }

    const createdAt = quizData?.createdAt?.toDate
      ? quizData.createdAt.toDate().toISOString()
      : quizData?.createdAt instanceof Date
      ? quizData.createdAt.toISOString()
      : quizData?.createdAt || new Date().toISOString();

    const updatedAt = quizData?.updatedAt?.toDate
      ? quizData.updatedAt.toDate().toISOString()
      : quizData?.updatedAt instanceof Date
      ? quizData.updatedAt.toISOString()
      : quizData?.updatedAt || createdAt;

    const availableDate = quizData?.availableDate?.toDate
      ? quizData.availableDate.toDate().toISOString()
      : quizData?.availableDate instanceof Date
      ? quizData.availableDate.toISOString()
      : quizData?.availableDate || null;

    const dueDate = quizData?.dueDate?.toDate
      ? quizData.dueDate.toDate().toISOString()
      : quizData?.dueDate instanceof Date
      ? quizData.dueDate.toISOString()
      : quizData?.dueDate || null;

    // Get section IDs for this quiz
    const quizSectionsSnapshot = await adminDb
      .collection("quiz_sections")
      .where("quizId", "==", quizDoc.id)
      .get();

    const sectionIds = quizSectionsSnapshot.docs.map(
      (doc) => doc.data().sectionId
    );

    // For students, check if they've completed the quiz
    // If completed, include answers; otherwise, hide them
    let questions = quizData?.questions || [];

    if (user.role === "student") {
      // Check if student has completed this quiz
      const attemptSnapshot = await adminDb
        .collection("quizAttempts")
        .where("userId", "==", user.uid)
        .where("quizId", "==", quizDoc.id)
        .limit(1)
        .get();

      const hasCompleted = !attemptSnapshot.empty;

      if (!hasCompleted) {
        // Hide answers if quiz not completed
        questions = (quizData?.questions || []).map((q: any) => {
          const questionData: any = {
            question: q.question,
            type: q.type,
          };
          if (q.type === "multiple_choice" && q.choices) {
            questionData.choices = q.choices;
          }
          if (q.imageUrl) {
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
      title: quizData?.title || "",
      description: quizData?.description || "",
      questions,
      totalQuestions: quizData?.totalQuestions || 0,
      isActive: quizData?.isActive !== undefined ? quizData.isActive : true,
      duration: quizData?.duration || null,
      availableDate,
      dueDate,
      allowRetake:
        quizData?.allowRetake !== undefined ? quizData.allowRetake : false,
      showResults:
        quizData?.showResults !== undefined ? quizData.showResults : true,
      sectionIds: user.role === "teacher" ? sectionIds : undefined,
      antiCheat: quizData?.antiCheat || {
        enabled: true,
        tabChangeLimit: 3,
        timeAwayThreshold: 5,
        autoDisqualifyOnRefresh: true,
        autoSubmitOnDisqualification: true,
      },
      createdAt,
      updatedAt,
    };

    const headers = {
      "Content-Type": "application/json; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "X-XSS-Protection": "1; mode=block",
      "Strict-Transport-Security":
        "max-age=31536000; includeSubDomains; preload",
      "Content-Security-Policy":
        "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://*.firebaseio.com https://*.googleapis.com;",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "Permissions-Policy": "geolocation=(), microphone=(), camera=()",
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      Vary: "Accept, Authorization",
      ...rateLimitResult.headers,
    };

    return NextResponse.json({ quiz }, { status: 200, headers });
  } catch (error) {
    console.error("Get quiz error:", error);

    const errorHeaders = {
      "Content-Type": "application/json; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "Cache-Control": "no-store, no-cache, must-revalidate",
    };

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: errorHeaders }
    );
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

interface Question {
  question: string;
  type: QuestionType;
  choices?: string[];
  answer: string;
  imageUrl?: string;
}

interface QuizData {
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
}

const validateQuestion = (question: any): question is Question => {
  if (!question || typeof question !== "object") return false;
  if (!question.question || typeof question.question !== "string") return false;
  if (!question.type || !QUESTION_TYPES.includes(question.type)) return false;
  if (!question.answer || typeof question.answer !== "string") return false;

  if (question.type === "multiple_choice") {
    if (
      !question.choices ||
      !Array.isArray(question.choices) ||
      question.choices.length < 2
    ) {
      return false;
    }
    if (!question.choices.every((c: any) => typeof c === "string")) {
      return false;
    }
  }

  if (question.type === "true_or_false") {
    if (question.answer !== "true" && question.answer !== "false") {
      return false;
    }
  }

  return true;
};

const validateQuizData = (data: any): data is QuizData => {
  if (!data || typeof data !== "object") return false;
  if (
    !data.title ||
    typeof data.title !== "string" ||
    data.title.trim().length === 0
  ) {
    return false;
  }
  if (data.title.length > 200) return false;

  if (
    data.description &&
    (typeof data.description !== "string" || data.description.length > 1000)
  ) {
    return false;
  }

  if (
    !data.questions ||
    !Array.isArray(data.questions) ||
    data.questions.length === 0
  ) {
    return false;
  }

  if (data.questions.length > 100) return false;

  return data.questions.every(validateQuestion);
};

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await verifyAuth(request);

    if (!user) {
      const headers = {
        "Content-Type": "application/json; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "no-store, no-cache, must-revalidate",
      };
      return NextResponse.json(
        { error: "Unauthorized: Invalid or missing authentication token" },
        { status: 401, headers }
      );
    }

    if (user.role !== "teacher") {
      const headers = {
        "Content-Type": "application/json; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "no-store, no-cache, must-revalidate",
      };
      return NextResponse.json(
        { error: "Forbidden: Teacher role required to update quizzes" },
        { status: 403, headers }
      );
    }

    // CSRF protection
    const csrfError = await verifyCSRF(request, user.uid);
    if (csrfError) {
      return NextResponse.json(
        { error: csrfError.error },
        { status: csrfError.status, headers: csrfError.headers }
      );
    }

    const { id } = await params;

    if (!id) {
      const headers = {
        "Content-Type": "application/json; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "no-store, no-cache, must-revalidate",
      };
      return NextResponse.json(
        { error: "Quiz ID is required" },
        { status: 400, headers }
      );
    }

    const quizDoc = await adminDb.collection("quizzes").doc(id).get();

    if (!quizDoc.exists) {
      const headers = {
        "Content-Type": "application/json; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "no-store, no-cache, must-revalidate",
      };
      return NextResponse.json(
        { error: "Quiz not found" },
        { status: 404, headers }
      );
    }

    const quizData = quizDoc.data();

    if (quizData?.teacherId !== user.uid) {
      const headers = {
        "Content-Type": "application/json; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "no-store, no-cache, must-revalidate",
      };
      return NextResponse.json(
        { error: "Forbidden: You can only update your own quizzes" },
        { status: 403, headers }
      );
    }

    const body = await request.json();

    if (!validateQuizData(body)) {
      const headers = {
        "Content-Type": "application/json; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "no-store, no-cache, must-revalidate",
      };
      return NextResponse.json(
        { error: "Invalid quiz data. Please check all fields." },
        { status: 400, headers }
      );
    }

    const sanitizedQuestions = body.questions.map((q: Question) => {
      const questionData: any = {
        question: q.question.trim(),
        type: q.type,
        answer: q.answer.trim(),
      };

      // Only include choices for multiple_choice questions with valid choices
      if (
        q.type === "multiple_choice" &&
        q.choices &&
        Array.isArray(q.choices)
      ) {
        const filteredChoices = q.choices
          .map((c: string) => c.trim())
          .filter((c: string) => c.length > 0);
        if (filteredChoices.length > 0) {
          questionData.choices = filteredChoices;
        }
      }

      if (
        q.imageUrl &&
        typeof q.imageUrl === "string" &&
        q.imageUrl.trim().length > 0
      ) {
        questionData.imageUrl = q.imageUrl.trim();
      }

      return questionData;
    });

    const updateData: any = {
      title: body.title.trim(),
      description: body.description?.trim() || "",
      questions: sanitizedQuestions,
      totalQuestions: sanitizedQuestions.length,
      isActive:
        body.isActive !== undefined
          ? body.isActive
          : quizData?.isActive !== undefined
          ? quizData.isActive
          : true,
      updatedAt: new Date(),
    };

    if (body.duration !== undefined) {
      updateData.duration =
        body.duration && body.duration > 0 ? body.duration : null;
    }

    if (body.availableDate !== undefined) {
      updateData.availableDate = body.availableDate
        ? new Date(body.availableDate)
        : null;
    }

    if (body.dueDate !== undefined) {
      updateData.dueDate = body.dueDate ? new Date(body.dueDate) : null;
    }

    if (body.allowRetake !== undefined) {
      updateData.allowRetake = body.allowRetake;
    }

    if (body.showResults !== undefined) {
      updateData.showResults = body.showResults;
    }

    if (body.antiCheat !== undefined) {
      updateData.antiCheat = {
        enabled:
          body.antiCheat.enabled !== undefined ? body.antiCheat.enabled : true,
        tabChangeLimit:
          body.antiCheat.tabChangeLimit !== undefined
            ? body.antiCheat.tabChangeLimit
            : 3,
        timeAwayThreshold:
          body.antiCheat.timeAwayThreshold !== undefined
            ? body.antiCheat.timeAwayThreshold
            : 5,
        autoDisqualifyOnRefresh:
          body.antiCheat.autoDisqualifyOnRefresh !== undefined
            ? body.antiCheat.autoDisqualifyOnRefresh
            : true,
        autoSubmitOnDisqualification:
          body.antiCheat.autoSubmitOnDisqualification !== undefined
            ? body.antiCheat.autoSubmitOnDisqualification
            : true,
      };
    }

    await adminDb.collection("quizzes").doc(id).update(updateData);

    // Update section assignments using batch write for atomicity
    if (body.sectionIds !== undefined) {
      await adminDb.runTransaction(async (transaction) => {
        // Remove existing section assignments
        const existingAssignments = await adminDb
          .collection("quiz_sections")
          .where("quizId", "==", id)
          .get();

        existingAssignments.docs.forEach((doc) => {
          transaction.delete(doc.ref);
        });

        // Add new section assignments
        if (Array.isArray(body.sectionIds) && body.sectionIds.length > 0) {
          const uniqueSectionIds = [...new Set(body.sectionIds)];
          uniqueSectionIds.forEach((sectionId: string) => {
            const sectionRef = adminDb.collection("quiz_sections").doc();
            transaction.set(sectionRef, {
              quizId: id,
              sectionId,
              assignedAt: new Date(),
            });
          });
        }
      });
    }

    const headers = {
      "Content-Type": "application/json; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "X-XSS-Protection": "1; mode=block",
      "Strict-Transport-Security":
        "max-age=31536000; includeSubDomains; preload",
      "Content-Security-Policy":
        "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://*.firebaseio.com https://*.googleapis.com;",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "Permissions-Policy": "geolocation=(), microphone=(), camera=()",
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      Vary: "Accept, Authorization",
    };

    return NextResponse.json(
      {
        success: true,
        id,
        message: "Quiz updated successfully",
      },
      { status: 200, headers }
    );
  } catch (error) {
    console.error("Quiz update error:", error);

    const errorHeaders = {
      "Content-Type": "application/json; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "Cache-Control": "no-store, no-cache, must-revalidate",
    };

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: errorHeaders }
    );
  }
}
