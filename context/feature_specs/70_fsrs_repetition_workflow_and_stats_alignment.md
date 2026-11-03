# Feature Spec 70: FSRS Spaced Repetition Workflow, Recall Latency & Dashboard Stats Alignment

## 1. Objective & Context
Audit and fix the end-to-end Spaced Repetition System (FSRS) workflow across `substreamedu-dictionary-service-go` and `substreamedu-frontend` so that newly learned words reinforce deterministically on the next calendar day, recall latency is measured before card reveal rather than after, Production cards unlock on the next day after Recognition graduation, and Dashboard telemetry (`CARDS TODAY`) matches the actual `/learning` session queue.

Key root causes identified during architectural audit:
1. **Inverted Recall Latency Measurement (`useFlashcardsSession.ts`)**:
   - `answerShownTime` was captured when the user clicked `Tap to reveal` (`revealNext`), and `responseTimeMs` was computed as `Date.now() - answerShownTime` (time spent reading the back of the card after flipping, rather than recall latency before flipping).
   - Because users click `Good` within `< 1s` of confirming their answer on the back, `responseTimeMs` was `< 3000ms`, falsely triggering `EASY` (`grade = 4`) on nearly every review.
2. **First-Graduation Day-2 Skip & Intra-Session Failure Bonus (`fsrs/engine.go`)**:
   - On `RepetitionLevel == 0`, `EASY` scheduled newly learned cards 2 days ahead (`interval = 2`), leaving learners with `0 cards today` on Day 2 after learning a word on Day 1.
   - Cards that failed earlier in the same session (`HardCount > 0`) could still graduate with `EASY` if the subsequent intra-session retry was fast.
   - `calculateNewStability` reused post-lapse weights `W11`/`W12` for `HARD`/`EASY` multipliers instead of dedicated FSRS-4.5 weights `W15` (`0.29`) and `W16` (`2.61`).
3. **Production Gate Discrepancy & Same-Day Unlock (`dictionary_repository.go`, `dictionary_stats_repository.go`)**:
   - `GetDictionaryStats` counted `status = 'new'` without applying the Production Gate (`SRS_GATE_PRODUCTION_CARDS`), causing `/dashboard` to display `2 CARDS TODAY` for 1 new word while `/learning` (`GetDailyCards`) served only `1` card (Recognition).
   - `findUnlockedNewProductionCardsSQL` checked only `s.status <> 'review'`, unlocking the Production card (`card_type = 1`) in the exact same day/minute that its Recognition sibling graduated to `'review'`, instead of waiting until the next day (`s.last_reviewed < CURRENT_DATE`).
4. **Timezone Drift in `ReviewCard` (`learning_service.go`, `dictionary_handler.go`)**:
   - `GetDailyCards` and `GetDictionaryStats` used the user's `X-Timezone` location (`loc`), while `ReviewCard` used `time.Now().UTC()`, causing reviews between `00:00` and `03:00` local time to stamp `last_reviewed` and `next_repetition_date` with the previous UTC calendar date.
5. **Dashboard Zero-Cards State (`dashboardUtils.ts`)**:
   - `isAllCaughtUp` checked `reviewedToday && dueCount === 0`, which both hid newly added cards when `reviewedToday` was `true` (`newCardsCount > 0`) and showed a dead-end `0 CARDS TODAY / START REVIEW ->` state when `sessionCardsCount === 0` and `reviewedToday` was `false`.

## 2. Design Alternatives (Design It Twice)
| Option | Description | Verdict |
| :--- | :--- | :--- |
| A | Only change `interval = 1` for `EASY` in `fsrs/engine.go` | Leaves the broken post-reveal timer in `useFlashcardsSession.ts`, the Dashboard vs. `/learning` card count mismatch, same-day Production card unlocking, and UTC timezone drift in `ReviewCard` unresolved. Rejected. |
| B | Holistic seam-aligned fix across FSRS engine, repository stats/selection queries, timezone-aware `ReviewCard`, pre-reveal recall latency timer, and Dashboard `isAllCaughtUp` derivation | Eliminates all 6 root causes while preserving 100% backward compatibility with existing API contracts and DB schema. **Chosen.** |

## 3. Implementation Scope
## Allowed files
- `context/feature_specs/70_fsrs_repetition_workflow_and_stats_alignment.md`
- `context/progress_tracker.md`
- `.autopilot/PROGRESS.md`
- `substreamedu-dictionary-service-go/internal/service/**`
- `substreamedu-dictionary-service-go/internal/repository/**`
- `substreamedu-dictionary-service-go/internal/handler/**`
- `substreamedu-frontend/src/components/LearningPage/**`
- `substreamedu-frontend/src/components/DashboardPage/**`

## 4. Verification Checklist
- [x] `fsrs/engine.go` schedules all first-time graduations (`RepetitionLevel == 0`) for `interval = 1` day (tomorrow), caps grade at `GOOD` when `HardCount > 0` during graduation, and uses dedicated `W15`/`W16` stability multipliers.
- [x] `ReviewCard` supports user timezone location (`loc *time.Location`) so `LastReviewed` and `NextRepetitionDate` align with the user's local calendar date.
- [x] `findUnlockedNewProductionCardsSQL` and `GetDictionaryStats` align on Production Gate rules and keep new Production cards locked on the day their Recognition sibling first graduates.
- [x] `useFlashcardsSession.ts` measures recall latency from `cardStartTime` to `answerShownTime` (before card flip).
- [x] `dashboardUtils.ts` derives `isAllCaughtUp` from `sessionCardsCount === 0` so new cards remain actionable after earlier same-day reviews and `0 cards today` never renders a dead-end `Start Review` state.
- [x] `./verify.sh` passes with 0 errors.
