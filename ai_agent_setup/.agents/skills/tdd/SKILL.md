---
name: tdd
description: Seam-based Test-Driven Development (TDD) for Go and TypeScript. Use when implementing new features, fixing regressions test-first, or establishing robust behavioral regression suites.
---

# Seam-Based Test-Driven Development (TDD)

TDD is the **Red → Green → Refactor** loop executed at clean architectural seams.

---

## 1. What a Good Test Is
- **Tests verify behavior through public interfaces, not internal mechanics**:
  - Tests should describe *what* capability the system delivers, not *how* private functions are structured.
  - When internal implementations are refactored, good tests pass without modification.
- **Good tests read like a specification**:
  - `TestLessonRepository_FindByShareToken_ReturnsFullLesson`
  - `it('strips ASS formatting tags and keeps text intact')`

---

## 2. Seams: Where Tests Go
A **seam** is the public boundary where behavior is exercised and observed without peeking inside:
- In Go: exported package functions and interface boundaries (`lesson_repository.go`, `ai_service.go`).
- In React/TypeScript: component behavior from user perspective (user clicks, DOM state changes) or pure domain utilities (`grammarDetector.ts`, `subtitleSentenceStitcher.ts`).

**Anti-Pattern to Avoid**:
- Never test private internal functions directly.
- Never write tests coupled to specific line execution orders or intermediate variables.

---

## 3. When and What to Mock
Mock only at **system boundaries** (external unowned dependencies):
- External HTTP endpoints (OpenAI/Anthropic API, YouTube API, external dictionary API).
- Clock/Time (`time.Now()` or `Date.now()` when asserting on streaks or expiry).
- Hardware or browser-only APIs (Web Speech API, AudioContext).

**Do NOT mock**:
- Your own internal helper classes, structs, or pure utility functions.
- Every intermediate call in a pipeline.
