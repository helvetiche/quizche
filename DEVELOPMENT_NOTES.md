# Development Notes

## Rate Limiting

Rate limiting is **disabled** in development mode (`NODE_ENV=development`).

This allows unlimited API calls during local development without hitting rate limits.

### Production Limits

When deployed to production, the following rate limits apply:

| Route Type | Limit | Window |
|------------|-------|--------|
| Authentication | 5 requests | 15 minutes |
| AI Generation (quiz/flashcard) | 3 requests | 1 hour |
| Quiz Submission | 10 requests | 1 hour |
| General API | 60 requests | 1 minute |
| History/Results | 30 requests | 1 minute |
| Flashcard Creation | 20 requests | 1 hour |

### Implementation

See `lib/rate-limit.ts` for the rate limiting logic. The check is:

```typescript
if (process.env.NODE_ENV === "development") {
  // Skip rate limiting
}
```

### Important

- Ensure `NODE_ENV` is set to `production` in your deployment environment
- Rate limits use Redis/Upstash for distributed tracking across serverless instances

---

## File Upload Routes & Proxy

The Next.js 16 proxy (`proxy.ts`) must **skip** file upload routes to preserve the `multipart/form-data` Content-Type header.

### Affected Routes

- `/api/quizzes/generate` - PDF upload for quiz generation
- `/api/flashcards/generate` - PDF upload for flashcard generation  
- `/api/upload/image` - Image uploads

### Why This Is Needed

The proxy was interfering with the request headers, causing the `Content-Type` to be incorrectly set to `application/json` instead of `multipart/form-data`. This broke file uploads.

### Implementation

In `proxy.ts`:

```typescript
// Skip proxy for file upload routes to preserve multipart/form-data Content-Type
if (
  pathname === "/api/quizzes/generate" || 
  pathname === "/api/flashcards/generate" ||
  pathname === "/api/upload/image"
) {
  return NextResponse.next();
}
```

---

## AI Model Fallback

The Gemini AI integration (`lib/gemini.ts`) uses model fallback for reliability:

- **Primary Model**: `gemini-2.0-flash-exp`
- **Fallback Model**: `gemini-1.5-flash`

If the primary model fails, the system automatically retries with the fallback model.
