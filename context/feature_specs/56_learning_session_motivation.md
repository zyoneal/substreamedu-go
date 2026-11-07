# Spec 56: Learning Session Motivation & Workload Reduction (Phase 1 & Phase 2)

- **Status**: Completed (Approved by user: "го" and "доделай топ подход", 2026-10-27)
- **Owner**: Frontend & Dictionary Service (Go)
- **Related ADR**: ADR-129, ADR-130
- **Depends On**: Spec 47 (`47_pixzen_learning_page_redesign.md`), Spec 17 (`17_srs_repetition_algorithm_overhaul.md`)

---

## 1. Problem Statement

User report: *"I have no desire to study words on /learning, even with streaks."*
Product framing: the daily session has high perceived effort and low reward, combined with structural workload doubling from dual recognition+production card generation on every saved word.

### Evidence (verified in code)

| # | Finding | Location |
|---|---------|----------|
| E1 | Every saved word creates 2 cards (recognition + production). 25 words = 50 cards. | `substreamedu-dictionary-service-go/internal/service/vocabulary_service.go:57-109` |
| E2 | Session cap is 50 cards; up to 15 new words = 30 new cards on top of due reviews. | `learning_service.go:41-58` |
| E3 | Progress counter resets each wave (`waveIndex`), so the end is never visible. "Again" and FSRS learning steps re-queue cards. | `Flashcards.tsx:368-375, 718` |
| E4 | Extra "Start Learning" click before the first card. | `Flashcards.tsx:626-643` |
| E5 | No feedback on a correct answer except `navigator.vibrate` (no-op on desktop). | `Flashcards.tsx:322-324` |
| E6 | Card transition uses `mode="wait"` + 3D spring, so each swipe waits for the exit animation. | `Flashcards.tsx:574-623` |
| E7 | LLM story step sits between the last card and the finish screen, with no skip. | `Flashcards.tsx:758-889` |
| E8 | Finish-screen copy is hardcoded English, not localized. | `Flashcards.tsx:903, 914` |
| E9 | Production (recall the word from its meaning) is shown before the word is recognized, turning new vocabulary learning into an exam. | `Flashcard.tsx` (`cardType === 1`) |

### Hypothesis

By coupling client-side session shaping (monotonic progress bar, 20-card checkpoint, instant transition, micro-rewards) with server-side sibling-card gating (introducing production cards only after recognition has graduated to `review`), we reduce both perceived effort and initial session cognitive overload while preserving long-term FSRS retention.

---

## 2. Requirements

### Phase 1: Client-Side Session Shaping (Frontend)
1. **R1: Remove start gate.** No "Start Learning" overlay. TTS autoplay starts after first user gesture (pointerdown/keydown).
2. **R2: Monotonic progress.** Replace `waveIndex / waveSize` with progress bar: `cards rated Good at least once / total cards in session`. Never decreases.
3. **R3: Checkpoint at 20 cards.** After 20 ratings (`SESSION_CHECKPOINT = 20`), show natural stopping point ("Finish for today" / "Keep going"). Unrated cards remain due.
4. **R4: Reward feedback.** On Good: short spark animation on progress bar (respects `prefers-reduced-motion`). At 50% progress, show halfway milestone.
5. **R5: Faster transitions.** Remove `mode="wait"` and 3D rotations; short 150ms fade+slide.
6. **R6: Skippable story.** Allow immediate skip to finished state.
7. **R7: Localize finish copy.** All finish and checkpoint strings extracted to `intl` message keys.

### Phase 2: Sibling-Card Gating (Go Microservice)
8. **R8: Sibling gate.** A new production card (`card_type = 1`, `status = 'new'`) is eligible in daily session only if its recognition sibling (`card_type = 0`) has graduated to `status = 'review'`. Orphan/standalone production cards remain eligible.
9. **R9: Quota split.** Total new cards capped by `ComputeTargetNewCards`. Recognition cards take at most `DefaultMaxNewWords` (15); unlocked production cards fill remaining available budget.
10. **R10: Reversible Flag.** `SRS_GATE_PRODUCTION_CARDS=false` restores legacy ungated selection immediately without redeploying data.
11. **R11: Graceful fallback.** If gated query fails, fallback to legacy `FindRandomNewWords` without failing user session.

---

## 3. Allowed files (Strict File Boundaries)

Touch **only** the following files:
- `context/feature_specs/56_learning_session_motivation.md`
- `context/progress_tracker.md`
- `substreamedu-frontend/src/components/LearningPage/Flashcards.tsx`
- `substreamedu-frontend/src/components/LearningPage/Flashcards.module.css`
- `substreamedu-frontend/src/components/LearningPage/Flashcards.test.tsx`
- `substreamedu-frontend/src/locales/*.json`
- `substreamedu-dictionary-service-go/internal/service/learning_service.go`
- `substreamedu-dictionary-service-go/internal/service/new_card_selection_test.go`
- `substreamedu-dictionary-service-go/internal/repository/dictionary_repository.go`
- `substreamedu-dictionary-service-go/internal/repository/new_card_queries_test.go`

---

## 4. Verification Checklist

1. `npm test -- src/components/LearningPage --watchAll=false` passes cleanly (18/18 tests).
2. Frontend lint & tsc clean.
3. `go test ./...` in dictionary-service passes cleanly.
4. `./verify.sh` passes end-to-end.
