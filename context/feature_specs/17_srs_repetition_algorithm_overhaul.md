# Feature Spec 17: SRS Repetition Algorithm Overhaul & Session Decoupling

## 1. Context & Background
Users reported that for multiple consecutive days, the learning interface and dashboard display strictly 50 new cards (`dueToday = 0`, `sessionNewCards = 50`) with zero repetitions/reviews.
Root cause analysis revealed 5 intersecting flaws:
1. **Greedy Deficit Coupling in Queue Dispatch**: When `len(reviewBatch) == 0`, `targetNew` greedily consumes `50 - 0 = 50` new cards, completely bypassing any daily new cards limit.
2. **Toxic <3s Latency Classifies New Graduation as EASY (16-Day Interval)**: In `inferGrade`, answers under 3000ms become `EASY`, assigning $W_3 = 15.69$ stability and scheduling the first review **16 days away**. Even `GOOD` schedules 3 days away. During these gap days, `dueToday` is 0.
3. **Intra-Session Learning Step Exhaustion Trap**: `LearningStepsMinutes = []int{1, 10}` requires 2 passes in the same session. In a 50-card session, all 50 cards repeat, forcing a 100-review session. Exiting after 50 leaves cards trapped in `status = 'learning'`.
4. **Same-Day Lockout**: Cards reviewed today are blocked by `last_reviewed < todayStart`, causing second visits on the same day to always serve 50 new cards.
5. **Silent Database Error Masking**: `learning_service.go` discards errors from `FindDueWordsSorted` and falls back to empty reviews + 50 new cards.

---

## 2. Requirements & Deep Module Seams

### 2.1 FSRS Engine & Grade Inference Refactor (`fsrs/engine.go`)
1. **Initial Graduation Interval**:
   - When a card graduates from `learning` to `review`:
     - Base initial stability on first graduation must be calibrated so that `GOOD` schedules for **tomorrow (1 day)**.
     - Speed heuristic `< 3000ms` must **NOT** jump to $W_3$ (16 days) on new card graduation! Initial graduation interval is capped at 1 day for `GOOD`/`HARD` and at most 2 days for `EASY`.
2. **Learning Steps**:
   - New cards with `rating == Remember`: Graduate on the first successful pass with interval = 1 day, setting `RepeatInSession = false`.
   - New or learning cards with `rating == Forgot`: Enter `status = 'learning'`, `LearningStep = 0`, `RepeatInSession = true`.

### 2.2 Queue Decoupling in `LearningService` (`learning_service.go`)
1. **Dedicated Daily New Cards Cap**:
   - `DefaultMaxNewWords = 15` (30 cards: 15 recognition + 15 production).
   - `SessionLimit = 50`.
   - Formula:
     $$\text{availableSlots} = \max(0, \text{SessionLimit} - \text{len}(\text{reviewBatch}))$$
     $$\text{targetNew} = \min(\text{availableSlots}, \text{DefaultMaxNewWords} \times 2)$$
2. **Explicit Error Propagation**:
   - Do NOT swallow `reviewErr`! Propagate error to caller.

### 2.3 Database Data Healing Migration (`000006_heal_srs_stuck_learning_cards.up.sql`)
1. Unstick legacy cards trapped in `status = 'learning'` where `last_reviewed < CURRENT_DATE`. Set them to `status = 'review'`, `next_repetition_date = CURRENT_DATE`, `interval = 1`.
2. Reschedule cards that were over-scheduled to $\ge 14$ days on their very first review step.

---

## 3. Implementation Rules

### File Boundaries
- `substreamedu-dictionary-service-go/internal/service/fsrs/engine.go` (modify)
- `substreamedu-dictionary-service-go/internal/service/fsrs/engine_test.go` (modify)
- `substreamedu-dictionary-service-go/internal/service/fsrs/engine_deterministic_test.go` (modify)
- `substreamedu-dictionary-service-go/internal/service/fsrs/engine_parameterized_test.go` (modify)
- `substreamedu-dictionary-service-go/internal/service/learning_service.go` (modify)
- `substreamedu-dictionary-service-go/internal/service/vocabulary_service.go` (modify)
- `substreamedu-dictionary-service-go/internal/repository/dictionary_repository.go` (modify)
- `substreamedu-dictionary-service-go/internal/repository/migrations/000006_heal_srs_stuck_learning_cards.up.sql` (new)
- `substreamedu-dictionary-service-go/internal/repository/migrations/000006_heal_srs_stuck_learning_cards.down.sql` (new)
- `context/progress_tracker.md` (modify)

---

## 4. Verification Checklist
- [x] TDD: `TestNewCard_Remember_GraduatesToNextDay` verifies 1-day initial interval.
- [x] TDD: `TestNewCard_FastAnswer_DoesNotScheduleSixteenDays` verifies `< 3000ms` does not yield 16 days on graduation.
- [x] TDD: `TestGetDailyCards_DecoupledNewCardsQuota` verifies maximum 30 new cards (15 words) when 0 reviews are due.
- [x] All Go tests in `substreamedu-dictionary-service-go` pass (`go test ./...`).
- [x] All frontend tests pass (`npm test`).
