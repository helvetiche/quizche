import { describe, it, expect, beforeEach } from "vitest";
import {
  POST as saveDraft,
  GET as listDrafts,
} from "@/app/api/quizzes/drafts/route";
import {
  GET as getDraft,
  DELETE as deleteDraft,
} from "@/app/api/quizzes/drafts/[id]/route";
import { createRequest, parseResponse } from "../helpers/test-request";
import {
  setMockAuth,
  setMockCSRF,
  mockTeacher,
  mockStudent,
  getFirestoreMock,
} from "../setup";

const validDraft = {
  title: "Draft Quiz",
  questions: [{ question: "Q?", type: "multiple_choice", answer: "A" }],
};

describe("POST /api/quizzes/drafts", () => {
  beforeEach(() => {
    setMockAuth(null);
    setMockCSRF(true);
  });

  it("returns 401 when unauthenticated", async () => {
    const req = createRequest("/api/quizzes/drafts", {
      method: "POST",
      body: validDraft,
      auth: false,
    });
    const res = await saveDraft(req);
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(401);
  });

  it("returns 403 for students", async () => {
    setMockAuth(mockStudent());
    const req = createRequest("/api/quizzes/drafts", {
      method: "POST",
      body: validDraft,
    });
    const res = await saveDraft(req);
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(403);
  });

  it("creates a new draft successfully", async () => {
    setMockAuth(mockTeacher("draft-creator"));
    const req = createRequest("/api/quizzes/drafts", {
      method: "POST",
      body: validDraft,
    });
    const res = await saveDraft(req);
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(201);
    expect(parsed.body.success).toBe(true);
    expect(parsed.body.id).toBeTruthy();
  });

  it("updates an existing draft when draftId is provided", async () => {
    setMockAuth(mockTeacher("draft-updater"));
    const db = getFirestoreMock();
    db._seed("quizDrafts", "draft-1", {
      teacherId: "draft-updater",
      title: "Old Draft",
      questions: [],
    });

    const req = createRequest("/api/quizzes/drafts", {
      method: "POST",
      body: { ...validDraft, draftId: "draft-1", title: "Updated Draft" },
    });
    const res = await saveDraft(req);
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(200);
    expect(parsed.body.id).toBe("draft-1");
  });

  it("returns 404 when updating a non-existent draft", async () => {
    setMockAuth(mockTeacher());
    const req = createRequest("/api/quizzes/drafts", {
      method: "POST",
      body: { ...validDraft, draftId: "ghost" },
    });
    const res = await saveDraft(req);
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(404);
  });

  it("returns 403 when updating another teacher's draft", async () => {
    setMockAuth(mockTeacher("intruder"));
    const db = getFirestoreMock();
    db._seed("quizDrafts", "draft-2", {
      teacherId: "owner-x",
      title: "Other Draft",
      questions: [],
    });

    const req = createRequest("/api/quizzes/drafts", {
      method: "POST",
      body: { ...validDraft, draftId: "draft-2" },
    });
    const res = await saveDraft(req);
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(403);
  });

  it("allows an empty draft (lenient validation)", async () => {
    setMockAuth(mockTeacher());
    const req = createRequest("/api/quizzes/drafts", {
      method: "POST",
      body: {},
    });
    const res = await saveDraft(req);
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(201);
  });
});

describe("GET /api/quizzes/drafts", () => {
  beforeEach(() => {
    setMockAuth(null);
  });

  it("returns 401 when unauthenticated", async () => {
    const req = createRequest("/api/quizzes/drafts", { auth: false, csrf: false });
    const res = await listDrafts(req);
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(401);
  });

  it("returns 403 for students", async () => {
    setMockAuth(mockStudent());
    const req = createRequest("/api/quizzes/drafts", { csrf: false });
    const res = await listDrafts(req);
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(403);
  });

  it("lists drafts for the teacher", async () => {
    setMockAuth(mockTeacher("drafts-owner"));
    const db = getFirestoreMock();
    db._seed("quizDrafts", "d1", {
      teacherId: "drafts-owner",
      title: "Draft A",
      questions: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const req = createRequest("/api/quizzes/drafts", { csrf: false });
    const res = await listDrafts(req);
    const parsed = await parseResponse<{ drafts: { title: string }[] }>(res);
    expect(parsed.status).toBe(200);
    expect(parsed.body.drafts).toHaveLength(1);
    expect(parsed.body.drafts[0].title).toBe("Draft A");
  });
});

describe("GET /api/quizzes/drafts/[id]", () => {
  beforeEach(() => {
    setMockAuth(null);
  });

  it("returns 401 when unauthenticated", async () => {
    const req = createRequest("/api/quizzes/drafts/d1", { auth: false, csrf: false });
    const res = await getDraft(req, {
      params: Promise.resolve({ id: "d1" }),
    });
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(401);
  });

  it("returns 404 when draft does not exist", async () => {
    setMockAuth(mockTeacher());
    const req = createRequest("/api/quizzes/drafts/ghost", { csrf: false });
    const res = await getDraft(req, {
      params: Promise.resolve({ id: "ghost" }),
    });
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(404);
  });

  it("returns the draft to its owner", async () => {
    setMockAuth(mockTeacher("draft-owner"));
    const db = getFirestoreMock();
    db._seed("quizDrafts", "draft-get", {
      teacherId: "draft-owner",
      title: "Gettable Draft",
      questions: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const req = createRequest("/api/quizzes/drafts/draft-get", { csrf: false });
    const res = await getDraft(req, {
      params: Promise.resolve({ id: "draft-get" }),
    });
    const parsed = await parseResponse<{ draft: { title: string } }>(res);
    expect(parsed.status).toBe(200);
    expect(parsed.body.draft.title).toBe("Gettable Draft");
  });

  it("returns 403 for another teacher's draft", async () => {
    setMockAuth(mockTeacher("not-owner"));
    const db = getFirestoreMock();
    db._seed("quizDrafts", "draft-other", {
      teacherId: "real-owner",
      title: "Private",
      questions: [],
    });

    const req = createRequest("/api/quizzes/drafts/draft-other", { csrf: false });
    const res = await getDraft(req, {
      params: Promise.resolve({ id: "draft-other" }),
    });
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(403);
  });
});

describe("DELETE /api/quizzes/drafts/[id]", () => {
  beforeEach(() => {
    setMockAuth(null);
    setMockCSRF(true);
  });

  it("returns 401 when unauthenticated", async () => {
    const req = createRequest("/api/quizzes/drafts/d1", {
      method: "DELETE",
      auth: false,
    });
    const res = await deleteDraft(req, {
      params: Promise.resolve({ id: "d1" }),
    });
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(401);
  });

  it("returns 403 for students", async () => {
    setMockAuth(mockStudent());
    const req = createRequest("/api/quizzes/drafts/d1", {
      method: "DELETE",
    });
    const res = await deleteDraft(req, {
      params: Promise.resolve({ id: "d1" }),
    });
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(403);
  });

  it("returns 404 when draft does not exist", async () => {
    setMockAuth(mockTeacher());
    const req = createRequest("/api/quizzes/drafts/ghost", {
      method: "DELETE",
    });
    const res = await deleteDraft(req, {
      params: Promise.resolve({ id: "ghost" }),
    });
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(404);
  });

  it("deletes the draft for its owner", async () => {
    setMockAuth(mockTeacher("draft-deleter"));
    const db = getFirestoreMock();
    db._seed("quizDrafts", "draft-del", {
      teacherId: "draft-deleter",
      title: "To Delete",
      questions: [],
    });

    const req = createRequest("/api/quizzes/drafts/draft-del", {
      method: "DELETE",
    });
    const res = await deleteDraft(req, {
      params: Promise.resolve({ id: "draft-del" }),
    });
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(200);
    expect(parsed.body.success).toBe(true);
    expect(db._store.get("quizDrafts")?.has("draft-del")).toBe(false);
  });

  it("returns 403 when deleting another teacher's draft", async () => {
    setMockAuth(mockTeacher("not-deleter"));
    const db = getFirestoreMock();
    db._seed("quizDrafts", "draft-x", {
      teacherId: "real-owner",
      title: "Not Yours",
      questions: [],
    });

    const req = createRequest("/api/quizzes/drafts/draft-x", {
      method: "DELETE",
    });
    const res = await deleteDraft(req, {
      params: Promise.resolve({ id: "draft-x" }),
    });
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(403);
  });
});
