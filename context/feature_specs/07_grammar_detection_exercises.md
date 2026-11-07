# Feature Spec 07: Grammar Detection & Exercises (Spec 05D)

## 1. Goal
Provide an interactive **Grammar Detection & Exercises** system in the video player and learning ecosystem. Subtitles contain rich, authentic grammar patterns (Conditionals, Passive Voice, Modal Perfects, Inversion, Causatives), but learners currently only learn vocabulary from them.

This feature introduces:
1. **Instant Client-Side Rule Engine**: Fast, zero-latency detection of 10+ core B1–C1 English grammar structures across all video subtitles without saturating the LLM.
2. **Current Subtitle Grammar Spotlight Badge**: A subtle badge on the active subtitle line indicating when an authentic grammar pattern occurs.
3. **Grammar Spotlight Modal**: Slide-in card with rule formula, quote breakdown, contextual explanation, and an interactive 1-question mini-quiz on the spot.
4. **Video Grammar Index ("Grammar in this Video")**: Navigable index of all grammar points in the video grouped by structure, with jump-to-timestamp links.
5. **Backend AI Grammar Deep-Dive (`/api/dictionary/grammar/analyze`)**: AI endpoint for analyzing complex sentences and generating custom grammar explanations and exercises.

---

## 2. Design & Architectural Decisions

1. **Hybrid Architecture (Zero Video Stutter)**:
   - A video can have 300–1500 subtitle lines. Calling an LLM for each line is cost-prohibitive and causes latency.
   - We implement a lightweight client-side pattern engine (`grammarDetector.ts`) that parses loaded subtitles in `< 5ms`.
   - The backend provides `POST /api/dictionary/grammar/analyze` for on-demand deep linguistic analysis and dynamic exercise generation.

2. **Subtle, Non-Intrusive Video UX**:
   - The badge appears discretely above the active subtitle line without blocking subtitles or video controls.
   - Clicking pauses video playback and opens the Grammar Spotlight.
   - Resuming video or pressing Escape closes the spotlight.

3. **Zero Database Schema Changes**:
   - Analyzed on-the-fly from active subtitle tracks. No migrations or new database tables required.

---

## 3. Implementation Rules

### What to Touch:
- `substreamedu-dictionary-service-go/internal/dto/dto.go`: Add grammar analysis request and response DTOs.
- `substreamedu-dictionary-service-go/internal/service/ai_service.go`: Implement `AnalyzeGrammar` with LLM prompt and rule fallback.
- `substreamedu-dictionary-service-go/internal/handler/dictionary_handler.go`: Add `AnalyzeGrammar` handler with 15-second deadline.
- `substreamedu-dictionary-service-go/internal/router/router.go`: Register `/api/dictionary/grammar/analyze`.
- `substreamedu-frontend/src/utils/grammarDetector.ts` (NEW): Client-side grammar detection engine (11+ structures).
- `substreamedu-frontend/src/services/SubtitleService.ts` / `DictionaryService.ts`: Add `analyzeGrammar` API method.
- `substreamedu-frontend/src/components/VideoPage/components/GrammarSpotlightModal.tsx` (NEW): Interactive grammar card with mini-quiz.
- `substreamedu-frontend/src/components/VideoPage/components/GrammarSpotlightModal.module.css` (NEW): Styles following Cinematic Espresso tokens.
- `substreamedu-frontend/src/components/VideoPage/components/VideoGrammarIndexModal.tsx` (NEW): Full video grammar index with timestamps.
- `substreamedu-frontend/src/components/VideoPage/components/VideoGrammarIndexModal.module.css` (NEW): Styles for index modal.
- `substreamedu-frontend/src/components/VideoPage/VideoPlayer.tsx`: Integrate grammar badge on active subtitle and button in controls bar.
- `substreamedu-frontend/src/components/VideoPage/css/VideoPlayerPopover.module.css`: Add styles for subtitle grammar badge.

### What NOT to Touch:
- Do NOT alter database migrations.
- Do NOT mutate subtitle parsing or timing logic.
- Do NOT alter video playback state machines.

---

## 4. Verification Checklist
- [ ] Go tests pass: `go test -v ./...` in dictionary service.
- [ ] Go service builds cleanly.
- [ ] TypeScript compilation succeeds: `npx tsc --noEmit`.
- [ ] Jest tests pass: `npm test -- --watchAll=false`.
- [ ] Production build succeeds: `npm run build`.
- [ ] Subtitle lines with grammar show badge.
- [ ] Clicking badge opens Grammar Spotlight with formula, explanation, and mini-quiz.
- [ ] Video Grammar Index opens with timestamp links that jump to video cues.
