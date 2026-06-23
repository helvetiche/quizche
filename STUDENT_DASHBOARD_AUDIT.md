# Student Dashboard — UI Modernization Audit

> Investigated on 2026-06-23. Lists every component that is still on the **old design system** and needs to be aligned to the current neo-brutalist amber theme used by the teacher dashboard and the student Home tab.

---

## Design System Reference (the "modernized" look)

All newly-styled components follow these patterns:

| Token | Value |
|---|---|
| Borders | `border-3 border-gray-900` (thick black) |
| Shadows | Hard offset: `shadow-[4px_4px_0px_0px_rgba(31,41,55,1)]` |
| Surfaces | `bg-amber-50` / `bg-amber-100` |
| Headings | `font-black`, large (`text-5xl`) |
| Buttons | Rounded-full, amber bg, border-3, offset shadow, lift-on-hover (`hover:-translate-y-0.5 hover:shadow-[5px_5px_...]`) |
| Cards | macOS "traffic light" dots (red/yellow/green), wrapped in `TiltedCard`, laid out with `Masonry`, glimmer/shine hover effects |
| Structure | Decomposed into small components (Header, Grid, Card, modals) + a `use*` data hook |
| Icons | `material-icons-outlined` font classes |
| Empty states | Neo-brutalist containers: `bg-amber-100 border-3 border-gray-900 rounded-3xl shadow-[8px_8px_0px_0px_rgba(31,41,55,1)]` |
**Modernized reference files** (study these for the target look):
- `app/components/dashboard/student/StudentHomeContent.tsx` — student Home tab ✅
- `app/components/dashboard/teacher/home/QuizCard.tsx` — teacher quiz cards ✅
- `app/components/dashboard/teacher/home/HomeHeader.tsx` — teacher header/search/filters ✅
- `app/components/dashboard/teacher/home/QuizGrid.tsx` — teacher grid with pagination ✅

---

## Unmodernized Components

### 1. Student Quizzes Tab

**File:** `app/components/dashboard/student/StudentQuizzesContent.tsx` (198 lines)

**What's old:**
- Flat borders: `border border-gray-200 rounded-lg`
- Flat buttons: `bg-black text-white` with no border, no shadow, no rounded-full
- Heading: `text-3xl font-light` (should be `font-black`)
- No icons, no traffic lights, no TiltedCard, no Masonry
- Skeleton loaders are basic `bg-gray-200` boxes
- Empty state is a plain `bg-white border border-gray-200 rounded-lg` paragraph
- Monolithic — no decomposition into sub-components

**Should look like:**
- Neo-brutalist cards with TiltedCard + Masonry (same pattern as the Home tab flashcard cards)
- Amber-themed buttons with border-3, rounded-full, offset shadow
- Traffic light dots on cards
- Skeleton loaders matching the card structure
- Decomposed into `StudentQuizzesHeader`, `StudentQuizCard`, `StudentQuizGrid`, `useStudentQuizzes` hook

---

### 2. Student Flashcards Tab ("My Flashcards")

**File:** `app/components/dashboard/student/StudentFlashcardsContent.tsx` (262 lines)

**What's old:**
- Same flat design as Quizzes: `border border-gray-200`, `bg-black text-white` buttons, `font-light` headings
- Cards are plain `bg-white border-2 border-black rounded-lg` — no offset shadow, no traffic lights, no TiltedCard
- "View / Study / Edit" buttons are flat gray/black rectangles instead of rounded amber buttons
- Tags render as `bg-gray-100 border border-gray-200` instead of `bg-amber-200 border border-gray-900`
- No Masonry layout
- The "Create New Set" link is a flat `bg-black text-white` rectangle

**Note:** The Home tab (StudentHomeContent) already renders flashcard cards in the modern style (TiltedCard + Masonry + traffic lights). The My Flashcards tab renders the *same data type* but in the completely old way. This visual inconsistency between tabs is the most jarring one.

**Should look like:**
- Same card design as Home tab (TiltedCard, traffic lights, amber-50 bg, offset shadow)
- Masonry layout
- Amber-themed action buttons with hover effects
- Decomposed into sub-components + hook

---

### 3. Student History Tab

**File:** `app/components/dashboard/student/StudentHistoryContent.tsx` (299 lines)

**What's old:**
- Stats cards: `bg-white border border-gray-200 rounded-lg` — flat, no offset shadow, no amber
- Stat values: `text-3xl font-light` — should be `font-black`
- Attempt list items: `bg-white border-2 border-black rounded-lg p-6` — no offset shadow, no hover effects
- "View Details" button: flat `bg-black text-white` rectangle
- "Load More" button: flat `bg-gray-200 text-black`
- Score badges: plain rounded pills — no neo-brutalist styling
- **Bonus issue:** Empty state uses a hand-coded inline `<svg>` icon (lines 261–273) instead of a Material Icons font icon

**Should look like:**
- Stats cards in amber with border-3 and offset shadow
- Attempt items with hover effects and neo-brutalist borders
- Amber-themed buttons
- Material Icons empty state icon
- Decomposed into sub-components + hook

---

### 4. Student Connections Tab

**File:** `app/components/dashboard/student/StudentConnectionsContent.tsx` (119 lines)

**What's old:**
- Tab toggles: flat `bg-black text-white` / `bg-gray-200 text-black` rectangles — should be pill-style with amber accent
- Connection request container: `bg-white border border-gray-200 rounded-lg`
- Heading: `text-3xl font-light` — should be `font-black`
- No icons anywhere

**Bonus bug:** Line 67 — `if (loading !== undefined && loading !== null)` is always `true` once `loading` is set to `false` (since `false !== undefined && false !== null` is `true`). This means the early-return loading screen never dismisses correctly. Should just be `if (loading)`.

**Should look like:**
- Neo-brutalist tab pills with amber accent (same filter pill style as Home tab)
- Amber-themed containers with border-3 and offset shadow
- Decomposed if it grows

---

### 5. Shared Profile Modal — Dead `.bak` Files

**Files to delete:**
- `app/components/dashboard/shared/ProfileContent.tsx.bak`
- `app/components/dashboard/shared/ProfileModal.tsx.bak`

**Reason:** These are never imported anywhere in the codebase. They're leftover copies from a refactor and add noise.

---

### 6. Icon System Inconsistency (whole app)

**The problem:** There is no single source of truth for icons.

| Style | Where used |
|---|---|
| `material-icons-outlined` font classes | Majority of the app (~62 files), loaded in `app/layout.tsx` |
| `lucide-react` React components | Only 3 files (all in student `view-flashcard/`), in `package.json` as dependency |

**Files using lucide-react instead of Material Icons:**
- `app/components/dashboard/student/view-flashcard/FlashcardDetails.tsx`
- `app/components/dashboard/student/view-flashcard/FlashcardHeader.tsx`
- `app/components/dashboard/student/view-flashcard/CommentItem.tsx`

**Recommendation:** Pick one. Material Icons is dominant; lucide-react is barely used. Either convert the 3 lucide files to Material Icons, or migrate everything to lucide-react.

---

## Priority Order

1. **`StudentQuizzesContent.tsx`** — most-used student tab, biggest visual gap
2. **`StudentFlashcardsContent.tsx`** — jarring inconsistency with Home tab flashcards
3. **`StudentHistoryContent.tsx`** — stats + attempt list need full restyle
4. **`StudentConnectionsContent.tsx`** — smallest file, also has a loading bug
5. **Delete `.bak` files** — quick cleanup
6. **Standardize icon library** — decide Material Icons vs lucide-react app-wide

---

## Suggested Approach Per Tab

For each of the 4 tabs, follow the pattern already established by the teacher side and the student Home tab:

```
app/components/dashboard/student/
  quiz/
    StudentQuizCard.tsx        ← card component
    StudentQuizGrid.tsx         ← grid with Masonry + pagination
    StudentQuizHeader.tsx       ← title + search + filters (if needed)
    StudentQuizEmpty.tsx       ← empty state
    StudentQuizSkeleton.tsx    ← skeleton loader
    hooks/
      useStudentQuizzes.ts     ← data fetching + filtering logic
    types.ts                    ← type definitions
  StudentQuizzesContent.tsx    ← orchestrator (thin, just wires things together)
```

Repeat this structure for `flashcard/`, `history/`, and `connections/`.
