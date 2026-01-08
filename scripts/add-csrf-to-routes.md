# Routes that need CSRF protection

## POST routes:
- ✅ app/api/flashcards/route.ts - POST
- ✅ app/api/flashcards/generate/route.ts - POST
- ✅ app/api/quizzes/route.ts - POST
- ✅ app/api/quizzes/generate/route.ts - POST
- ✅ app/api/student/quizzes/submit/route.ts - POST
- ⏳ app/api/flashcards/[id]/route.ts - PUT
- ⏳ app/api/quizzes/[id]/route.ts - PUT
- ⏳ app/api/users/profile/route.ts - POST, PUT
- ⏳ app/api/upload/image/route.ts - POST
- ⏳ app/api/connections/route.ts - POST
- ⏳ app/api/flashcards/[id]/share/route.ts - POST, DELETE
- ⏳ app/api/connections/[id]/route.ts - PUT, DELETE
- ⏳ app/api/teacher/sections/route.ts - POST
- ⏳ app/api/teacher/sections/[id]/route.ts - DELETE
- ⏳ app/api/student/quizzes/[id]/session/route.ts - POST, PUT, DELETE
- ⏳ app/api/teacher/students/route.ts - POST
- ⏳ app/api/auth/register/route.ts - POST
- ⏳ app/api/auth/login/route.ts - POST (may skip - authentication endpoint)
