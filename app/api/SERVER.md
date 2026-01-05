# API Routes Structure

This directory contains all server-side API routes for the QuizChe application.

## Production-Ready Standards

⚠️ **IMPORTANT:** This is a **PRODUCTION-READY, USER-FACING APPLICATION**. All API routes must:

- Include complete HTTP headers on every response
- Handle errors gracefully with user-friendly messages
- Log all errors for debugging and monitoring
- Follow security best practices
- Be performant and optimized
- Be fully documented

## Architecture Rules

⚠️ **CRITICAL:** All database operations MUST go through these API routes. NO direct client-to-database access is allowed.

## Authentication & Authorization Quick Reference

**MANDATORY for ALL routes:**

1. **Authentication (401 Unauthorized)**

   - Extract `Authorization: Bearer <token>` header
   - Verify Firebase ID token using Firebase Admin SDK
   - Extract user ID and custom claims (role, tier)
   - Return 401 if token is missing, invalid, or expired

2. **Authorization (403 Forbidden)**
   - Check user role (student/teacher) from custom claims
   - Verify user has permission for the operation
   - Check resource ownership (users can only access their own data)
   - Verify tier-based permissions (free/premium limits)
   - Return 403 if user lacks permission

**Order:** Authentication → Authorization → Business Logic

**Never skip either check!**

## Route Structure

All routes follow Next.js App Router conventions using `route.ts` files.

### Authentication Routes

- `/api/auth/login` - User login
- `/api/auth/register` - User registration
- `/api/auth/logout` - User logout
- `/api/auth/verify` - Verify authentication token

### Quiz Routes

- `/api/quizzes` - List/create quizzes
- `/api/quizzes/[id]` - Get/update/delete specific quiz
- `/api/quizzes/[id]/submit` - Submit quiz answers
- `/api/quizzes/[id]/results` - Get quiz results
- `/api/quizzes/[id]/qr-code` - Generate QR code

### Flashcard Routes

- `/api/flashcards` - List/create flashcard sets
- `/api/flashcards/[id]` - Get/update/delete flashcard set
- `/api/flashcards/[id]/cards` - Manage cards in a set

### User Routes

- `/api/users/profile` - Get/update user profile
- `/api/users/history` - Get user quiz history
- `/api/users/stats` - Get user statistics

### Admin Routes

- `/api/admin/set-claims` - Set custom claims (admin only)
- `/api/admin/users` - Manage users (admin only)

## Required Middleware

Every route MUST include:

1. **Authentication verification** (MANDATORY - 401 if failed)

   - Verify Firebase ID token
   - Extract user ID and custom claims
   - Reject if token is missing, invalid, or expired

2. **Authorization check** (MANDATORY - 403 if failed)

   - Verify user role (student/teacher)
   - Verify user permissions for the operation
   - Check resource ownership
   - Verify tier-based permissions

3. Rate limiting
4. CSRF protection (for mutating operations)
5. Input validation
6. Error handling
7. **Complete HTTP headers (MANDATORY for production)**

## Example Route Structure

```typescript
import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { validateInput } from "@/lib/validation";
import { adminDb } from "@/lib/firebase-admin";

export async function POST(request: NextRequest) {
  try {
    // 1. Authentication (MANDATORY - Who are you?)
    const user = await verifyAuth(request);
    if (!user) {
      const authHeaders = {
        "Content-Type": "application/json; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "no-store, no-cache, must-revalidate",
      };
      return NextResponse.json(
        { error: "Unauthorized: Invalid or missing authentication token" },
        { status: 401, headers: authHeaders }
      );
    }

    // 2. Authorization Check (MANDATORY - What can you do?)
    // Check role-based permissions
    if (user.role !== "teacher") {
      const forbiddenHeaders = {
        "Content-Type": "application/json; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "no-store, no-cache, must-revalidate",
      };
      return NextResponse.json(
        { error: "Forbidden: Teacher role required to create quizzes" },
        { status: 403, headers: forbiddenHeaders }
      );
    }

    // Check tier-based permissions (if applicable)
    if (user.tier === "free") {
      // Check daily limit for free tier
      const dailyCount = await getDailyQuizCount(user.uid);
      if (dailyCount >= 5) {
        const forbiddenHeaders = {
          "Content-Type": "application/json; charset=utf-8",
          "X-Content-Type-Options": "nosniff",
          "Cache-Control": "no-store, no-cache, must-revalidate",
        };
        return NextResponse.json(
          {
            error: "Forbidden: Daily quiz creation limit reached for free tier",
          },
          { status: 403, headers: forbiddenHeaders }
        );
      }
    }

    // 3. Rate Limiting
    const rateLimitResult = await rateLimit(user.uid, "create-quiz");
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: "Rate limit exceeded" },
        { status: 429, headers: rateLimitResult.headers }
      );
    }

    // 4. Input Validation
    const body = await request.json();
    const validated = validateInput(body, quizSchema);
    if (!validated.success) {
      const validationHeaders = {
        "Content-Type": "application/json; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "no-store, no-cache, must-revalidate",
      };
      return NextResponse.json(
        { error: "Invalid input", details: validated.error },
        { status: 400, headers: validationHeaders }
      );
    }

    // 5. Business Logic & Database Operation
    const result = await adminDb.collection("quizzes").add({
      ...validated.data,
      teacherId: user.uid,
      createdAt: new Date(),
    });

    // 6. Return Sanitized Response with Complete Headers
    const headers = {
      "Content-Type": "application/json; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "X-XSS-Protection": "1; mode=block",
      "Strict-Transport-Security":
        "max-age=31536000; includeSubDomains; preload",
      "Content-Security-Policy":
        "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://*.firebaseio.com https://*.googleapis.com;",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "Permissions-Policy": "geolocation=(), microphone=(), camera=()",
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      Vary: "Accept, Authorization",
      ...rateLimitResult.headers, // Include rate limit headers
    };

    return NextResponse.json(
      { id: result.id, ...sanitizedData },
      { status: 201, headers }
    );
  } catch (error) {
    console.error("API Error:", error);

    // Error response also needs complete headers
    const errorHeaders = {
      "Content-Type": "application/json; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "Cache-Control": "no-store, no-cache, must-revalidate",
    };

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: errorHeaders }
    );
  }
}
```
