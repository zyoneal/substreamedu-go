# Feature Spec 18: Algorithmic Practice Exercise Generator Polish

## 1. Context & Background
In the active vocabulary practice feature (`/practice/generate-exercises`), when the LLM service times out or is bypassed, `AIService.generateAlgorithmicExercises` serves as the high-availability fallback engine.
Audit of generated exercise batches revealed 3 critical flaws that degrade user experience:
1. **Zero Distractor Randomization (Monotonous Options)**: Candidate distractors (`sameCountOthers`, `diffCountOthers`) were iterated in original list order without shuffling. Consequently, every single-word exercise repeatedly received the same 3 words (e.g. `["dyke", "fearlessness", "grieving"]`), allowing users to guess answers through process of elimination.
2. **Substring In-Context Word Clipping (`______ed`, `______d`)**: When a target word like `"demolish"` or `"blindside"` appeared in past-tense or inflected form in the sentence context (`"demolished"`, `"blindsided"`), `strings.Index` replaced only the prefix substring, leaving trailing suffixes in the prompt (e.g. `"was being ______ed"` or `"And then ______d us"`).
3. **Duplicate Accepted Answers**: `AcceptedAnswers: []string{target, strings.ToLower(target)}` duplicated the target string when `target` was already lowercase (e.g. `["give 'em hell", "give 'em hell"]`).

---

## 2. Requirements & Deep Module Seams

### 2.1 Whole-Word Token Boundary Matching & Inflection In-Context
- Implement `extractTargetWordGap(contextText, target string) (before, matchedToken, after string, found bool)`:
  - Match `target` case-insensitively at word boundaries (`idx == 0 || !isWordChar(ctxText[idx-1])`).
  - If the token in context contains word character suffixes (e.g. `demolished`, `blindsided`, `grieving`), expand the token to encompass the full word token until punctuation or whitespace.
  - Return `before = ctxText[:idx]`, `matchedToken = ctxText[idx:tokenEnd]`, `after = ctxText[tokenEnd:]`.
  - Format `prompt = before + "______" + after`.

### 2.2 Randomized Distractor Selection
- For each exercise:
  - Filter out words identical or case-insensitively equal to `target`.
  - Partition candidate distractors into `sameTypePool` (multi-word vs single-word) and `otherTypePool`.
  - Shuffle both pools and fallback options using pseudo-random shuffling so that every exercise receives a unique, varied set of distractors.
  - Assemble 4 unique options (1 target + 3 unique distractors), shuffled so the target word's position is randomized.

### 2.3 Deduplicated Accepted Answers
- Construct `accepted_answers` containing:
  - `target`
  - `strings.ToLower(target)` (if distinct)
  - `matchedToken` (if distinct from target)
  - `strings.ToLower(matchedToken)` (if distinct)
- Eliminate all duplicate strings while preserving stable order.

---

## 3. Implementation Rules

### File Boundaries
- `context/feature_specs/18_active_practice_exercise_generator_polish.md` (new)
- `context/progress_tracker.md` (modify)
- `substreamedu-dictionary-service-go/internal/service/practice_exercise_generator_test.go` (new)
- `substreamedu-dictionary-service-go/internal/service/ai_service.go` (modify)

---

## 4. Verification Checklist
- [x] TDD: `TestAlgorithmicExercises_DistractorsAreRandomized` verifies different exercises get varied distractor sets instead of repeating the same 3 words.
- [x] TDD: `TestAlgorithmicExercises_WholeWordReplacedNoTrailingSuffix` verifies `"demolish"` in `"was being demolished"` replaces the full token, avoiding `"______ed"`.
- [x] TDD: `TestAlgorithmicExercises_AcceptedAnswersDeduplicated` verifies no duplicate strings in `accepted_answers`.
- [x] All Go tests in `substreamedu-dictionary-service-go` pass.
- [x] All frontend tests pass.
