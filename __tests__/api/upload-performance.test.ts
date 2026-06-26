import { describe, it, expect, beforeEach } from "vitest";
import { POST as uploadImage } from "@/app/api/upload/image/route";
import { POST as reportPerformance } from "@/app/api/_performance/route";
import {
  createFormDataRequest,
  createRequest,
  parseResponse,
} from "../helpers/test-request";
import { setMockAuth, setMockCSRF, mockStudent } from "../setup";

// ── POST /api/upload/image ──────────────────────────────────────────────────

describe("POST /api/upload/image", () => {
  beforeEach(() => {
    setMockAuth(null);
    setMockCSRF(true);
  });

  it("returns 401 when unauthenticated", async () => {
    const req = createFormDataRequest("/api/upload/image", {}, { auth: false });
    const res = await uploadImage(req);
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(401);
  });

  it("returns 403 when CSRF is invalid", async () => {
    setMockAuth(mockStudent());
    setMockCSRF(false);
    const req = createFormDataRequest("/api/upload/image", {});
    const res = await uploadImage(req);
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(403);
  });

  it("returns 400 when no image is provided", async () => {
    setMockAuth(mockStudent());
    const req = createFormDataRequest("/api/upload/image", {});
    const res = await uploadImage(req);
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(400);
    expect(parsed.body.error).toMatch(/no image/i);
  });

  it("returns 400 for invalid file type", async () => {
    setMockAuth(mockStudent());
    const req = createFormDataRequest("/api/upload/image", {
      image: {
        file: Buffer.from("not-an-image"),
        filename: "file.txt",
        type: "text/plain",
      },
    });
    const res = await uploadImage(req);
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(400);
  });
});

// ── POST /api/_performance ─────────────────────────────────────────────────

describe("POST /api/_performance", () => {
  beforeEach(() => {
    setMockAuth(null);
  });

  it("returns 400 for invalid metrics data", async () => {
    const req = createRequest("/api/_performance", {
      method: "POST",
      body: {},
      auth: false,
      csrf: false,
    });
    const res = await reportPerformance(req);
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(400);
  });

  it("records performance metrics successfully", async () => {
    const req = createRequest("/api/_performance", {
      method: "POST",
      body: {
        metrics: {
          FCP: 1200,
          LCP: 2500,
          CLS: 0.1,
          TTFB: 200,
          INP: 100,
        },
        page: "/dashboard",
      },
      auth: false,
      csrf: false,
    });
    const res = await reportPerformance(req);
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(200);
    expect(parsed.body.success).toBe(true);
  });

  it("accepts partial metrics (only some vitals)", async () => {
    const req = createRequest("/api/_performance", {
      method: "POST",
      body: {
        metrics: { LCP: 1800 },
        userId: "user-1",
      },
      auth: false,
      csrf: false,
    });
    const res = await reportPerformance(req);
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(200);
  });
});
