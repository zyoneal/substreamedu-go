# Spec 08: Teacher Mode & Interactive Lesson Builder (Spec 05B)

## 1. Objective & Problem Statement
Language tutors and English teachers frequently use YouTube clips, movies, and authentic video dialogues during 1-on-1 and group lessons. However, manually creating lesson plans, vocabulary sheets, comprehension quizzes, and discussion questions from a 3-minute video clip takes 30–60 minutes of tedious teacher prep time.

**Feature 08 (Spec 05B)** automates this entire pipeline:
1. The teacher clicks **"Lesson Studio"** on any video with subtitles.
2. AI analyzes the subtitle transcript and generates a structured, CEFR-aligned **Lesson Plan** in seconds (Vocabulary & Chunks, Comprehension Quizzes, Grammar Focus with timestamps, and Speaking Prompts).
3. The teacher can customize/edit the lesson in an interactive studio.
4. The teacher publishes/shares a clean link (`/lesson/:shareToken`) that students can open without mandatory account registration to complete interactive exercises alongside the video.

---

## 2. In-Scope vs. Out-of-Scope

### In-Scope
- **AI Lesson Generation Pipeline**: Backend endpoint `POST /api/dictionary/lessons/generate` powered by DeepSeek/Groq/Gemini fallbacks with structured JSON parsing.
- **Database Persistence**: Migration `000005_create_lessons_table` in `substreamedu_dictionary` storing lessons with unique `share_token` (UUIDv4).
- **Public & Authenticated Endpoints**:
  - `POST /api/dictionary/lessons/generate` (Generate lesson from subtitles)
  - `POST /api/dictionary/lessons` (Save/publish lesson)
  - `GET /api/dictionary/lessons/share/:shareToken` (Public student view, no login required)
  - `GET /api/dictionary/lessons/my` (Teacher's saved lessons)
  - `DELETE /api/dictionary/lessons/:id` (Delete lesson)
- **Teacher UI (Lesson Studio)**:
  - Accessible via "Lesson Studio" button in `VideoPlayer.tsx`.
  - Level selection (A2–C1), live preview, editable cards, printable worksheet format.
  - "Share with Student" link generator with instant clipboard copy.
- **Student View (`/lesson/:shareToken`)**:
  - Standalone route in `routes.tsx` (`StudentLessonPage.tsx`).
  - Synced video player + step-by-step interactive lesson stages (Vocabulary with TTS, Comprehension Quiz with score, Grammar Gap-fills, and Discussion Prompts).

### Out-of-Scope
- Full multi-tenant school LMS with gradebooks and live video calls (use Zoom/Google Meet alongside SubStreamEdu).
- Real-time multiplayer collaborative typing.

---

## 3. Architecture & Data Schema

### 3.1 PostgreSQL Database Schema (`substreamedu_dictionary`)
```sql
CREATE TABLE IF NOT EXISTS lessons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    share_token VARCHAR(32) UNIQUE NOT NULL,
    title TEXT NOT NULL,
    target_level VARCHAR(10) DEFAULT 'B1',
    media_source TEXT,
    youtube_id VARCHAR(32),
    content JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lessons_share_token ON lessons(share_token);
CREATE INDEX IF NOT EXISTS idx_lessons_user_created ON lessons(user_id, created_at DESC);
```

### 3.2 Content JSON Structure
```json
{
  "title": "Making Excuses & Genuine Apologies",
  "level": "B2",
  "estimatedTimeMin": 45,
  "summary": "This scene explores nuanced ways characters offer apologies and negotiate misunderstandings.",
  "vocabulary": [
    {
      "word": "out of the blue",
      "definition": "Completely unexpectedly without warning",
      "context": "He just called me out of the blue yesterday.",
      "timestampSec": 45,
      "cefr": "B2"
    }
  ],
  "comprehensionQuestions": [
    {
      "question": "Why did Sarah refuse to accept the explanation initially?",
      "type": "multiple-choice",
      "options": ["She thought it was insincere", "She had already left", "She was in a hurry", "She didn't hear him"],
      "correctIndex": 0,
      "explanation": "Sarah explicitly stated that the excuse felt rehearsed and lacked sincerity."
    }
  ],
  "grammarFocus": [
    {
      "pattern": "Second Conditional for Hypothetical Regrets",
      "rule": "If + past simple, would + bare infinitive",
      "exampleFromVideo": "If I knew you were waiting, I wouldn't have been late.",
      "exerciseGapFill": "If I ___ (be) in your position, I would apologize immediately.",
      "exerciseAnswer": "were"
    }
  ],
  "speakingPrompts": [
    "Have you ever had to apologize for a misunderstanding at work or school? What happened?",
    "Do you think actions speak louder than words when making amends?"
  ],
  "homeworkIdea": "Write a 5-sentence dialogue where two friends resolve an accidental disagreement using at least 3 vocabulary phrases from this lesson."
}
```

---

## 4. Implementation Rules & File Boundaries
- **Backend Touchpoints**:
  - `substreamedu-dictionary-service-go/internal/dto/lesson_dto.go`
  - `substreamedu-dictionary-service-go/internal/service/ai_service.go`
  - `substreamedu-dictionary-service-go/internal/repository/lesson_repository.go`
  - `substreamedu-dictionary-service-go/internal/repository/migrations/000005_create_lessons_table.*.sql`
  - `substreamedu-dictionary-service-go/internal/handler/dictionary_handler.go`
  - `substreamedu-dictionary-service-go/internal/router/router.go`
- **Frontend Touchpoints**:
  - `substreamedu-frontend/src/services/LessonService.ts`
  - `substreamedu-frontend/src/components/VideoPage/components/LessonStudioModal.tsx`
  - `substreamedu-frontend/src/components/VideoPage/VideoPlayer.tsx`
  - `substreamedu-frontend/src/components/LessonPage/StudentLessonPage.tsx`
  - `substreamedu-frontend/src/routes/routes.tsx`
  - `substreamedu-frontend/src/App.tsx` (allowedPaths update for `/lesson/`)

---

## 5. Verification Checklist
1. `go test ./...` in `substreamedu-dictionary-service-go`.
2. `npm test -- --watchAll=false` in `substreamedu-frontend`.
3. `npm run build` in `substreamedu-frontend`.
4. Check database migration runs idempotently.
5. End-to-end verification of Lesson Generation, editing, sharing via `/lesson/:shareToken`, and student interactive completion.
