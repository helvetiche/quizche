import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import { adminDb } from "@/lib/firebase-admin";

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
}

interface QuizData {
  title: string;
  description?: string;
  questions: Question[];
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
  if (!data.title || typeof data.title !== "string" || data.title.trim().length === 0) {
    return false;
  }
  if (data.title.length > 200) return false;

  if (data.description && (typeof data.description !== "string" || data.description.length > 1000)) {
    return false;
  }

  if (!data.questions || !Array.isArray(data.questions) || data.questions.length === 0) {
    return false;
  }

  if (data.questions.length > 100) return false;

  return data.questions.every(validateQuestion);
};

export async function POST(request: NextRequest) {
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
        { error: "Forbidden: Teacher role required to create quizzes" },
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

      if (q.type === "multiple_choice" && q.choices && Array.isArray(q.choices)) {
        const filteredChoices = q.choices
          .map((c: string) => c.trim())
          .filter((c: string) => c.length > 0);
        if (filteredChoices.length > 0) {
          questionData.choices = filteredChoices;
        }
      }

      return questionData;
    });

    const quizData = {
      teacherId: user.uid,
      title: body.title.trim(),
      description: body.description?.trim() || "",
      questions: sanitizedQuestions,
      totalQuestions: sanitizedQuestions.length,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await adminDb.collection("quizzes").add(quizData);

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
        id: result.id,
        message: "Quiz created successfully",
      },
      { status: 201, headers }
    );
  } catch (error) {
    console.error("Quiz creation error:", error);

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

export async function GET(request: NextRequest) {
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
        { error: "Forbidden: Teacher role required to view quizzes" },
        { status: 403, headers }
      );
    }

    const quizzesSnapshot = await adminDb
      .collection("quizzes")
      .where("teacherId", "==", user.uid)
      .orderBy("createdAt", "desc")
      .get();

    const quizzes = quizzesSnapshot.docs.map((doc) => {
      const data = doc.data();
      const createdAt = data.createdAt?.toDate
        ? data.createdAt.toDate().toISOString()
        : data.createdAt instanceof Date
          ? data.createdAt.toISOString()
          : data.createdAt || new Date().toISOString();
      
      const updatedAt = data.updatedAt?.toDate
        ? data.updatedAt.toDate().toISOString()
        : data.updatedAt instanceof Date
          ? data.updatedAt.toISOString()
          : data.updatedAt || createdAt;

      return {
        id: doc.id,
        title: data.title,
        description: data.description || "",
        totalQuestions: data.totalQuestions || 0,
        isActive: data.isActive !== undefined ? data.isActive : true,
        createdAt,
        updatedAt,
      };
    });

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

    return NextResponse.json({ quizzes }, { status: 200, headers });
  } catch (error) {
    console.error("Get quizzes error:", error);

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
