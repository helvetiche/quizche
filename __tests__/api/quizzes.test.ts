import { describe, it, expect, beforeEach } from "vitest";
import {
  POST as createQuiz,
  GET as listQuizzes,
} from "@/app/api/quizzes/route";
import {
  GET as getQuiz,
  PUT as updateQuiz,
} from "@/app/api/quizzes/[id]/route";
import { PUT as updateSettings } from "@/app/api/quizzes/[id]/settings/route";
import { createRequest, parseResponse } from "../helpers/test-request";
import {
  setMockAuth,
  setMockCSRF,
  setMockRateLimit,
  mockTeacher,
  mockStudent,
  getFirestoreMock,
} from "../setup";

const validQuizBody = {
  title: "My Quiz",
  questions: [
    {
      question: "What is 2+2?",
      type: "multiple_choice",
      choices: ["3", "4", "5"],
      answer: "4",
    },
  ],
};

describe("POST /api/quizzes", () => {
  beforeEach(() => {
    setMockAuth(null);
    setMockCSRF(true);
  });

  it("returns 401 when unauthenticated", async () => {
    const req = createRequest("/api/quizzes", {
      method: "POST",
      body: validQuizBody,
      auth: false,
    });
    const res = await createQuiz(req);
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(401);
  });

  it("returns 403 when a student tries to create a quiz", async () => {
    setMockAuth(mockStudent());
    const req = createRequest("/api/quizzes", {
      method: "POST",
      body: validQuizBody,
    });
    const res = await createQuiz(req);
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(403);
    expect(parsed.body.error).toMatch(/teacher/i);
  });

  it("returns 400 for invalid quiz data (missing questions)", async () => {
    setMockAuth(mockTeacher());
    const req = createRequest("/api/quizzes", {
      method: "POST",
      body: { title: "Empty Quiz" },
    });
    const res = await createQuiz(req);
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(400);
  });

  it("creates a quiz successfully as a teacher", async () => {
    setMockAuth(mockTeacher("teacher-quiz"));
    const req = createRequest("/api/quizzes", {
      method: "POST",
      body: validQuizBody,
    });
    const res = await createQuiz(req);
    const parsed = await parseResponse(res);

    expect(parsed.status).toBe(201);
    expect(parsed.body.success).toBe(true);
    expect(parsed.body.id).toBeTruthy();
    expect(parsed.body.message).toMatch(/created/i);
  });

  it("returns 429 when rate limit is exceeded", async () => {
    setMockAuth(mockTeacher());
    setMockRateLimit(false);
    const req = createRequest("/api/quizzes", {
      method: "POST",
      body: validQuizBody,
    });
    const res = await createQuiz(req);
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(429);
  });

  it("returns 403 when CSRF token is invalid", async () => {
    setMockAuth(mockTeacher());
    setMockCSRF(false);
    const req = createRequest("/api/quizzes", {
      method: "POST",
      body: validQuizBody,
    });
    const res = await createQuiz(req);
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(403);
  });

  it("persists the quiz to Firestore", async () => {
    setMockAuth(mockTeacher("teacher-persist"));
    const req = createRequest("/api/quizzes", {
      method: "POST",
      body: validQuizBody,
    });
    const res = await createQuiz(req);
    const parsed = await parseResponse(res);
    const quizzesStore = getFirestoreMock()._store.get("quizzes");
    expect(quizzesStore).toBeDefined();
    expect(quizzesStore?.has(parsed.body.id)).toBe(true);
  });
});

describe("GET /api/quizzes", () => {
  beforeEach(() => {
    setMockAuth(null);
  });

  it("returns 401 when unauthenticated", async () => {
    const req = createRequest("/api/quizzes", { auth: false, csrf: false });
    const res = await listQuizzes(req);
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(401);
  });

  it("returns 403 for students", async () => {
    setMockAuth(mockStudent());
    const req = createRequest("/api/quizzes", { csrf: false });
    const res = await listQuizzes(req);
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(403);
  });

  it("lists quizzes for the authenticated teacher", async () => {
    const teacher = mockTeacher("teacher-list");
    setMockAuth(teacher);
    const db = getFirestoreMock();
    db._seed("quizzes", "quiz-1", {
      teacherId: "teacher-list",
      title: "Quiz One",
      questions: [],
      totalQuestions: 5,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    db._seed("quizzes", "quiz-2", {
      teacherId: "other-teacher",
      title: "Other Quiz",
      questions: [],
      totalQuestions: 3,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const req = createRequest("/api/quizzes", { csrf: false });
    const res = await listQuizzes(req);
    const parsed = await parseResponse<{ quizzes: { id: string }[] }>(res);

    expect(parsed.status).toBe(200);
    expect(parsed.body.quizzes).toHaveLength(1);
    expect(parsed.body.quizzes[0].id).toBe("quiz-1");
    expect(parsed.body.pagination).toBeDefined();
  });

  it("supports pagination via limit query param", async () => {
    const teacher = mockTeacher("teacher-page");
    setMockAuth(teacher);
    const db = getFirestoreMock();
    for (let i = 0; i < 5; i++) {
      db._seed("quizzes", `q-${i}`, {
        teacherId: "teacher-page",
        title: `Quiz ${i}`,
        createdAt: new Date(Date.now() + i),
        updatedAt: new Date(),
      });
    }

    const req = createRequest("/api/quizzes", {
      csrf: false,
      query: { limit: "2" },
    });
    const res = await listQuizzes(req);
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(200);
    expect(parsed.body.quizzes).toHaveLength(2);
    expect(parsed.body.pagination.hasMore).toBe(true);
  });
});

describe("GET /api/quizzes/[id]", () => {
  beforeEach(() => {
    setMockAuth(null);
  });

  it("returns 401 when unauthenticated", async () => {
    const req = createRequest("/api/quizzes/quiz-1", {
      auth: false,
      csrf: false,
    });
    const res = await getQuiz(req, {
      params: Promise.resolve({ id: "quiz-1" }),
    });
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(401);
  });

  it("returns 400 when id is missing", async () => {
    setMockAuth(mockTeacher());
    const req = createRequest("/api/quizzes/", { csrf: false });
    const res = await getQuiz(req, { params: Promise.resolve({ id: "" }) });
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(400);
  });

  it("returns 404 when quiz does not exist", async () => {
    setMockAuth(mockTeacher());
    const req = createRequest("/api/quizzes/missing", { csrf: false });
    const res = await getQuiz(req, {
      params: Promise.resolve({ id: "missing" }),
    });
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(404);
  });

  it("returns 403 when a teacher tries to access another teacher's quiz", async () => {
    setMockAuth(mockTeacher("teacher-a"));
    const db = getFirestoreMock();
    db._seed("quizzes", "quiz-x", {
      teacherId: "teacher-b",
      title: "Secret Quiz",
      questions: [],
      totalQuestions: 1,
      isActive: true,
    });

    const req = createRequest("/api/quizzes/quiz-x", { csrf: false });
    const res = await getQuiz(req, {
      params: Promise.resolve({ id: "quiz-x" }),
    });
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(403);
  });

  it("returns the quiz to its owner", async () => {
    setMockAuth(mockTeacher("owner-1"));
    const db = getFirestoreMock();
    db._seed("quizzes", "quiz-own", {
      teacherId: "owner-1",
      title: "My Quiz",
      questions: [{ question: "Q?", type: "essay", answer: "A" }],
      totalQuestions: 1,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const req = createRequest("/api/quizzes/quiz-own", { csrf: false });
    const res = await getQuiz(req, {
      params: Promise.resolve({ id: "quiz-own" }),
    });
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(200);
    expect(parsed.body.quiz.title).toBe("My Quiz");
  });

  it("returns 403 when a student accesses an inactive quiz", async () => {
    setMockAuth(mockStudent("stu-inactive"));
    const db = getFirestoreMock();
    db._seed("quizzes", "quiz-inactive", {
      teacherId: "teacher-x",
      title: "Draft",
      questions: [],
      isActive: false,
    });

    const req = createRequest("/api/quizzes/quiz-inactive", { csrf: false });
    const res = await getQuiz(req, {
      params: Promise.resolve({ id: "quiz-inactive" }),
    });
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(403);
  });
});

describe("PUT /api/quizzes/[id]", () => {
  beforeEach(() => {
    setMockAuth(null);
    setMockCSRF(true);
  });

  it("returns 401 when unauthenticated", async () => {
    const req = createRequest("/api/quizzes/q1", {
      method: "PUT",
      body: validQuizBody,
      auth: false,
    });
    const res = await updateQuiz(req, {
      params: Promise.resolve({ id: "q1" }),
    });
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(401);
  });

  it("returns 403 for students", async () => {
    setMockAuth(mockStudent());
    const req = createRequest("/api/quizzes/q1", {
      method: "PUT",
      body: validQuizBody,
    });
    const res = await updateQuiz(req, {
      params: Promise.resolve({ id: "q1" }),
    });
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(403);
  });

  it("returns 404 when quiz does not exist", async () => {
    setMockAuth(mockTeacher());
    const req = createRequest("/api/quizzes/missing", {
      method: "PUT",
      body: validQuizBody,
    });
    const res = await updateQuiz(req, {
      params: Promise.resolve({ id: "missing" }),
    });
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(404);
  });

  it("returns 403 when updating another teacher's quiz", async () => {
    setMockAuth(mockTeacher("intruder"));
    const db = getFirestoreMock();
    db._seed("quizzes", "quiz-other", {
      teacherId: "owner-2",
      title: "Old",
      questions: [],
      isActive: true,
    });

    const req = createRequest("/api/quizzes/quiz-other", {
      method: "PUT",
      body: validQuizBody,
    });
    const res = await updateQuiz(req, {
      params: Promise.resolve({ id: "quiz-other" }),
    });
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(403);
  });

  it("updates the quiz successfully", async () => {
    setMockAuth(mockTeacher("updater"));
    const db = getFirestoreMock();
    db._seed("quizzes", "quiz-upd", {
      teacherId: "updater",
      title: "Old Title",
      questions: [],
      isActive: true,
    });

    const req = createRequest("/api/quizzes/quiz-upd", {
      method: "PUT",
      body: { ...validQuizBody, title: "New Title" },
    });
    const res = await updateQuiz(req, {
      params: Promise.resolve({ id: "quiz-upd" }),
    });
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(200);
    expect(parsed.body.success).toBe(true);

    const updated = db._store.get("quizzes")?.get("quiz-upd");
    expect(updated?.title).toBe("New Title");
  });

  it("returns 400 for invalid update data", async () => {
    setMockAuth(mockTeacher("updater2"));
    const db = getFirestoreMock();
    db._seed("quizzes", "quiz-bad", {
      teacherId: "updater2",
      title: "Title",
      questions: [],
      isActive: true,
    });

    const req = createRequest("/api/quizzes/quiz-bad", {
      method: "PUT",
      body: { title: "" },
    });
    const res = await updateQuiz(req, {
      params: Promise.resolve({ id: "quiz-bad" }),
    });
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(400);
  });
});

describe("PUT /api/quizzes/[id]/settings", () => {
  beforeEach(() => {
    setMockAuth(null);
    setMockCSRF(true);
  });

  it("returns 401 when unauthenticated", async () => {
    const req = createRequest("/api/quizzes/q1/settings", {
      method: "PUT",
      body: { isActive: false },
      auth: false,
    });
    const res = await updateSettings(req, {
      params: Promise.resolve({ id: "q1" }),
    });
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(401);
  });

  it("returns 403 for students", async () => {
    setMockAuth(mockStudent());
    const req = createRequest("/api/quizzes/q1/settings", {
      method: "PUT",
      body: { isActive: false },
    });
    const res = await updateSettings(req, {
      params: Promise.resolve({ id: "q1" }),
    });
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(403);
  });

  it("returns 404 when quiz does not exist", async () => {
    setMockAuth(mockTeacher());
    const req = createRequest("/api/quizzes/missing/settings", {
      method: "PUT",
      body: { isActive: false },
    });
    const res = await updateSettings(req, {
      params: Promise.resolve({ id: "missing" }),
    });
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(404);
  });

  it("updates settings successfully", async () => {
    setMockAuth(mockTeacher("settings-owner"));
    const db = getFirestoreMock();
    db._seed("quizzes", "quiz-set", {
      teacherId: "settings-owner",
      title: "Quiz",
      questions: [],
      isActive: true,
    });

    const req = createRequest("/api/quizzes/quiz-set/settings", {
      method: "PUT",
      body: { isActive: false, duration: 30, allowRetake: true },
    });
    const res = await updateSettings(req, {
      params: Promise.resolve({ id: "quiz-set" }),
    });
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(200);
    expect(parsed.body.success).toBe(true);

    const quizzesStore = db._store.get("quizzes");
    expect(quizzesStore).toBeDefined();
    const updated = quizzesStore?.get("quiz-set") as Record<
      string,
      unknown
    > | undefined;
    expect(updated).toBeDefined();
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(updated!.isActive).toBe(false);
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(updated!.duration).toBe(30);
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(updated!.allowRetake).toBe(true);
  });
});
