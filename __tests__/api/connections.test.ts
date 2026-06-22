import { describe, it, expect, beforeEach } from "vitest";
import {
  GET as listConnections,
  POST as sendConnection,
} from "@/app/api/connections/route";
import { PUT as actOnConnection } from "@/app/api/connections/[id]/route";
import { createRequest, parseResponse } from "../helpers/test-request";
import {
  setMockAuth,
  setMockCSRF,
  mockTeacher,
  mockStudent,
  getFirestoreMock,
} from "../setup";

// ── GET & POST /api/connections ─────────────────────────────────────────────

describe("GET /api/connections", () => {
  beforeEach(() => {
    setMockAuth(null);
  });

  it("returns 401 when unauthenticated", async () => {
    const req = createRequest("/api/connections", {
      auth: false,
      csrf: false,
    });
    const res = await listConnections(req);
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(401);
  });

  it("returns 403 for teachers (students only)", async () => {
    setMockAuth(mockTeacher());
    const req = createRequest("/api/connections", { csrf: false });
    const res = await listConnections(req);
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(403);
  });

  it("returns connections for a student", async () => {
    setMockAuth(mockStudent("conn-user"));
    const db = getFirestoreMock();
    const otherId = "other-student";
    db._seed("connections", `conn-user_${otherId}`, {
      userId1: "conn-user",
      userId2: otherId,
      status: "accepted",
      requestedBy: "conn-user",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    db._seed("users", otherId, {
      displayName: "Other",
      email: "other@test.com",
    });

    const req = createRequest("/api/connections", { csrf: false });
    const res = await listConnections(req);
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(200);
    expect(parsed.body.connections).toBeDefined();
  });
});

describe("POST /api/connections", () => {
  beforeEach(() => {
    setMockAuth(null);
    setMockCSRF(true);
  });

  it("returns 401 when unauthenticated", async () => {
    const req = createRequest("/api/connections", {
      method: "POST",
      body: { toUserId: "u1" },
      auth: false,
    });
    const res = await sendConnection(req);
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(401);
  });

  it("returns 403 for teachers", async () => {
    setMockAuth(mockTeacher());
    const req = createRequest("/api/connections", {
      method: "POST",
      body: { toUserId: "u1" },
    });
    const res = await sendConnection(req);
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(403);
  });

  it("returns 400 when sending to self", async () => {
    setMockAuth(mockStudent("self-user"));
    const req = createRequest("/api/connections", {
      method: "POST",
      body: { toUserId: "self-user" },
    });
    const res = await sendConnection(req);
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(400);
    expect(parsed.body.error).toMatch(/yourself/i);
  });

  it("returns 404 when target user does not exist", async () => {
    setMockAuth(mockStudent("sender"));
    const req = createRequest("/api/connections", {
      method: "POST",
      body: { toUserId: "ghost" },
    });
    const res = await sendConnection(req);
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(404);
  });

  it("returns 400 when target user is not a student", async () => {
    setMockAuth(mockStudent("sender"));
    const db = getFirestoreMock();
    db._seed("users", "teacher-target", { role: "teacher" });

    const req = createRequest("/api/connections", {
      method: "POST",
      body: { toUserId: "teacher-target" },
    });
    const res = await sendConnection(req);
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(400);
    expect(parsed.body.error).toMatch(/only connect with students/i);
  });

  it("sends a connection request successfully", async () => {
    setMockAuth(mockStudent("conn-sender"));
    const db = getFirestoreMock();
    db._seed("users", "conn-target", {
      role: "student",
      email: "target@test.com",
    });

    const req = createRequest("/api/connections", {
      method: "POST",
      body: { toUserId: "conn-target" },
    });
    const res = await sendConnection(req);
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(201);
    expect(parsed.body.status).toBe("pending");
  });

  it("auto-accepts if the other user already sent a request", async () => {
    setMockAuth(mockStudent("conn-acceptor"));
    const db = getFirestoreMock();
    db._seed("users", "conn-requester", {
      role: "student",
      email: "req@test.com",
    });
    // Simulate an existing pending request from the other user.
    // The route sorts the two user IDs alphabetically to compute the
    // connection doc id, so the seed must use the same sorted order.
    db._seed("connections", `conn-acceptor_conn-requester`, {
      userId1: "conn-acceptor",
      userId2: "conn-requester",
      status: "pending",
      requestedBy: "conn-requester",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const req = createRequest("/api/connections", {
      method: "POST",
      body: { toUserId: "conn-requester" },
    });
    const res = await sendConnection(req);
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(200);
    expect(parsed.body.status).toBe("accepted");
  });
});

// ── PUT /api/connections/[id] ────────────────────────────────────────────────

describe("PUT /api/connections/[id]", () => {
  beforeEach(() => {
    setMockAuth(null);
    setMockCSRF(true);
  });

  it("returns 401 when unauthenticated", async () => {
    const req = createRequest("/api/connections/c1", {
      method: "PUT",
      body: { action: "accept" },
      auth: false,
    });
    const res = await actOnConnection(req, {
      params: Promise.resolve({ id: "c1" }),
    });
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(401);
  });

  it("returns 403 for teachers", async () => {
    setMockAuth(mockTeacher());
    const req = createRequest("/api/connections/c1", {
      method: "PUT",
      body: { action: "accept" },
    });
    const res = await actOnConnection(req, {
      params: Promise.resolve({ id: "c1" }),
    });
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(403);
  });

  it("returns 400 for invalid action", async () => {
    setMockAuth(mockStudent());
    const req = createRequest("/api/connections/c1", {
      method: "PUT",
      body: { action: "block" },
    });
    const res = await actOnConnection(req, {
      params: Promise.resolve({ id: "c1" }),
    });
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(400);
  });

  it("returns 404 when connection does not exist", async () => {
    setMockAuth(mockStudent());
    const req = createRequest("/api/connections/ghost", {
      method: "PUT",
      body: { action: "accept" },
    });
    const res = await actOnConnection(req, {
      params: Promise.resolve({ id: "ghost" }),
    });
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(404);
  });

  it("accepts a connection request", async () => {
    const acceptor = mockStudent("acceptor-1");
    const requester = "requester-1";
    setMockAuth(acceptor);
    const db = getFirestoreMock();
    db._seed("connections", `acceptor-1_requester-1`, {
      userId1: acceptor.uid,
      userId2: requester,
      status: "pending",
      requestedBy: requester,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const connId = `${acceptor.uid}_${requester}`;
    const req = createRequest(`/api/connections/${connId}`, {
      method: "PUT",
      body: { action: "accept" },
    });
    const res = await actOnConnection(req, {
      params: Promise.resolve({ id: connId }),
    });
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(200);
    expect(parsed.body.status).toBe("accepted");
  });

  it("rejects a connection request", async () => {
    setMockAuth(mockStudent("rejector-1"));
    const db = getFirestoreMock();
    db._seed("connections", `rejector-1_requester-x`, {
      userId1: "rejector-1",
      userId2: "requester-x",
      status: "pending",
      requestedBy: "requester-x",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const connId = `rejector-1_requester-x`;
    const req = createRequest(`/api/connections/${connId}`, {
      method: "PUT",
      body: { action: "reject" },
    });
    const res = await actOnConnection(req, {
      params: Promise.resolve({ id: connId }),
    });
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(200);
    expect(parsed.body.message).toMatch(/rejected/i);
  });

  it("returns 400 when accepting own request", async () => {
    setMockAuth(mockStudent("self-acceptor"));
    const db = getFirestoreMock();
    db._seed("connections", `self-acceptor_other`, {
      userId1: "self-acceptor",
      userId2: "other",
      status: "pending",
      requestedBy: "self-acceptor",
    });

    const connId = `self-acceptor_other`;
    const req = createRequest(`/api/connections/${connId}`, {
      method: "PUT",
      body: { action: "accept" },
    });
    const res = await actOnConnection(req, {
      params: Promise.resolve({ id: connId }),
    });
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(400);
  });
});
