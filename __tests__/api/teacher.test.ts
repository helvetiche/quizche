import { describe, it, expect, beforeEach } from "vitest";
import {
  GET as listSections,
  POST as createSection,
} from "@/app/api/teacher/sections/route";
import { GET as getSection } from "@/app/api/teacher/sections/[id]/route";
import { GET as listStudents } from "@/app/api/teacher/students/route";
import { GET as searchStudents } from "@/app/api/teacher/students/search/route";
import { GET as getAttempts } from "@/app/api/teacher/quizzes/[id]/attempts/route";
import { GET as getLiveSession } from "@/app/api/teacher/quizzes/[id]/live/route";
import { createRequest, parseResponse } from "../helpers/test-request";
import {
  setMockAuth,
  setMockCSRF,
  mockTeacher,
  mockStudent,
  getFirestoreMock,
} from "../setup";

const validSection = {
  name: "Section A",
  studentIds: ["stu-1"],
};

// ── GET & POST /api/teacher/sections ────────────────────────────────────────

describe("GET /api/teacher/sections", () => {
  beforeEach(() => {
    setMockAuth(null);
  });

  it("returns 401 when unauthenticated", async () => {
    const req = createRequest("/api/teacher/sections", {
      auth: false,
      csrf: false,
    });
    const res = await listSections(req);
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(401);
  });

  it("returns 403 for students", async () => {
    setMockAuth(mockStudent());
    const req = createRequest("/api/teacher/sections", { csrf: false });
    const res = await listSections(req);
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(403);
  });

  it("lists sections for the teacher", async () => {
    setMockAuth(mockTeacher("sec-teacher"));
    const db = getFirestoreMock();
    db._seed("sections", "sec-1", {
      teacherId: "sec-teacher",
      name: "Section A",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const req = createRequest("/api/teacher/sections", { csrf: false });
    const res = await listSections(req);
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(200);
    expect(parsed.body.sections).toBeDefined();
    expect(parsed.body.pagination).toBeDefined();
  });
});

describe("POST /api/teacher/sections", () => {
  beforeEach(() => {
    setMockAuth(null);
    setMockCSRF(true);
  });

  it("returns 401 when unauthenticated", async () => {
    const req = createRequest("/api/teacher/sections", {
      method: "POST",
      body: validSection,
      auth: false,
    });
    const res = await createSection(req);
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(401);
  });

  it("returns 403 for students", async () => {
    setMockAuth(mockStudent());
    const req = createRequest("/api/teacher/sections", {
      method: "POST",
      body: validSection,
    });
    const res = await createSection(req);
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(403);
  });

  it("returns 400 for invalid data (missing name)", async () => {
    setMockAuth(mockTeacher());
    const req = createRequest("/api/teacher/sections", {
      method: "POST",
      body: { studentIds: ["s1"] },
    });
    const res = await createSection(req);
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(400);
  });

  it("creates a section successfully", async () => {
    setMockAuth(mockTeacher("sec-creator"));
    const db = getFirestoreMock();
    db._seed("users", "stu-1", { role: "student", email: "stu1@test.com" });

    const req = createRequest("/api/teacher/sections", {
      method: "POST",
      body: validSection,
    });
    const res = await createSection(req);
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(201);
    expect(parsed.body.success).toBe(true);
    expect(parsed.body.id).toBeTruthy();
  });
});

// ── GET /api/teacher/sections/[id] ─────────────────────────────────────────

describe("GET /api/teacher/sections/[id]", () => {
  beforeEach(() => {
    setMockAuth(null);
  });

  it("returns 401 when unauthenticated", async () => {
    const req = createRequest("/api/teacher/sections/s1", {
      auth: false,
      csrf: false,
    });
    const res = await getSection(req, {
      params: Promise.resolve({ id: "s1" }),
    });
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(401);
  });

  it("returns 403 for students", async () => {
    setMockAuth(mockStudent());
    const req = createRequest("/api/teacher/sections/s1", { csrf: false });
    const res = await getSection(req, {
      params: Promise.resolve({ id: "s1" }),
    });
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(403);
  });

  it("returns 404 when section does not exist", async () => {
    setMockAuth(mockTeacher());
    const req = createRequest("/api/teacher/sections/ghost", { csrf: false });
    const res = await getSection(req, {
      params: Promise.resolve({ id: "ghost" }),
    });
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(404);
  });

  it("returns section details to its owner", async () => {
    setMockAuth(mockTeacher("sec-owner"));
    const db = getFirestoreMock();
    db._seed("sections", "sec-detail", {
      teacherId: "sec-owner",
      name: "My Section",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const req = createRequest("/api/teacher/sections/sec-detail", { csrf: false });
    const res = await getSection(req, {
      params: Promise.resolve({ id: "sec-detail" }),
    });
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(200);
    expect(parsed.body.section.name).toBe("My Section");
  });

  it("returns 403 for another teacher's section", async () => {
    setMockAuth(mockTeacher("not-sec-owner"));
    const db = getFirestoreMock();
    db._seed("sections", "sec-other", {
      teacherId: "real-owner",
      name: "Private",
    });

    const req = createRequest("/api/teacher/sections/sec-other", { csrf: false });
    const res = await getSection(req, {
      params: Promise.resolve({ id: "sec-other" }),
    });
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(403);
  });
});

// ── GET /api/teacher/students ──────────────────────────────────────────────

describe("GET /api/teacher/students", () => {
  beforeEach(() => {
    setMockAuth(null);
  });

  it("returns 401 when unauthenticated", async () => {
    const req = createRequest("/api/teacher/students", {
      auth: false,
      csrf: false,
    });
    const res = await listStudents(req);
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(401);
  });

  it("returns 403 for students", async () => {
    setMockAuth(mockStudent());
    const req = createRequest("/api/teacher/students", { csrf: false });
    const res = await listStudents(req);
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(403);
  });

  it("lists students for the teacher", async () => {
    setMockAuth(mockTeacher("stu-teacher"));
    const db = getFirestoreMock();
    db._seed("teacher_students", "ts-1", {
      teacherId: "stu-teacher",
      studentId: "stu-1",
      createdAt: new Date(),
    });
    db._seed("users", "stu-1", {
      email: "stu1@test.com",
      displayName: "Student One",
      role: "student",
    });

    const req = createRequest("/api/teacher/students", { csrf: false });
    const res = await listStudents(req);
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(200);
    expect(parsed.body.students).toBeDefined();
  });
});

// ── GET /api/teacher/students/search ────────────────────────────────────────

describe("GET /api/teacher/students/search", () => {
  beforeEach(() => {
    setMockAuth(null);
  });

  it("returns 401 when unauthenticated", async () => {
    const req = createRequest("/api/teacher/students/search", {
      auth: false,
      csrf: false,
    });
    const res = await searchStudents(req);
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(401);
  });

  it("returns 403 for students", async () => {
    setMockAuth(mockStudent());
    const req = createRequest("/api/teacher/students/search", { csrf: false });
    const res = await searchStudents(req);
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(403);
  });

  it("returns 400 when search query is missing", async () => {
    setMockAuth(mockTeacher());
    const req = createRequest("/api/teacher/students/search", { csrf: false });
    const res = await searchStudents(req);
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(400);
  });
});

// ── GET /api/teacher/quizzes/[id]/attempts ──────────────────────────────────

describe("GET /api/teacher/quizzes/[id]/attempts", () => {
  beforeEach(() => {
    setMockAuth(null);
  });

  it("returns 401 when unauthenticated", async () => {
    const req = createRequest("/api/teacher/quizzes/q1/attempts", {
      auth: false,
      csrf: false,
    });
    const res = await getAttempts(req, {
      params: Promise.resolve({ id: "q1" }),
    });
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(401);
  });

  it("returns 403 for students", async () => {
    setMockAuth(mockStudent());
    const req = createRequest("/api/teacher/quizzes/q1/attempts", { csrf: false });
    const res = await getAttempts(req, {
      params: Promise.resolve({ id: "q1" }),
    });
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(403);
  });

  it("returns attempts for the teacher's quiz", async () => {
    setMockAuth(mockTeacher("att-teacher"));
    const db = getFirestoreMock();
    db._seed("quizAttempts", "att-1", {
      quizId: "quiz-att",
      userId: "stu-1",
      score: 8,
      totalQuestions: 10,
      percentage: 80,
      completedAt: new Date(),
    });

    const req = createRequest("/api/teacher/quizzes/quiz-att/attempts", {
      csrf: false,
    });
    const res = await getAttempts(req, {
      params: Promise.resolve({ id: "quiz-att" }),
    });
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(200);
    expect(parsed.body.attempts).toBeDefined();
  });
});

// ── GET /api/teacher/quizzes/[id]/live ─────────────────────────────────────

describe("GET /api/teacher/quizzes/[id]/live", () => {
  beforeEach(() => {
    setMockAuth(null);
  });

  it("returns 401 when unauthenticated", async () => {
    const req = createRequest("/api/teacher/quizzes/q1/live", {
      auth: false,
      csrf: false,
    });
    const res = await getLiveSession(req, {
      params: Promise.resolve({ id: "q1" }),
    });
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(401);
  });

  it("returns 403 for students", async () => {
    setMockAuth(mockStudent());
    const req = createRequest("/api/teacher/quizzes/q1/live", { csrf: false });
    const res = await getLiveSession(req, {
      params: Promise.resolve({ id: "q1" }),
    });
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(403);
  });

  it("returns 400 when quiz id is missing", async () => {
    setMockAuth(mockTeacher());
    const req = createRequest("/api/teacher/quizzes//live", { csrf: false });
    const res = await getLiveSession(req, {
      params: Promise.resolve({ id: "" }),
    });
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(400);
  });

  it("returns 404 when quiz does not exist", async () => {
    setMockAuth(mockTeacher());
    const req = createRequest("/api/teacher/quizzes/ghost/live", { csrf: false });
    const res = await getLiveSession(req, {
      params: Promise.resolve({ id: "ghost" }),
    });
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(404);
  });

  it("returns 403 for another teacher's quiz", async () => {
    setMockAuth(mockTeacher("not-live-owner"));
    const db = getFirestoreMock();
    db._seed("quizzes", "quiz-live", {
      teacherId: "real-owner",
      title: "Live Quiz",
    });

    const req = createRequest("/api/teacher/quizzes/quiz-live/live", { csrf: false });
    const res = await getLiveSession(req, {
      params: Promise.resolve({ id: "quiz-live" }),
    });
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(403);
  });
});
