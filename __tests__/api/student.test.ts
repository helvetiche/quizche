import { describe, it, expect, beforeEach } from "vitest";
import { GET as listStudentQuizzes } from "@/app/api/student/quizzes/route";
import { POST as submitQuiz } from "@/app/api/student/quizzes/submit/route";
import { POST as updateSession } from "@/app/api/student/quizzes/[id]/session/route";
import { createRequest, parseResponse } from "../helpers/test-request";
import {
  setMockAuth,
  setMockCSRF,
  mockTeacher,
  mockStudent,
  getFirestoreMock,
} from "../setup";

// ── GET /api/student/quizzes ────────────────────────────────────────────────

describe("GET /api/student/quizzes", () => {
  beforeEach(() => {
    setMockAuth(null);
  });

  it("returns 401 when unauthenticated", async () => {
    const req = createRequest("/api/student/quizzes", {
      auth: false,
      csrf: false,
    });
    const res = await listStudentQuizzes(req);
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(401);
  });

  it("returns 403 for teachers", async () => {
    setMockAuth(mockTeacher());
    const req = createRequest("/api/student/quizzes", { csrf: false });
    const res = await listStudentQuizzes(req);
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(403);
  });

  it("returns assigned quizzes for the student", async () => {
    setMockAuth(mockStudent("stu-q-list"));
    const db = getFirestoreMock();
    db._seed("section_students", "ss-1", {
      sectionId: "sec-1",
      studentId: "stu-q-list",
    });
    db._seed("quiz_sections", "qs-1", {
      quizId: "quiz-assigned",
      sectionId: "sec-1",
    });
    db._seed("quizzes", "quiz-assigned", {
      teacherId: "teacher-x",
      title: "Assigned Quiz",
      isActive: true,
      questions: [],
    });

    const req = createRequest("/api/student/quizzes", { csrf: false });
    const res = await listStudentQuizzes(req);
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(200);
    expect(parsed.body.quizzes).toBeDefined();
  });
});

// ── POST /api/student/quizzes/submit ────────────────────────────────────────

describe("POST /api/student/quizzes/submit", () => {
  beforeEach(() => {
    setMockAuth(null);
    setMockCSRF(true);
  });

  it("returns 401 when unauthenticated", async () => {
    const req = createRequest("/api/student/quizzes/submit", {
      method: "POST",
      body: { quizId: "q1", answers: [] },
      auth: false,
    });
    const res = await submitQuiz(req);
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(401);
  });

  it("returns 403 for teachers", async () => {
    setMockAuth(mockTeacher());
    const req = createRequest("/api/student/quizzes/submit", {
      method: "POST",
      body: { quizId: "q1", answers: [] },
    });
    const res = await submitQuiz(req);
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(403);
  });

  it("returns 400 for invalid data (missing quizId)", async () => {
    setMockAuth(mockStudent());
    const req = createRequest("/api/student/quizzes/submit", {
      method: "POST",
      body: { answers: [] },
    });
    const res = await submitQuiz(req);
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(400);
  });

  it("returns 404 when quiz does not exist", async () => {
    setMockAuth(mockStudent("stu-submit"));
    const req = createRequest("/api/student/quizzes/submit", {
      method: "POST",
      body: { quizId: "ghost", answers: [{ questionIndex: 0, answer: "A" }] },
    });
    const res = await submitQuiz(req);
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(404);
  });

  it("returns 400 when student has already taken the quiz", async () => {
    setMockAuth(mockStudent("stu-retake"));
    const db = getFirestoreMock();
    db._seed("quizzes", "quiz-taken", {
      teacherId: "teacher-x",
      title: "Taken Quiz",
      questions: [{ question: "Q?", type: "essay", answer: "A" }],
    });
    db._seed("quizAttempts", "existing-attempt", {
      userId: "stu-retake",
      quizId: "quiz-taken",
    });

    const req = createRequest("/api/student/quizzes/submit", {
      method: "POST",
      body: {
        quizId: "quiz-taken",
        answers: [{ questionIndex: 0, answer: "A" }],
      },
    });
    const res = await submitQuiz(req);
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(400);
    expect(parsed.body.error).toMatch(/already taken/i);
  });

  it("submits a quiz successfully", async () => {
    setMockAuth(mockStudent("stu-first-submit"));
    const db = getFirestoreMock();
    db._seed("quizzes", "quiz-new", {
      teacherId: "teacher-x",
      title: "New Quiz",
      questions: [
        { question: "Capital of France?", type: "identification", answer: "Paris" },
      ],
    });
    db._seed("users", "stu-first-submit", {
      email: "stu@test.com",
      displayName: "Student",
    });

    const req = createRequest("/api/student/quizzes/submit", {
      method: "POST",
      body: {
        quizId: "quiz-new",
        answers: [{ questionIndex: 0, answer: "Paris" }],
      },
    });
    const res = await submitQuiz(req);
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(200);
    expect(parsed.body.success).toBe(true);
    expect(parsed.body.score).toBe(1);
    expect(parsed.body.percentage).toBe(100);
  });
});

// ── POST /api/student/quizzes/[id]/session ─────────────────────────────────

describe("POST /api/student/quizzes/[id]/session", () => {
  beforeEach(() => {
    setMockAuth(null);
    setMockCSRF(true);
  });

  it("returns 401 when unauthenticated", async () => {
    const req = createRequest("/api/student/quizzes/q1/session", {
      method: "POST",
      body: { sessionId: "s1" },
      auth: false,
    });
    const res = await updateSession(req, {
      params: Promise.resolve({ id: "q1" }),
    });
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(401);
  });

  it("returns 403 for teachers", async () => {
    setMockAuth(mockTeacher());
    const req = createRequest("/api/student/quizzes/q1/session", {
      method: "POST",
      body: { sessionId: "s1" },
    });
    const res = await updateSession(req, {
      params: Promise.resolve({ id: "q1" }),
    });
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(403);
  });

  it("returns 400 for invalid session data", async () => {
    setMockAuth(mockStudent());
    const req = createRequest("/api/student/quizzes/q1/session", {
      method: "POST",
      body: { sessionId: "" },
    });
    const res = await updateSession(req, {
      params: Promise.resolve({ id: "q1" }),
    });
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(400);
  });
});
