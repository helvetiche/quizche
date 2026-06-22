import { describe, it, expect, beforeEach } from "vitest";
import { GET as getCSRF } from "@/app/api/csrf/route";
import { createRequest, parseResponse } from "../helpers/test-request";
import { setMockAuth, mockTeacher } from "../setup";

describe("GET /api/csrf", () => {
  beforeEach(() => {
    setMockAuth(null);
  });

  it("returns 401 when unauthenticated", async () => {
    const req = createRequest("/api/csrf", { auth: false, csrf: false });
    const res = await getCSRF(req);
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(401);
  });

  it("generates and returns a CSRF token for an authenticated user", async () => {
    setMockAuth(mockTeacher("csrf-user"));
    const req = createRequest("/api/csrf", { csrf: false });
    const res = await getCSRF(req);
    const parsed = await parseResponse(res);

    expect(parsed.status).toBe(200);
    expect(parsed.body.csrfToken).toBe("mock-csrf-token");
    expect(parsed.headers.get("X-CSRF-Token")).toBe("mock-csrf-token");
  });
});
