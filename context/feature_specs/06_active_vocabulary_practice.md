# Feature Spec 06: Active Vocabulary Practice (Spec 05A)

## 1. Goal
Transform passive flashcard recognition into active production by providing an **Active Vocabulary Practice** engine on the Learning page (`/learning`). Learners will practice words in authentic context through:
1. **Contextual Gap-Fills (Cloze)**: Missing target words in real subtitle or AI-generated sentences with hint options.
2. **Paraphrasing / Sentence Transformation**: Rewriting an idea using a saved target word or collocation.
3. **Sentence Builder with Instant AI Evaluation**: Writing original sentences with real-time feedback on grammar, naturalness, and native polish.

---

## 2. Design & Architectural Decisions

1. **Zero Database Schema Mutations**:
   - Practice exercises are generated on-the-fly from the user's existing dictionary items, their recorded subtitle context (`item.context`), and the active SRS session words.
   - Requires zero database schema alterations and zero migrations.

2. **Backend Endpoints (`substreamedu-dictionary-service-go`)**:
   - `POST /api/dictionary/practice/generate-exercises`: Generates structured gap-fill and paraphrase exercises for a list of words.
   - `POST /api/dictionary/practice/evaluate-sentence`: Evaluates a learner's original sentence for a target word, providing a status (`native`, `natural`, `minor_issues`, `incorrect`), teacher feedback, and an improved native variant.
   - Built with resilient fallback: if the LLM provider is slow or unreachable, algorithmic cloze extraction from `item.context` provides instant exercises with zero 5xx downtime.

3. **Frontend Learning Architecture (`substreamedu-frontend`)**:
   - **Mode Navigation in `LearningPage.tsx`**: Top tab bar toggling between `[ 🎴 Flashcards (SRS) ]` and `[ ⚡ Active Practice ]`.
   - **Bridge from SRS Review (`Flashcards.tsx`)**: When completing a flashcard wave/session, the summary screen features a prominent CTA: *"Practice these words actively"* that automatically switches to the Active Practice tab with the reviewed session words preloaded.
   - **Active Practice Component (`ActivePractice.tsx`)**:
     - Mode selector: Cloze Gap-Fill, Paraphrase, or Sentence Builder.
     - Interactive Cloze with audio pronunciation (`useTTS`), hint reveals (translation, part of speech, first letter), keyboard shortcuts (`Enter` to submit).
     - Sentence Builder with real-time AI critique card.
     - Session completion card with performance score and quick restart options.
   - **Visual Standards**: Full adherence to the **Warm Cinematic Espresso** design system (`#0d0c0b` canvas, `var(--color-canvas)`, `#ede8e0` ink, `#9e988f` body, `#262421` surface elevated, zero UI emojis, Lucide icons, Framer Motion transitions).

---

## 3. Implementation Rules

### What to Touch:
- `substreamedu-dictionary-service-go/internal/dto/dto.go`: Add request and response DTOs for practice generation and sentence evaluation.
- `substreamedu-dictionary-service-go/internal/service/ai_service.go`: Implement `GeneratePracticeExercises` and `EvaluateSentence` with structured prompts and robust fallbacks.
- `substreamedu-dictionary-service-go/internal/handler/dictionary_handler.go`: Add handlers for both endpoints.
- `substreamedu-dictionary-service-go/internal/router/router.go`: Register routes under `/dictionary/practice/*`.
- `substreamedu-frontend/src/services/DictionaryService.ts`: Add API methods for practice endpoints.
- `substreamedu-frontend/src/components/LearningPage/LearningPage.tsx`: Add mode switcher tab bar.
- `substreamedu-frontend/src/components/LearningPage/Flashcards.tsx`: Add callback/CTA to launch active practice for session words.
- `substreamedu-frontend/src/components/LearningPage/ActivePractice.tsx`: New active practice UI component.
- `substreamedu-frontend/src/components/LearningPage/ActivePractice.module.css`: Styles for active practice engine.

### What NOT to Touch:
- Do NOT alter database migrations or table schemas.
- Do NOT mutate FSRS calculation logic or database review logs.
- Do NOT change gateway route configs (the gateway already proxies `/api/dictionary/**`).

---

## 4. Verification Checklist
- [ ] Backend Go tests pass: `go test -v ./...` in `substreamedu-dictionary-service-go`.
- [ ] Backend Go service compiles: `go build -v ./cmd/...`.
- [ ] Frontend TypeScript type-checks cleanly: `npx tsc --noEmit`.
- [ ] Frontend Jest test suite passes: `npm test -- --watchAll=false`.
- [ ] Production build succeeds: `npm run build`.
- [ ] Active practice tabs toggle smoothly without layout shift.
- [ ] Finishing flashcards session smoothly navigates into active practice with session words.
