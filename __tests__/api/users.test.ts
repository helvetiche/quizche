import { describe, it, expect, beforeEach } from "vitest";
import {
  GET as getProfile,
  POST as createProfile,
  PUT as updateProfile,
} from "@/app/api/users/profile/route";
import { GET as getHistory } from "@/app/api/users/history/route";
import { GET as searchUsers } from "@/app/api/users/search/route";
import { createRequest, parseResponse } from "../helpers/test-request";
import {
  setMockAuth,
  setMockCSRF,
  mockTeacher,
  mockStudent,
  getFirestoreMock,
} from "../setup";

const validProfile = {
  firstName: "John",
  lastName: "Doe",
  age: 20,
  school: "Test University",
};

// ── /api/users/profile ───────────────────────────────────────────────────────

describe("GET /api/users/profile", () => {
  beforeEach(() => {
    setMockAuth(null);
  });

  it("returns 401 when unauthenticated", async () => {
    const req = createRequest("/api/users/profile", {
      auth: false,
      csrf: false,
    });
    const res = await getProfile(req);
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(401);
  });

  it("returns default profile when user doc does not exist", async () => {
    setMockAuth(mockStudent("no-profile"));
    const req = createRequest("/api/users/profile", { csrf: false });
    const res = await getProfile(req);
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(200);
    expect(parsed.body.profile).toBeDefined();
    expect(parsed.body.profile.firstName).toBe("");
    expect(parsed.body.profile.profileCompleted).toBe(false);
  });

  it("returns the user profile when it exists", async () => {
    setMockAuth(mockStudent("has-profile"));
    const db = getFirestoreMock();
    db._seed("users", "has-profile", {
      firstName: "Jane",
      lastName: "Smith",
      age: 22,
      school: "MIT",
      profileCompleted: true,
    });

    const req = createRequest("/api/users/profile", { csrf: false });
    const res = await getProfile(req);
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(200);
    expect(parsed.body.profile.firstName).toBe("Jane");
    expect(parsed.body.profile.profileCompleted).toBe(true);
  });
});

describe("POST /api/users/profile", () => {
  beforeEach(() => {
    setMockAuth(null);
  });

  it("returns 401 when unauthenticated", async () => {
    const req = createRequest("/api/users/profile", {
      method: "POST",
      body: validProfile,
      auth: false,
    });
    const res = await createProfile(req);
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(401);
  });

  it("returns 400 for invalid data (missing firstName)", async () => {
    setMockAuth(mockStudent());
    const req = createRequest("/api/users/profile", {
      method: "POST",
      body: { lastName: "Doe", age: 20, school: "Uni" },
    });
    const res = await createProfile(req);
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(400);
  });

  it("creates the profile successfully", async () => {
    setMockAuth(mockStudent("profile-create"));
    const req = createRequest("/api/users/profile", {
      method: "POST",
      body: validProfile,
    });
    const res = await createProfile(req);
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(200);
    expect(parsed.body.success).toBe(true);

    const stored = getFirestoreMock()._store.get("users")?.get(
      "profile-create"
    ) as Record<string, unknown>;
    expect(stored?.firstName).toBe("John");
    expect(stored?.profileCompleted).toBe(true);
  });
});

describe("PUT /api/users/profile", () => {
  beforeEach(() => {
    setMockAuth(null);
    setMockCSRF(true);
  });

  it("returns 401 when unauthenticated", async () => {
    const req = createRequest("/api/users/profile", {
      method: "PUT",
      body: { school: "New School" },
      auth: false,
    });
    const res = await updateProfile(req);
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(401);
  });

  it("returns 403 when CSRF is invalid", async () => {
    setMockAuth(mockStudent());
    setMockCSRF(false);
    const req = createRequest("/api/users/profile", {
      method: "PUT",
      body: { school: "New School" },
    });
    const res = await updateProfile(req);
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(403);
  });

  it("updates profile fields successfully", async () => {
    setMockAuth(mockStudent("profile-update"));
    const db = getFirestoreMock();
    db._seed("users", "profile-update", {
      firstName: "Old",
      lastName: "Name",
      age: 20,
      school: "Old School",
    });

    const req = createRequest("/api/users/profile", {
      method: "PUT",
      body: { school: "Updated School" },
    });
    const res = await updateProfile(req);
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(200);
    expect(parsed.body.success).toBe(true);

    const stored = db._store.get("users")?.get(
      "profile-update"
    ) as Record<string, unknown>;
    expect(stored?.school).toBe("Updated School");
  });
});

// ── /api/users/history ───────────────────────────────────────────────────────

describe("GET /api/users/history", () => {
  beforeEach(() => {
    setMockAuth(null);
  });

  it("returns 401 when unauthenticated", async () => {
    const req = createRequest("/api/users/history", {
      auth: false,
      csrf: false,
    });
    const res = await getHistory(req);
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(401);
  });

  it("returns 403 for teachers (students only)", async () => {
    setMockAuth(mockTeacher());
    const req = createRequest("/api/users/history", { csrf: false });
    const res = await getHistory(req);
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(403);
  });

  it("returns quiz attempts history for students", async () => {
    setMockAuth(mockStudent("stu-history"));
    const db = getFirestoreMock();
    db._seed("quizAttempts", "att-1", {
      userId: "stu-history",
      quizTitle: "Quiz 1",
      score: 8,
      totalQuestions: 10,
      percentage: 80,
      completedAt: new Date(),
    });

    const req = createRequest("/api/users/history", { csrf: false });
    const res = await getHistory(req);
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(200);
    expect(parsed.body.history).toBeDefined();
  });
});

// ── /api/users/search ───────────────────────────────────────────────────────

describe("GET /api/users/search", () => {
  beforeEach(() => {
    setMockAuth(null);
  });

  it("returns 401 when unauthenticated", async () => {
    const req = createRequest("/api/users/search", {
      auth: false,
      csrf: false,
    });
    const res = await searchUsers(req);
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(401);
  });

  it("returns 403 for teachers (students only)", async () => {
    setMockAuth(mockTeacher());
    const req = createRequest("/api/users/search", { csrf: false });
    const res = await searchUsers(req);
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(403);
  });

  it("returns 400 when search query is empty", async () => {
    setMockAuth(mockStudent());
    const req = createRequest("/api/users/search", {
      csrf: false,
      query: { q: "" },
    });
    const res = await searchUsers(req);
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(400);
  });

  it("returns 400 when search query is too short", async () => {
    setMockAuth(mockStudent());
    const req = createRequest("/api/users/search", {
      csrf: false,
      query: { q: "A" },
    });
    const res = await searchUsers(req);
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(400);
    expect(parsed.body.error).toMatch(/at least 2 characters/i);
  });

  it("returns matching users for a valid search query", async () => {
    setMockAuth(mockStudent("searcher"));
    const db = getFirestoreMock();
    db._seed("users", "stu-match", {
      email: "match@test.com",
      firstName: "Match",
      lastName: "User",
      role: "student",
    });

    const req = createRequest("/api/users/search", {
      csrf: false,
      query: { q: "match" },
    });
    const res = await searchUsers(req);
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(200);
    expect(parsed.body.users).toBeDefined();
  });
});
