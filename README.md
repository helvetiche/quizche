# QuizChe

A modern, AI-powered educational platform for creating and managing quizzes and flashcards. Built with Next.js, Firebase, and Google Gemini AI.

## Overview

QuizChe is a production-ready web application that enables teachers to create intelligent quizzes and students to generate personalized flashcards from PDF documents. The platform features real-time quiz monitoring, anti-cheat mechanisms, and AI-powered content generation.

## Key Features

### For Teachers
- **AI Quiz Generation**: Upload PDFs and automatically generate quizzes with multiple question types (multiple choice, identification, true/false)
- **Section Management**: Create and manage student sections/classes
- **Live Quiz Monitoring**: Real-time tracking of student quiz attempts with anti-cheat detection
- **Quiz Analytics**: View detailed results and student performance metrics
- **Flexible Quiz Settings**: Configure time limits, difficulty levels, and custom instructions

### For Students
- **AI Flashcard Generation**: Convert PDF study materials into interactive flashcards
- **Quiz Taking**: Complete assigned quizzes with instant feedback
- **Study History**: Track quiz attempts and review past performance
- **Peer Connections**: Connect with other students for collaborative learning
- **Flashcard Management**: Create, edit, and study custom flashcard sets

### Security & Performance
- **Firebase Authentication**: Secure Google OAuth integration
- **Role-Based Access Control**: Separate teacher and student permissions
- **CSRF Protection**: Token-based security for all mutating operations
- **Rate Limiting**: Redis-backed rate limiting with Upstash
- **Caching**: Multi-layer caching (Redis + Firestore) for optimal performance
- **Anti-Cheat System**: Tab change detection, time tracking, and violation monitoring

### AI Capabilities
- **PDF Text Extraction**: Intelligent content extraction from PDF documents
- **Smart Quiz Generation**: Context-aware question generation with explanations
- **Flashcard Creation**: Automated front/back card generation from study materials
- **Difficulty Levels**: Easy, medium, and hard content adaptation
- **Custom Instructions**: Additional prompts for tailored content generation

## Tech Stack

### Frontend
- **Next.js 16** - React framework with App Router
- **React 19** - UI library
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **Motion** - Animation library
- **Three.js** - 3D graphics and effects

### Backend
- **Next.js API Routes** - Serverless functions
- **Firebase Admin SDK** - Server-side Firebase operations
- **Google Gemini AI** - AI content generation (2.0 Flash & 1.5 Flash)
- **Upstash Redis** - Rate limiting and caching
- **Zod** - Runtime validation

### Infrastructure
- **Firebase Firestore** - NoSQL database
- **Firebase Authentication** - User management
- **Vercel** - Deployment platform
- **Redis** - Caching and rate limiting

## Project Structure

```
quizche/
├── app/
│   ├── api/              # API routes (serverless functions)
│   │   ├── auth/         # Authentication endpoints
│   │   ├── quizzes/      # Quiz CRUD and generation
│   │   ├── flashcards/   # Flashcard CRUD and generation
│   │   ├── teacher/      # Teacher-specific endpoints
│   │   ├── student/      # Student-specific endpoints
│   │   └── connections/  # Student connection management
│   ├── components/       # React components
│   │   ├── auth/         # Authentication components
│   │   ├── dashboard/    # Dashboard views
│   │   ├── create/       # Content creation components
│   │   └── ui/           # Reusable UI components
│   ├── student/          # Student pages
│   ├── teacher/          # Teacher pages
│   └── hooks/            # Custom React hooks
├── lib/
│   ├── firebase-admin.ts # Firebase Admin SDK setup
│   ├── firebase.ts       # Firebase client SDK
│   ├── gemini.ts         # AI generation logic
│   ├── auth.ts           # Authentication utilities
│   ├── rate-limit.ts     # Rate limiting
│   ├── cache.ts          # Caching layer
│   ├── validation.ts     # Input validation schemas
│   └── security-headers.ts # HTTP security headers
└── components/           # Shared UI components

```

## Getting Started

### Prerequisites
- Node.js 20+
- Firebase project with Firestore and Authentication
- Google Gemini API key
- Upstash Redis instance

### Environment Variables

Create a `.env` file with the following variables:

```env
# Firebase Client (Public)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Firebase Admin (Private - Server Only)
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=

# Google Gemini AI
NEXT_PRIVATE_GEMINI_API_KEY=

# Upstash Redis
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# ImgBB (Image Upload)
IMGBB_API_KEY=
```

### Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

### Development Commands

```bash
# Lint code
npm run lint

# Format code
npm run format

# Check formatting
npm run format:check

# Analyze bundle size
npm run analyze
```

## API Architecture

All API routes follow a strict security pattern:

1. **Authentication** - Verify Firebase ID token
2. **Authorization** - Check user role and permissions
3. **Rate Limiting** - Prevent abuse
4. **CSRF Protection** - Validate CSRF tokens for mutations
5. **Input Validation** - Zod schema validation
6. **Business Logic** - Execute operation
7. **Response** - Return with security headers

### Example API Flow

```typescript
POST /api/quizzes/generate
├── Verify Firebase token (401 if invalid)
├── Check teacher role (403 if not teacher)
├── Rate limit check (429 if exceeded)
├── CSRF validation (403 if invalid)
├── Validate PDF upload (400 if invalid)
├── Extract text from PDF
├── Generate quiz with AI
├── Track AI usage
└── Return quiz data with security headers
```

## Security Features

- **No Direct Client Database Access**: All Firestore operations go through API routes
- **Service Account Authentication**: Backend uses Firebase Admin SDK
- **HTTP Security Headers**: CSP, HSTS, X-Frame-Options, etc.
- **Input Sanitization**: DOMPurify for user-generated content
- **Rate Limiting**: Per-user and per-operation limits
- **CSRF Tokens**: Required for all state-changing operations
- **Anti-Cheat Detection**: Tab monitoring and violation tracking

## Performance Optimizations

- **Multi-Layer Caching**: Redis + Firestore caching
- **PDF Extraction Caching**: Reuse extracted text for identical PDFs
- **AI Response Caching**: Cache quiz/flashcard generation results
- **Batch Queries**: Minimize Firestore reads
- **Pagination**: Efficient data loading
- **Bundle Optimization**: Code splitting and tree shaking

## AI Generation

### Quiz Generation
- Supports 3 difficulty levels (easy, medium, hard)
- Multiple question types (multiple choice, identification, true/false)
- Includes explanations for each answer
- Custom instruction support
- Fallback model support (Gemini 2.0 Flash → 1.5 Flash)

### Flashcard Generation
- Automatic front/back card creation
- Difficulty-based content adaptation
- Concise formatting (front <200 chars, back <500 chars)
- Custom instruction support

## Database Schema

### Collections
- `users` - User profiles and roles
- `quizzes` - Quiz definitions and questions
- `flashcards` - Flashcard sets and cards
- `sections` - Teacher class sections
- `section_students` - Section membership
- `connections` - Student peer connections
- `quizAttempts` - Quiz submission records
- `activeQuizSessions` - Live quiz monitoring
- `pdfExtractionCache` - Cached PDF text extraction
- `aiUsage` - AI cost tracking

## Contributing

This is a production application. All contributions must:
- Follow TypeScript strict mode
- Include proper error handling
- Add security headers to responses
- Validate all inputs with Zod
- Include rate limiting for expensive operations
- Pass ESLint checks

## License

Private - All rights reserved

## Support

For issues or questions, please contact the development team.
