import { describe, it, expect, beforeEach } from "vitest";
import {
  GET as getSections,
  PUT as updateSections,
} from "@/app/api/quizzes/[id]/sections/route";
import { POST as generateQuiz } from "@/app/api/quizzes/generate/route";
import { createFormDataRequest, createRequest, parseResponse } from "../helpers/test-request";
import {
  setMockAuth,
  setMockCSRF,
  mockTeacher,
  mockStudent,
  getFirestoreMock,
} from "../setup";

describe("GET /api/quizzes/[id]/sections", () => {
  beforeEach(() => {
    setMockAuth(null);
  });

  it("returns 401 when unauthenticated", async () => {
    const req = createRequest("/api/quizzes/q1/sections", {
      auth: false,
      csrf: false,
    });
    const res = await getSections(req, {
      params: Promise.resolve({ id: "q1" }),
    });
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(401);
  });

  it("returns section assignments for a quiz", async () => {
    setMockAuth(mockTeacher());
    const db = getFirestoreMock();
    db._seed("quiz_sections", "qa1", {
      quizId: "quiz-s",
      sectionId: "sec-1",
    });
    db._seed("quiz_excluded_students", "ex1", {
      quizId: "quiz-s",
      studentId: "stu-x",
    });

    const req = createRequest("/api/quizzes/quiz-s/sections", { csrf: false });
    const res = await getSections(req, {
      params: Promise.resolve({ id: "quiz-s" }),
    });
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(200);
    expect(parsed.body.sectionIds).toContain("sec-1");
    expect(parsed.body.excludedStudentIds).toContain("stu-x");
  });
});

describe("PUT /api/quizzes/[id]/sections", () => {
  beforeEach(() => {
    setMockAuth(null);
    setMockCSRF(true);
  });

  it("returns 401 when unauthenticated", async () => {
    const req = createRequest("/api/quizzes/q1/sections", {
      method: "PUT",
      body: { sectionIds: [] },
      auth: false,
    });
    const res = await updateSections(req, {
      params: Promise.resolve({ id: "q1" }),
    });
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(401);
  });

  it("returns 403 for students", async () => {
    setMockAuth(mockStudent());
    const req = createRequest("/api/quizzes/q1/sections", {
      method: "PUT",
      body: { sectionIds: [] },
    });
    const res = await updateSections(req, {
      params: Promise.resolve({ id: "q1" }),
    });
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(403);
  });

  it("returns 404 when quiz does not exist", async () => {
    setMockAuth(mockTeacher());
    const req = createRequest("/api/quizzes/ghost/sections", {
      method: "PUT",
      body: { sectionIds: [] },
    });
    const res = await updateSections(req, {
      params: Promise.resolve({ id: "ghost" }),
    });
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(404);
  });

  it("returns 403 when updating another teacher's quiz sections", async () => {
    setMockAuth(mockTeacher("intruder"));
    const db = getFirestoreMock();
    db._seed("quizzes", "quiz-other", {
      teacherId: "real-owner",
      title: "Other",
    });

    const req = createRequest("/api/quizzes/quiz-other/sections", {
      method: "PUT",
      body: { sectionIds: [] },
    });
    const res = await updateSections(req, {
      params: Promise.resolve({ id: "quiz-other" }),
    });
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(403);
  });

  it("returns 400 when sectionIds is not an array", async () => {
    setMockAuth(mockTeacher("owner-s"));
    const db = getFirestoreMock();
    db._seed("quizzes", "quiz-s2", { teacherId: "owner-s", title: "Q" });

    const req = createRequest("/api/quizzes/quiz-s2/sections", {
      method: "PUT",
      body: { sectionIds: "not-array" },
    });
    const res = await updateSections(req, {
      params: Promise.resolve({ id: "quiz-s2" }),
    });
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(400);
  });

  it("updates section assignments successfully", async () => {
    setMockAuth(mockTeacher("owner-s3"));
    const db = getFirestoreMock();
    db._seed("quizzes", "quiz-s3", { teacherId: "owner-s3", title: "Q" });
    db._seed("sections", "sec-1", { teacherId: "owner-s3", name: "Sec 1" });
    db._seed("sections", "sec-2", { teacherId: "owner-s3", name: "Sec 2" });

    const req = createRequest("/api/quizzes/quiz-s3/sections", {
      method: "PUT",
      body: { sectionIds: ["sec-1", "sec-2"], excludedStudentIds: [] },
    });
    const res = await updateSections(req, {
      params: Promise.resolve({ id: "quiz-s3" }),
    });
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(200);
    expect(parsed.body.success).toBe(true);
  });
});

describe("POST /api/quizzes/generate", () => {
  beforeEach(() => {
    setMockAuth(null);
    setMockCSRF(true);
  });

  it("returns 401 when unauthenticated", async () => {
    const req = createFormDataRequest(
      "/api/quizzes/generate",
      { difficulty: "easy" },
      { auth: false }
    );
    const res = await generateQuiz(req);
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(401);
  });

  it("returns 403 for students", async () => {
    setMockAuth(mockStudent());
    const req = createFormDataRequest("/api/quizzes/generate", {
      difficulty: "easy",
    });
    const res = await generateQuiz(req);
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(403);
  });

  it("returns 400 when no file is provided", async () => {
    setMockAuth(mockTeacher());
    const req = createFormDataRequest("/api/quizzes/generate", {
      difficulty: "easy",
      numQuestions: "5",
    });
    const res = await generateQuiz(req);
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(400);
    expect(parsed.body.error).toMatch(/PDF file is required/i);
  });

  it("returns 400 when difficulty or numQuestions is missing", async () => {
    setMockAuth(mockTeacher());
    const req = createFormDataRequest("/api/quizzes/generate", {
      file: {
        file: Buffer.from("fake-pdf"),
        filename: "doc.pdf",
        type: "application/pdf",
      },
    });
    const res = await generateQuiz(req);
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(400);
    expect(parsed.body.error).toMatch(/difficulty/i);
  });
});
