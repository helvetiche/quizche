import { describe, it, expect, beforeEach } from "vitest";
import { POST as generateFlashcards } from "@/app/api/flashcards/generate/route";
import { createFormDataRequest, parseResponse } from "../helpers/test-request";
import { setMockAuth, setMockCSRF, mockTeacher, mockStudent } from "../setup";

describe("POST /api/flashcards/generate", () => {
  beforeEach(() => {
    setMockAuth(null);
    setMockCSRF(true);
  });

  it("returns 401 when unauthenticated", async () => {
    const req = createFormDataRequest(
      "/api/flashcards/generate",
      { difficulty: "easy" },
      { auth: false }
    );
    const res = await generateFlashcards(req);
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(401);
  });

  it("returns 403 for teachers (only students generate flashcards)", async () => {
    setMockAuth(mockTeacher());
    const req = createFormDataRequest("/api/flashcards/generate", {
      difficulty: "easy",
    });
    const res = await generateFlashcards(req);
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(403);
  });

  it("returns 400 when no file is provided", async () => {
    setMockAuth(mockStudent());
    const req = createFormDataRequest("/api/flashcards/generate", {
      difficulty: "easy",
      numCards: "10",
    });
    const res = await generateFlashcards(req);
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(400);
    expect(parsed.body.error).toMatch(/PDF file is required/i);
  });

  it("returns 400 when difficulty and numCards are missing", async () => {
    setMockAuth(mockStudent());
    const req = createFormDataRequest("/api/flashcards/generate", {
      file: {
        file: Buffer.from("fake"),
        filename: "doc.pdf",
        type: "application/pdf",
      },
    });
    const res = await generateFlashcards(req);
    const parsed = await parseResponse(res);
    expect(parsed.status).toBe(400);
  });
});
