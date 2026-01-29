# QuizChe - Quiz Generator Platform

## Project Overview

QuizChe is a comprehensive quiz and flashcard generation platform designed for educators and students. The platform enables teachers to create interactive quizzes and flashcards, while students can create flashcards for their study needs.

## Production-Ready Standards

⚠️ **IMPORTANT:** This is a **PRODUCTION-READY, USER-FACING APPLICATION**, not a prototype or proof-of-concept. All code, APIs, and features must meet enterprise-grade standards:

- **Complete HTTP headers** on all API responses
- **Proper error handling** with user-friendly messages
- **Comprehensive logging** for debugging and monitoring
- **Performance optimization** for real-world usage
- **Accessibility compliance** (WCAG 2.1 AA minimum)
- **Mobile responsiveness** across all devices
- **Browser compatibility** for modern browsers
- **Security hardening** at every layer
- **Documentation** for all public APIs
- **Testing** for critical user flows
- **Monitoring and alerting** for production issues

## User Roles & Permissions

### Students

- **Can Create:**
  - Flashcards
- **Can View:**
  - Quiz results and history

### Teachers

- **Can Create:**
  - Flashcards
  - Quizzes

## Core Features

### 1. PDF-Based Quiz Generation

**Workflow:**

1. User uploads a PDF file containing presentation slides or educational content
2. System extracts text and content from the PDF
3. AI (Gemini AI) processes and structures the extracted content
4. AI generates quiz questions based on the content
5. User can review, edit, and customize the generated quiz

**Technical Requirements:**

- PDF parsing and text extraction
- Integration with Google Gemini AI API
- Content structuring and question generation
- Quiz editing interface

### 2. QR Code Generation

**Workflow:**

1. After creating a quiz, system generates a unique QR code
2. QR code links to a private quiz URL
3. When scanned, users are redirected to the quiz page
4. **Authentication Required:** Users must login before accessing the quiz

**Technical Requirements:**

- QR code generation library
- Unique quiz URL generation
- Authentication middleware
- Protected route handling

### 3. Authentication & Access Control

**Requirements:**

- Firebase Authentication for user registration and login
- Custom claims for storing user roles (student/teacher) and tier
- Role-based access control (Student vs Teacher)
- Protected quiz routes
- Session management via Firebase Auth

### 4. Quiz Results & History

**Workflow:**

1. After completing a quiz, student's answers are automatically saved
2. Quiz results are calculated (score, percentage, correct/incorrect answers)
3. Results are stored in student's quiz history
4. Students can access their history to view:
   - All quiz attempts
   - Scores and performance metrics
   - Date and time of each attempt
   - Detailed breakdown of correct/incorrect answers

**Technical Requirements:**

- Quiz submission storage in Firestore
- Score calculation logic
- History page/component for students
- Results display with answer review

## Technical Stack Considerations

### Backend

- **API Architecture:** Next.js App Router API routes (`/app/api/*`)
- **AI Integration:** Google Gemini AI API
- **PDF Processing:** PDF parsing library (e.g., pdf-parse, pdfjs-dist)
- **Authentication:** Firebase Authentication with custom claims
- **Database:** Firebase Firestore (accessed ONLY via Firebase Admin SDK in API routes)
- **Rate Limiting:** Upstash Redis for distributed rate limiting

### Frontend

- **Framework:** Next.js
- **Styling:** TailwindCSS
- **QR Code:** qrcode library
- **File Upload:** File upload handling

### Key Libraries Needed

- PDF extraction library
- Gemini AI SDK
- QR code generator
- Firebase Admin SDK (for setting custom claims)
- Firebase Client SDK (for authentication)
- File upload handler
- Rate limiting library (e.g., `@upstash/ratelimit` or custom Firestore-based)
- CSRF token library (e.g., `csrf` or custom implementation)
- Input validation library (e.g., `zod` or `joi`)

## User Flows

### Teacher Flow: Creating a Quiz from PDF

1. Login as Teacher
2. Navigate to "Create Quiz"
3. Upload PDF presentation file
4. Wait for AI processing and extraction
5. Review generated quiz questions
6. Edit/customize questions if needed
7. Save quiz
8. Generate QR code for quiz
9. Share QR code with students

### Student Flow: Accessing Quiz via QR Code

1. Scan QR code
2. Redirected to login page (if not logged in)
3. Login/Register
4. Access quiz page
5. Take quiz
6. Submit quiz answers
7. View results immediately after submission
8. Results are saved to quiz history

### Student Flow: Viewing Quiz History

1. Login as Student
2. Navigate to "Quiz History" or "My Results"
3. View list of all completed quizzes
4. Click on a quiz to see detailed results
5. Review correct/incorrect answers
6. View performance metrics (score, percentage, date)

### Student Flow: Creating Flashcards

1. Login as Student
2. Navigate to "Create Flashcard"
3. Create flashcard sets manually or from content
4. Study flashcards

### Teacher Flow: Creating Flashcards

1. Login as Teacher
2. Navigate to "Create Flashcard"
3. Create flashcard sets
4. Share with students (optional)

## Database Structure (Firebase)

### Authentication (Firebase Auth)

- **Custom Claims Structure:**
  - `role`: "student" | "teacher"
  - `tier`: User tier level (e.g., "free", "premium", "pro")
- Custom claims are set server-side using Firebase Admin SDK
- Claims are included in the ID token and can be verified client-side

### Firestore Collections

#### Collection: `users`

- **Document ID:** `userId` (Firebase Auth UID)
- **Fields:**
  - `displayName`: string
  - `email`: string
  - `role`: "student" | "teacher" (denormalized from custom claims for queries)
  - `tier`: string (denormalized from custom claims)
  - `createdAt`: timestamp
  - `updatedAt`: timestamp
- **Indexes:** `role`, `tier`
- **Query Optimization:** Store role/tier here to avoid reading custom claims for list queries

#### Collection: `quizzes`

- **Document ID:** Auto-generated quiz ID
- **Fields:**
  - `teacherId`: string (reference to user)
  - `title`: string
  - `description`: string
  - `questions`: array of question objects
  - `qrCode`: string (unique quiz access code)
  - `isActive`: boolean
  - `createdAt`: timestamp
  - `updatedAt`: timestamp
  - `totalQuestions`: number (denormalized for quick access)
- **Subcollection:** `attempts` (for efficient querying)
  - Document ID: Auto-generated attempt ID
  - Fields: `userId`, `answers`, `score`, `percentage`, `completedAt`, `timeSpent`
- **Indexes:** `teacherId`, `createdAt`, `isActive`, `qrCode` (unique)
- **Query Optimization:**
  - Use subcollection for attempts to reduce document reads
  - Denormalize `totalQuestions` to avoid calculating on read
  - Index `qrCode` for fast quiz lookup

#### Collection: `quizAttempts`

- **Document ID:** Auto-generated attempt ID
- **Fields:**
  - `userId`: string (indexed)
  - `quizId`: string (indexed)
  - `quizTitle`: string (denormalized for history display)
  - `teacherId`: string (denormalized for teacher analytics)
  - `answers`: object
  - `score`: number
  - `totalQuestions`: number
  - `percentage`: number
  - `completedAt`: timestamp (indexed)
  - `timeSpent`: number (seconds)
- **Indexes:**
  - Composite: `userId` + `completedAt` (descending) - for user history
  - Composite: `quizId` + `completedAt` (descending) - for quiz analytics
  - Composite: `teacherId` + `completedAt` (descending) - for teacher dashboard
- **Query Optimization:**
  - Single collection for all attempts (no subcollection overhead)
  - Denormalize quiz title and teacher ID to avoid joins
  - Use composite indexes for efficient filtering and sorting

#### Collection: `flashcards`

- **Document ID:** Auto-generated flashcard set ID
- **Fields:**
  - `userId`: string (indexed)
  - `title`: string
  - `description`: string
  - `cards`: array of card objects
  - `isPublic`: boolean (for sharing)
  - `createdAt`: timestamp (indexed)
  - `updatedAt`: timestamp
  - `totalCards`: number (denormalized)
- **Indexes:** `userId`, `createdAt`, `isPublic`
- **Query Optimization:** Denormalize `totalCards` to avoid array length calculation

#### Collection: `rateLimits`

- **Document ID:** `userId` or `ipAddress`
- **Fields:**
  - `count`: number
  - `windowStart`: timestamp
  - `lastRequest`: timestamp
- **Purpose:** Track rate limits per user/IP
- **TTL:** Use Firestore TTL or manual cleanup

### Database Query Optimization Strategies

1. **Denormalization:**
   - Store frequently accessed data (role, tier, quiz title, teacher ID) directly in documents
   - Reduces read operations and improves query performance

2. **Composite Indexes:**
   - Create indexes for common query patterns (userId + completedAt, quizId + completedAt)
   - Prevents full collection scans

3. **Subcollections vs Collections:**
   - Use subcollections (`quizzes/{quizId}/attempts`) when data is only accessed in context of parent
   - Use top-level collections when data needs cross-entity queries

4. **Pagination:**
   - Always use `limit()` and `startAfter()` for list queries
   - Default page size: 20-50 documents per query

5. **Field Selection:**
   - Use `select()` to fetch only needed fields
   - Reduces bandwidth and read costs

6. **Caching Strategy:**
   - Cache frequently accessed data (user profiles, quiz metadata) client-side
   - Use Firestore offline persistence for better UX

7. **Batch Operations:**
   - Use batch writes for multiple document updates
   - Reduces write costs and improves performance

## Server-Side Architecture & Security (STRICT REQUIREMENTS)

### ⚠️ CRITICAL: No Direct Client-to-Database Access

**MANDATORY RULE:** ALL database operations MUST go through server-side API routes. There must be ZERO direct client-to-database interaction.

### API Route Architecture

**Structure:**

- All server-side actions MUST be implemented in `/app/api/` folder
- Use Next.js App Router `route.ts` files for API endpoints
- Every database operation MUST be executed server-side only
- Client-side code can ONLY call API routes, NEVER directly access Firestore

**API Route Structure:**

```
/app/api/
  ├── auth/
  │   ├── login/route.ts
  │   ├── register/route.ts
  │   └── logout/route.ts
  ├── quizzes/
  │   ├── create/route.ts
  │   ├── [id]/route.ts
  │   ├── [id]/submit/route.ts
  │   └── [id]/results/route.ts
  ├── flashcards/
  │   ├── create/route.ts
  │   ├── [id]/route.ts
  │   └── [id]/update/route.ts
  ├── users/
  │   ├── profile/route.ts
  │   └── history/route.ts
  └── admin/
      └── set-claims/route.ts
```

### Authentication & Authorization (MANDATORY)

**CRITICAL:** Every API route MUST implement BOTH authentication AND authorization. These are separate checks and BOTH are required.

#### Authentication (Who are you?)

**Purpose:** Verify that the user is who they claim to be.

**Implementation Requirements:**

1. **Firebase ID Token Verification**
   - Extract `Authorization` header: `Bearer <token>`
   - Verify token using Firebase Admin SDK
   - Token must be valid, not expired, and not revoked
   - Extract user ID (`uid`) from verified token

2. **Custom Claims Extraction**
   - Extract `role` claim (student/teacher)
   - Extract `tier` claim (free/premium/pro)
   - Verify claims are present and valid

3. **Error Handling**
   - Missing token → 401 Unauthorized
   - Invalid token → 401 Unauthorized
   - Expired token → 401 Unauthorized
   - Token verification failure → 401 Unauthorized

**Example Implementation:**

```typescript
import { adminAuth } from "@/lib/firebase-admin";

async function verifyAuth(request: Request) {
  const authHeader = request.headers.get("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null; // Missing token
  }

  const token = authHeader.split("Bearer ")[1];

  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    return {
      uid: decodedToken.uid,
      role: decodedToken.role, // From custom claims
      tier: decodedToken.tier, // From custom claims
      email: decodedToken.email,
    };
  } catch (error) {
    return null; // Invalid/expired token
  }
}
```

#### Authorization (What can you do?)

**Purpose:** Verify that the authenticated user has permission to perform the requested operation.

**Authorization Checks Required:**

1. **Role-Based Authorization**
   - Teachers can create/edit/delete quizzes
   - Students CANNOT create quizzes
   - Students can only submit quiz attempts
   - Both roles can create flashcards

2. **Resource Ownership Authorization**
   - Users can only access their own profile
   - Users can only view their own quiz history
   - Teachers can only modify their own quizzes
   - Users can only modify their own flashcards

3. **Tier-Based Authorization**
   - Free tier: Limited quiz creation per day
   - Premium tier: Unlimited quiz creation
   - Check tier before allowing premium features

4. **Resource Access Authorization**
   - Students can only access active quizzes
   - Students can only submit attempts for accessible quizzes
   - Verify quiz exists and is accessible before operations

**Example Implementation:**

```typescript
// Role check
if (user.role !== "teacher") {
  return NextResponse.json(
    { error: "Forbidden: Teacher role required" },
    { status: 403 }
  );
}

// Resource ownership check
const quiz = await adminDb.collection("quizzes").doc(quizId).get();
if (!quiz.exists || quiz.data()?.teacherId !== user.uid) {
  return NextResponse.json(
    { error: "Forbidden: Not your resource" },
    { status: 403 }
  );
}

// Tier check
if (user.tier === "free" && dailyQuizCount >= 5) {
  return NextResponse.json(
    { error: "Forbidden: Tier limit exceeded" },
    { status: 403 }
  );
}

// Resource access check
if (quiz.data()?.isActive === false && user.role === "student") {
  return NextResponse.json(
    { error: "Forbidden: Quiz not accessible" },
    { status: 403 }
  );
}
```

#### Authentication vs Authorization

**Authentication (401 Unauthorized):**

- "Who are you?" → User not logged in or invalid token
- Response: `{ error: "Unauthorized" }`

**Authorization (403 Forbidden):**

- "Can you do this?" → User is authenticated but lacks permission
- Response: `{ error: "Forbidden: [reason]" }`

**Both Must Be Checked:**

- Authentication MUST happen first
- Authorization MUST happen after authentication
- Never skip either check
- Never trust client-side role/permission claims

**Summary:**

- **Authentication (401)**: "Are you logged in?" → Checks if user has valid token
- **Authorization (403)**: "Can you do this?" → Checks if user has permission
- **Both are MANDATORY** for every protected route
- **Order matters**: Authentication → Authorization → Business Logic
- **Never bypass**: Even for "trusted" operations, always verify both

### Mandatory Server-Side Validation Pipeline

**Every API route MUST follow this pipeline:**

1. **Authentication Check**
   - Verify Firebase ID token on EVERY request
   - Extract user ID and custom claims
   - Reject unauthorized requests immediately (401)
   - **MANDATORY:** No route can skip authentication (except explicitly public routes)

2. **Authorization Check**
   - Verify user role (student/teacher) from custom claims
   - Verify user permissions for the requested operation
   - Check resource ownership (users can only access their own data)
   - Verify tier-based permissions
   - Reject forbidden requests immediately (403)
   - **MANDATORY:** Authorization check MUST happen after authentication

3. **Rate Limiting**
   - Apply rate limits based on route type and user tier
   - Use Upstash Redis for distributed rate limiting
   - Return 429 if limit exceeded

4. **CSRF Protection**
   - Verify CSRF token for all mutating operations (POST, PUT, DELETE, PATCH)
   - Reject requests with invalid or missing CSRF tokens

5. **Input Validation & Sanitization**
   - Validate ALL input data using schema validation (Zod/Joi)
   - Sanitize all string inputs to prevent XSS
   - Validate file uploads (type, size, content)
   - Reject invalid or malformed requests

6. **Business Logic Execution**
   - Execute server-side business logic
   - Perform database operations using Firebase Admin SDK
   - Apply data transformations and calculations

7. **Response Sanitization**
   - Remove sensitive data from responses
   - Only return data the user is authorized to see
   - Sanitize output to prevent data leakage

### Prohibited Client-Side Operations

**NEVER allow client-side code to:**

- ❌ Directly initialize Firebase Admin SDK
- ❌ Directly access Firestore collections
- ❌ Directly read/write Firestore documents
- ❌ Directly set custom claims
- ❌ Directly access Firebase Storage without server validation
- ❌ Bypass API routes for any data operation

**Client-side Firebase SDK usage is ONLY allowed for:**

- ✅ Firebase Authentication (login, signup, logout)
- ✅ Real-time listeners for authorized data (with server-side permission checks)
- ✅ Firebase Storage uploads (with server-side validation endpoint)

### API Route Requirements

**Every `route.ts` file MUST:**

1. **Export proper HTTP methods:**

   ```typescript
   export async function GET(request: Request) {}
   export async function POST(request: Request) {}
   export async function PUT(request: Request) {}
   export async function DELETE(request: Request) {}
   ```

2. **Include authentication middleware:**
   - Verify Firebase ID token
   - Extract user information
   - Check authorization

3. **Validate all inputs:**
   - Use schema validation library (Zod recommended)
   - Reject invalid requests with 400 status

4. **Apply rate limiting:**
   - Use Upstash Redis for distributed rate limiting
   - Return appropriate rate limit headers

5. **Handle errors securely:**
   - Never expose internal errors to client
   - Log errors server-side
   - Return generic error messages

6. **Return proper HTTP status codes:**
   - 200: Success
   - 201: Created
   - 400: Bad Request (validation errors)
   - 401: Unauthorized (authentication failed)
   - 403: Forbidden (authorization failed)
   - 404: Not Found
   - 429: Too Many Requests (rate limit exceeded)
   - 500: Internal Server Error

7. **Include complete HTTP headers (MANDATORY for production):**
   - **Content-Type**: `application/json` for JSON responses
   - **X-Content-Type-Options**: `nosniff` (prevent MIME sniffing)
   - **X-Frame-Options**: `DENY` (prevent clickjacking)
   - **X-XSS-Protection**: `1; mode=block` (XSS protection)
   - **Strict-Transport-Security**: `max-age=31536000; includeSubDomains` (HTTPS only)
   - **Content-Security-Policy**: Appropriate CSP headers
   - **Referrer-Policy**: `strict-origin-when-cross-origin`
   - **Permissions-Policy**: Restrict browser features
   - **Rate Limit Headers**: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`
   - **CORS Headers**: `Access-Control-Allow-Origin`, `Access-Control-Allow-Methods`, `Access-Control-Allow-Headers` (if needed)
   - **Cache-Control**: Appropriate caching headers (`no-store` for sensitive data, `public, max-age=3600` for public data)
   - **ETag**: For cache validation (where applicable)
   - **Vary**: `Accept, Authorization` (when content varies)

### Data Flow Architecture

**Correct Flow:**

```
Client → API Route (/app/api/*) → Firebase Admin SDK → Firestore
         ↓
    [Authentication]
    [Authorization]
    [Rate Limiting]
    [CSRF Check]
    [Input Validation]
    [Sanitization]
    [Business Logic]
    [Response Sanitization]
```

**Prohibited Flow:**

```
Client → Firebase Client SDK → Firestore ❌ FORBIDDEN
```

### HTTP Headers Requirements (Production-Ready)

**MANDATORY Headers for ALL API Responses:**

Every API route MUST include the following headers in every response:

```typescript
const headers = {
  // Content Type
  "Content-Type": "application/json; charset=utf-8",

  // Security Headers
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
  "Content-Security-Policy":
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://*.firebaseio.com https://*.googleapis.com;",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "geolocation=(), microphone=(), camera=()",

  // Rate Limiting Headers (when applicable)
  "X-RateLimit-Limit": "60",
  "X-RateLimit-Remaining": "59",
  "X-RateLimit-Reset": "1640995200",

  // Caching Headers (adjust based on data sensitivity)
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate", // For sensitive data
  // OR
  // "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400", // For public data

  // CORS Headers (if needed)
  "Access-Control-Allow-Origin": process.env.NEXT_PUBLIC_APP_URL || "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-CSRF-Token",
  "Access-Control-Max-Age": "86400",

  // Additional Headers
  Vary: "Accept, Authorization",
};
```

**Header Guidelines:**

- **Security Headers**: MUST be present on ALL responses (no exceptions)
- **Rate Limit Headers**: Include on ALL responses (even if not rate-limited, show limits)
- **Cache-Control**: Set appropriately based on data sensitivity
- **CORS Headers**: Only include if cross-origin requests are needed
- **Content-Type**: Always set correctly (JSON, text, etc.)
- **Custom Headers**: Use `X-` prefix for custom headers (e.g., `X-Request-ID` for tracing)

**Production Considerations:**

- All headers must be properly formatted
- Headers must be consistent across all routes
- Security headers must not be disabled or weakened
- Cache headers must be set correctly to prevent sensitive data caching
- CORS must be configured restrictively (not `*` in production)

### Security Enforcement

**Implementation Checklist:**

**Authentication & Authorization (MANDATORY):**

- [ ] **ALL API routes verify Firebase ID token (authentication)**
- [ ] **ALL API routes check user role from custom claims (authorization)**
- [ ] **ALL API routes verify resource ownership (authorization)**
- [ ] **ALL API routes check tier-based permissions (authorization)**
- [ ] Authentication happens BEFORE authorization
- [ ] 401 Unauthorized returned for authentication failures
- [ ] 403 Forbidden returned for authorization failures
- [ ] Never skip authentication check (except explicitly public routes)
- [ ] Never skip authorization check (even for "trusted" users)
- [ ] Never trust client-side role/permission claims
- [ ] Custom claims verified server-side using Firebase Admin SDK

**Rate Limiting & Security:**

- [ ] All API routes apply rate limiting
- [ ] All API routes validate and sanitize inputs
- [ ] All API routes use Firebase Admin SDK (never client SDK for database ops)
- [ ] No direct Firestore access from client-side code
- [ ] All responses are sanitized before sending to client
- [ ] All errors are logged server-side without exposing details to client

**HTTP Headers (Production-Ready):**

- [ ] **ALL API routes include complete HTTP headers (security, rate limiting, caching)**
- [ ] **Headers are consistent across all routes**
- [ ] **Security headers are never disabled or weakened**
- [ ] **Cache headers prevent sensitive data caching**
- [ ] **CORS is configured restrictively**

## Security Considerations

### Authentication & Authorization

- Private quiz URLs should be unique and hard to guess (use crypto.randomUUID())
- Authentication required for all quiz access
- Role-based permissions enforced via Firebase custom claims
- Custom claims verification on protected routes (server-side)
- Server-side validation of user roles and permissions on every request
- Verify Firebase ID tokens on all protected API routes

### Rate Limiting

**Implementation:**

- Rate limiting on ALL API routes (Next.js API routes)
- Use middleware or API route wrapper for consistent rate limiting
- Store rate limit data in Firestore `rateLimits` collection or Redis (if available)

**Rate Limits by Route:**

- **Authentication Routes** (login, register, password reset):
  - 5 requests per 15 minutes per IP
  - 10 requests per hour per user
- **Quiz Creation Routes** (PDF upload, AI generation):
  - 3 requests per hour per user (teacher role)
  - 5 requests per day for free tier
- **Quiz Submission Routes**:
  - 10 submissions per hour per user
  - 50 submissions per day per user
- **Quiz History/Results Routes**:
  - 30 requests per minute per user
- **Flashcard Creation Routes**:
  - 20 requests per hour per user
- **General API Routes**:
  - 60 requests per minute per user
  - 1000 requests per hour per IP

**Rate Limit Headers:**

- Include `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` headers
- Return 429 status code when limit exceeded

### CSRF Protection

**Implementation:**

- CSRF tokens required for all state-changing operations (POST, PUT, DELETE, PATCH)
- Generate CSRF tokens server-side and include in response headers or cookies
- Verify CSRF tokens on all mutating API routes
- Use SameSite cookie attributes for additional protection

**Protected Operations:**

- Quiz creation/editing
- Quiz submission
- Flashcard creation/editing
- User profile updates
- Any data modification operations

**CSRF Token Strategy:**

- Generate token on page load (GET requests)
- Store token in httpOnly cookie or include in response header
- Client sends token in request header (`X-CSRF-Token`)
- Verify token on server before processing request

### Input Validation & Sanitization

**MANDATORY for ALL API Routes:**

- **ALL** user inputs MUST be validated server-side (never trust client-side validation)
- Use schema validation library (Zod recommended) for type-safe validation
- Sanitize file uploads (PDF type validation, size limits)
- Validate file size: Max 10MB for PDF uploads
- Validate file type: Only allow PDF files
- Sanitize all string inputs to prevent XSS attacks
- Validate email formats and phone numbers
- Reject requests with invalid or malformed data immediately (400 status)
- Never process unvalidated data, even for "trusted" operations
- Validate array lengths and object structures
- Enforce maximum string lengths to prevent DoS attacks

### Firestore Security Rules

**IMPORTANT:** Firestore Security Rules are a DEFENSE-IN-DEPTH layer. All access MUST still go through API routes. Security rules provide an additional security layer but are NOT a replacement for server-side validation.

**Rules Structure:**

```javascript
// Example structure (to be implemented)
// These rules provide defense-in-depth but API routes handle primary security

// Users collection
- Users can only read their own user document
- Users can only update their own user document (limited fields)
- No direct creation (handled by API routes)

// Quizzes collection
- Teachers can create quizzes (verified via custom claims)
- Students CANNOT create quizzes
- Students can only read active quizzes (isActive: true)
- Teachers can read/update their own quizzes
- No direct deletion (handled by API routes with soft delete)

// Quiz Attempts collection
- Students can only create attempts for quizzes they have access to
- Users can only read their own quiz attempts
- Teachers can read all attempts for their quizzes
- No direct updates or deletions

// Flashcards collection
- Users can create their own flashcard sets
- Users can read their own flashcards OR public flashcards (isPublic: true)
- Users can only update/delete their own flashcards
```

**Security Rules Best Practices:**

- Use custom claims for role verification in rules
- Validate data structure and types in rules
- Enforce field-level permissions
- Prevent unauthorized collection queries
- Use request.auth.uid for user-based access control
- Deny all by default, allow only specific operations
- Use rules as a safety net, not primary security mechanism

### API Security

**MANDATORY Requirements:**

- **ALL** API routes require authentication (except explicitly public routes like health checks)
- Verify Firebase ID token on **EVERY** protected route
- **NO** direct database access from client-side code
- **ALL** database operations MUST use Firebase Admin SDK (server-side only)
- Use HTTPS only (enforce in production)
- Implement request signing for sensitive operations
- Log all authentication failures and suspicious activities
- Use environment variables for all secrets (never commit to git)
- Never expose internal error details to clients
- Implement proper CORS policies
- Validate request origins for sensitive operations

### File Upload Security

- PDF upload size limits: 10MB maximum
- File type validation: Only PDF files allowed
- Virus scanning (if possible)
- Store uploads in Firebase Storage with proper access rules
- Generate unique file names to prevent overwrites
- Validate PDF structure before processing

### Additional Security Measures

- Implement request logging and monitoring
- Set up alerts for suspicious activity (multiple failed logins, unusual patterns)
- Regular security audits and dependency updates
- Use Content Security Policy (CSP) headers
- Implement CORS properly (restrict to allowed origins)
- Rate limiting on AI API calls (Gemini API)
- Implement timeout for long-running operations (PDF processing, AI generation)

## Future Enhancements (Optional)

- Quiz analytics and performance tracking for teachers
- Multiple choice, true/false, short answer question types
- Quiz timer functionality
- Export quizzes as PDF
- Bulk quiz generation
- Advanced student progress tracking and analytics
- Flashcard spaced repetition algorithm
- Compare results across multiple attempts
- Export quiz results as PDF
