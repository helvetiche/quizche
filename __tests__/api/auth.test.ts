import { describe, it, expect, beforeEach } from "vitest";
import { POST as login } from "@/app/api/auth/login/route";
import { POST as register } from "@/app/api/auth/register/route";
import { GET as verify } from "@/app/api/auth/verify/route";
import {
  createRequest,
  parseResponse,
  MOCK_AUTH_TOKEN,
} from "../helpers/test-request";
import {
  setMockAuth,
  mockTeacher,
  adminAuthMock,
  getFirestoreMock,
} from "../setup";

describe("POST /api/auth/login", () => {
  beforeEach(() => {
    setMockAuth(null);
  });

  it("returns 400 when idToken is missing", async () => {
    const req = createRequest("/api/auth/login", {
      method: "POST",
      body: {},
      auth: false,
      csrf: false,
    });
    const res = await login(req);
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(400);
    expect(parsed.body.error).toMatch(/invalid/i);
  });

  it("returns 200 with user details on valid token", async () => {
    adminAuthMock.verifyIdToken.mockResolvedValue({
      uid: "user-1",
      email: "user@test.com",
      role: "teacher",
      tier: "free",
    });

    const req = createRequest("/api/auth/login", {
      method: "POST",
      body: { idToken: MOCK_AUTH_TOKEN },
      auth: false,
      csrf: false,
    });
    const res = await login(req);
    const parsed = await parseResponse(res);

    expect(parsed.status).toBe(200);
    expect(parsed.body.success).toBe(true);
    expect(parsed.body.user).toMatchObject({
      uid: "user-1",
      email: "user@test.com",
      role: "teacher",
      tier: "free",
    });
  });

  it("returns 401 when token verification fails", async () => {
    adminAuthMock.verifyIdToken.mockRejectedValue(new Error("invalid token"));

    const req = createRequest("/api/auth/login", {
      method: "POST",
      body: { idToken: "bad-token" },
      auth: false,
      csrf: false,
    });
    const res = await login(req);
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(401);
  });

  it("defaults tier to 'free' when claim absent", async () => {
    adminAuthMock.verifyIdToken.mockResolvedValue({
      uid: "user-2",
      email: "a@b.com",
    });

    const req = createRequest("/api/auth/login", {
      method: "POST",
      body: { idToken: MOCK_AUTH_TOKEN },
      auth: false,
      csrf: false,
    });
    const res = await login(req);
    const parsed = await parseResponse(res);
    expect(parsed.body.user.tier).toBe("free");
    expect(parsed.body.user.role).toBeNull();
  });
});

describe("POST /api/auth/register", () => {
  beforeEach(() => {
    setMockAuth(null);
  });

  it("returns 400 for missing role", async () => {
    const req = createRequest("/api/auth/register", {
      method: "POST",
      body: { idToken: MOCK_AUTH_TOKEN },
      auth: false,
      csrf: false,
    });
    const res = await register(req);
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(400);
  });

  it("returns 400 for invalid role", async () => {
    const req = createRequest("/api/auth/register", {
      method: "POST",
      body: { idToken: MOCK_AUTH_TOKEN, role: "admin" },
      auth: false,
      csrf: false,
    });
    const res = await register(req);
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(400);
  });

  it("returns 400 when user already has a role", async () => {
    adminAuthMock.verifyIdToken.mockResolvedValue({
      uid: "existing-user",
      email: "existing@test.com",
    });
    adminAuthMock.getUser.mockResolvedValue({
      customClaims: { role: "teacher" },
    });

    const req = createRequest("/api/auth/register", {
      method: "POST",
      body: { idToken: MOCK_AUTH_TOKEN, role: "student" },
      auth: false,
      csrf: false,
    });
    const res = await register(req);
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(400);
    expect(parsed.body.error).toMatch(/already has a role/i);
  });

  it("registers a new user successfully", async () => {
    adminAuthMock.verifyIdToken.mockResolvedValue({
      uid: "new-user",
      email: "new@test.com",
      name: "New User",
    });
    adminAuthMock.getUser.mockResolvedValue({
      customClaims: null,
      displayName: "New User",
      email: "new@test.com",
    });
    adminAuthMock.setCustomUserClaims.mockResolvedValue(undefined);

    const req = createRequest("/api/auth/register", {
      method: "POST",
      body: { idToken: MOCK_AUTH_TOKEN, role: "student" },
      auth: false,
      csrf: false,
    });
    const res = await register(req);
    const parsed = await parseResponse(res);

    expect(parsed.status).toBe(201);
    expect(parsed.body.success).toBe(true);
    expect(parsed.body.user).toMatchObject({
      uid: "new-user",
      email: "new@test.com",
      role: "student",
      tier: "free",
    });
    expect(adminAuthMock.setCustomUserClaims).toHaveBeenCalledWith(
      "new-user",
      { role: "student", tier: "free" }
    );
  });
});

describe("GET /api/auth/verify", () => {
  beforeEach(() => {
    setMockAuth(null);
  });

  it("returns 401 when unauthenticated", async () => {
    const req = createRequest("/api/auth/verify", {
      auth: false,
      csrf: false,
    });
    const res = await verify(req);
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(401);
  });

  it("returns the authenticated user", async () => {
    setMockAuth(mockTeacher("teacher-verify"));
    const req = createRequest("/api/auth/verify", { csrf: false });
    const res = await verify(req);
    const parsed = await parseResponse(res);

    expect(parsed.status).toBe(200);
    expect(parsed.body.user).toMatchObject({
      uid: "teacher-verify",
      role: "teacher",
    });
  });
});
