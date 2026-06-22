import { describe, it, expect, beforeEach } from "vitest";
import {
  POST as createFlashcard,
  GET as listFlashcards,
} from "@/app/api/flashcards/route";
import {
  GET as getFlashcard,
  PUT as updateFlashcard,
} from "@/app/api/flashcards/[id]/route";
import { POST as addComment } from "@/app/api/flashcards/[id]/comments/route";
import { POST as rateFlashcard } from "@/app/api/flashcards/[id]/rate/route";
import { POST as shareFlashcard } from "@/app/api/flashcards/[id]/share/route";
import { createRequest, parseResponse } from "../helpers/test-request";
import {
  setMockAuth,
  setMockCSRF,
  mockTeacher,
  mockStudent,
  getFirestoreMock,
} from "../setup";

const validFlashcardSet = {
  title: "My Flashcards",
  cards: [{ front: "What is TS?", back: "TypeScript" }],
};

// ── POST & GET /api/flashcards ──────────────────────────────────────────────

describe("POST /api/flashcards", () => {
  beforeEach(() => {
    setMockAuth(null);
    setMockCSRF(true);
  });

  it("returns 401 when unauthenticated", async () => {
    const req = createRequest("/api/flashcards", {
      method: "POST",
      body: validFlashcardSet,
      auth: false,
    });
    const res = await createFlashcard(req);
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(401);
  });

  it("creates a flashcard set successfully", async () => {
    setMockAuth(mockStudent("fc-creator"));
    const req = createRequest("/api/flashcards", {
      method: "POST",
      body: validFlashcardSet,
    });
    const res = await createFlashcard(req);
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(201);
    expect(parsed.body.id).toBeTruthy();
    expect(parsed.body.message).toMatch(/created/i);
  });

  it("returns 400 for invalid data (empty cards)", async () => {
    setMockAuth(mockStudent());
    const req = createRequest("/api/flashcards", {
      method: "POST",
      body: { title: "Empty", cards: [] },
    });
    const res = await createFlashcard(req);
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(400);
  });

  it("returns 403 when CSRF is invalid", async () => {
    setMockAuth(mockStudent());
    setMockCSRF(false);
    const req = createRequest("/api/flashcards", {
      method: "POST",
      body: validFlashcardSet,
    });
    const res = await createFlashcard(req);
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(403);
  });

  it("persists the flashcard to Firestore", async () => {
    setMockAuth(mockStudent("fc-persist"));
    const req = createRequest("/api/flashcards", {
      method: "POST",
      body: validFlashcardSet,
    });
    const res = await createFlashcard(req);
    const parsed = await parseResponse(res);
    const store = getFirestoreMock()._store.get("flashcards");
    expect(store?.has(parsed.body.id)).toBe(true);
  });
});

describe("GET /api/flashcards", () => {
  beforeEach(() => {
    setMockAuth(null);
  });

  it("returns 401 when unauthenticated", async () => {
    const req = createRequest("/api/flashcards", { auth: false, csrf: false });
    const res = await listFlashcards(req);
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(401);
  });

  it("lists own flashcards", async () => {
    setMockAuth(mockStudent("fc-list-user"));
    const db = getFirestoreMock();
    db._seed("flashcards", "fc-own", {
      userId: "fc-list-user",
      title: "Own Card",
      cards: [],
      totalCards: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const req = createRequest("/api/flashcards", { csrf: false });
    const res = await listFlashcards(req);
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(200);
    expect(parsed.body.flashcards).toBeDefined();
  });

  it("lists public flashcards when ?public=true", async () => {
    setMockAuth(mockStudent("fc-pub-user"));
    const db = getFirestoreMock();
    db._seed("flashcards", "fc-pub", {
      userId: "other-user",
      title: "Public Card",
      isPublic: true,
      cards: [],
      totalCards: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const req = createRequest("/api/flashcards", {
      csrf: false,
      query: { public: "true" },
    });
    const res = await listFlashcards(req);
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(200);
  });
});

// ── GET & PUT /api/flashcards/[id] ──────────────────────────────────────────

describe("GET /api/flashcards/[id]", () => {
  beforeEach(() => {
    setMockAuth(null);
  });

  it("returns 401 when unauthenticated", async () => {
    const req = createRequest("/api/flashcards/fc1", {
      auth: false,
      csrf: false,
    });
    const res = await getFlashcard(req, {
      params: Promise.resolve({ id: "fc1" }),
    });
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(401);
  });

  it("returns 404 when flashcard does not exist", async () => {
    setMockAuth(mockStudent());
    const req = createRequest("/api/flashcards/ghost", { csrf: false });
    const res = await getFlashcard(req, {
      params: Promise.resolve({ id: "ghost" }),
    });
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(404);
  });

  it("returns the flashcard to its owner", async () => {
    setMockAuth(mockStudent("fc-owner"));
    const db = getFirestoreMock();
    db._seed("flashcards", "fc-get", {
      userId: "fc-owner",
      title: "My Card",
      cards: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const req = createRequest("/api/flashcards/fc-get", { csrf: false });
    const res = await getFlashcard(req, {
      params: Promise.resolve({ id: "fc-get" }),
    });
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(200);
    expect(parsed.body.flashcardSet.title).toBe("My Card");
  });
});

describe("PUT /api/flashcards/[id]", () => {
  beforeEach(() => {
    setMockAuth(null);
    setMockCSRF(true);
  });

  it("returns 401 when unauthenticated", async () => {
    const req = createRequest("/api/flashcards/fc1", {
      method: "PUT",
      body: validFlashcardSet,
      auth: false,
    });
    const res = await updateFlashcard(req, {
      params: Promise.resolve({ id: "fc1" }),
    });
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(401);
  });

  it("returns 403 for teachers (only students can update)", async () => {
    setMockAuth(mockTeacher());
    const req = createRequest("/api/flashcards/fc1", {
      method: "PUT",
      body: validFlashcardSet,
    });
    const res = await updateFlashcard(req, {
      params: Promise.resolve({ id: "fc1" }),
    });
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(403);
  });

  it("returns 404 when flashcard does not exist", async () => {
    setMockAuth(mockStudent());
    const req = createRequest("/api/flashcards/ghost", {
      method: "PUT",
      body: validFlashcardSet,
    });
    const res = await updateFlashcard(req, {
      params: Promise.resolve({ id: "ghost" }),
    });
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(404);
  });

  it("updates the flashcard set for its owner", async () => {
    setMockAuth(mockStudent("fc-updater"));
    const db = getFirestoreMock();
    db._seed("flashcards", "fc-upd", {
      userId: "fc-updater",
      title: "Old",
      cards: [],
    });

    const req = createRequest("/api/flashcards/fc-upd", {
      method: "PUT",
      body: { ...validFlashcardSet, title: "Updated" },
    });
    const res = await updateFlashcard(req, {
      params: Promise.resolve({ id: "fc-upd" }),
    });
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(200);
    expect(parsed.body.message).toMatch(/updated/i);
  });

  it("clones when user is not the owner (public flashcard)", async () => {
    setMockAuth(mockStudent("fc-cloner"));
    const db = getFirestoreMock();
    db._seed("flashcards", "fc-clone", {
      userId: "other",
      title: "Public",
      isPublic: true,
      cards: [],
    });

    const req = createRequest("/api/flashcards/fc-clone", {
      method: "PUT",
      body: validFlashcardSet,
    });
    const res = await updateFlashcard(req, {
      params: Promise.resolve({ id: "fc-clone" }),
    });
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(201);
    expect(parsed.body.cloned).toBe(true);
  });
});

// ── POST /api/flashcards/[id]/comments ────────────────────────────────────

describe("POST /api/flashcards/[id]/comments", () => {
  beforeEach(() => {
    setMockAuth(null);
  });

  it("returns 401 when unauthenticated", async () => {
    const req = createRequest("/api/flashcards/fc1/comments", {
      method: "POST",
      body: { content: "Nice!" },
      auth: false,
    });
    const res = await addComment(req, {
      params: Promise.resolve({ id: "fc1" }),
    });
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(401);
  });

  it("returns 400 for empty content", async () => {
    setMockAuth(mockStudent());
    const req = createRequest("/api/flashcards/fc1/comments", {
      method: "POST",
      body: { content: "" },
    });
    const res = await addComment(req, {
      params: Promise.resolve({ id: "fc1" }),
    });
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(400);
  });

  it("adds a comment successfully", async () => {
    setMockAuth(mockStudent("commenter"));
    const db = getFirestoreMock();
    db._seed("flashcards", "fc-cmt", {
      userId: "owner-x",
      title: "Card",
      cards: [],
      comments: [],
    });
    db._seed("users", "commenter", {
      firstName: "Test",
      lastName: "User",
    });

    const req = createRequest("/api/flashcards/fc-cmt/comments", {
      method: "POST",
      body: { content: "Great flashcard!" },
    });
    const res = await addComment(req, {
      params: Promise.resolve({ id: "fc-cmt" }),
    });
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(201);
    expect(parsed.body.message).toMatch(/comment added/i);
  });
});

// ── POST /api/flashcards/[id]/rate ─────────────────────────────────────────

describe("POST /api/flashcards/[id]/rate", () => {
  beforeEach(() => {
    setMockAuth(null);
  });

  it("returns 401 when unauthenticated", async () => {
    const req = createRequest("/api/flashcards/fc1/rate", {
      method: "POST",
      body: { rating: 5 },
      auth: false,
    });
    const res = await rateFlashcard(req, {
      params: Promise.resolve({ id: "fc1" }),
    });
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(401);
  });

  it("returns 400 for invalid rating", async () => {
    setMockAuth(mockStudent());
    const req = createRequest("/api/flashcards/fc1/rate", {
      method: "POST",
      body: { rating: 10 },
    });
    const res = await rateFlashcard(req, {
      params: Promise.resolve({ id: "fc1" }),
    });
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(400);
  });

  it("submits a rating successfully", async () => {
    setMockAuth(mockStudent("rater"));
    const db = getFirestoreMock();
    db._seed("flashcards", "fc-rate", {
      userId: "owner-x",
      title: "Card",
      cards: [],
      ratings: {},
    });

    const req = createRequest("/api/flashcards/fc-rate/rate", {
      method: "POST",
      body: { rating: 4 },
    });
    const res = await rateFlashcard(req, {
      params: Promise.resolve({ id: "fc-rate" }),
    });
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(200);
    expect(parsed.body.message).toMatch(/rating/i);
  });
});

// ── POST /api/flashcards/[id]/share ────────────────────────────────────────

describe("POST /api/flashcards/[id]/share", () => {
  beforeEach(() => {
    setMockAuth(null);
    setMockCSRF(true);
  });

  it("returns 401 when unauthenticated", async () => {
    const req = createRequest("/api/flashcards/fc1/share", {
      method: "POST",
      body: { userIds: ["u1"] },
      auth: false,
    });
    const res = await shareFlashcard(req, {
      params: Promise.resolve({ id: "fc1" }),
    });
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(401);
  });

  it("returns 403 for teachers (only students can share)", async () => {
    setMockAuth(mockTeacher());
    const req = createRequest("/api/flashcards/fc1/share", {
      method: "POST",
      body: { userIds: ["u1"] },
    });
    const res = await shareFlashcard(req, {
      params: Promise.resolve({ id: "fc1" }),
    });
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(403);
  });

  it("returns 404 when flashcard does not exist", async () => {
    setMockAuth(mockStudent());
    const req = createRequest("/api/flashcards/ghost/share", {
      method: "POST",
      body: { userIds: ["u1"] },
    });
    const res = await shareFlashcard(req, {
      params: Promise.resolve({ id: "ghost" }),
    });
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(404);
  });

  it("returns 403 when sharing another user's flashcard", async () => {
    setMockAuth(mockStudent("sharer"));
    const db = getFirestoreMock();
    db._seed("flashcards", "fc-share", {
      userId: "owner-x",
      title: "Card",
    });

    const req = createRequest("/api/flashcards/fc-share/share", {
      method: "POST",
      body: { userIds: ["u1"] },
    });
    const res = await shareFlashcard(req, {
      params: Promise.resolve({ id: "fc-share" }),
    });
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(403);
  });

  it("returns 400 for empty userIds array", async () => {
    setMockAuth(mockStudent("fc-share-owner"));
    const db = getFirestoreMock();
    db._seed("flashcards", "fc-share2", {
      userId: "fc-share-owner",
      title: "Card",
    });

    const req = createRequest("/api/flashcards/fc-share2/share", {
      method: "POST",
      body: { userIds: [] },
    });
    const res = await shareFlashcard(req, {
      params: Promise.resolve({ id: "fc-share2" }),
    });
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(400);
  });
});
