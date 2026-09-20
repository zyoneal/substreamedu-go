---
name: diagnosing-bugs
description: Systematic diagnosis loop for hard bugs, performance regressions, and flaky failures. Use whenever diagnosing or debugging an issue, or when a test/endpoint/UI is broken, slow, or throwing errors.
---

# Diagnosing Bugs: Feedback Loop First

A rigorous discipline for hard bugs and regressions. Root causes are found through deterministic feedback loops, never through guesswork or premature code patching.

When exploring the codebase, consult `/context/architecture.md`, `/context/code_standards.md`, and recent ADRs in `/context/progress_tracker.md` to understand system invariants and historical design decisions.

---

## Redact Secrets First
When running diagnostic commands, logging outputs, or capturing payloads:
- **Redact every credential or token**: replace with `<REDACTED>`.
- Use environment variables so secrets remain in the runtime environment rather than leaking into conversation logs or git tracking.
- Redact auth headers (`Authorization: Bearer ...`, `Cookie`) from captured traces.

---

## Phase 1: Build a Reproducible Feedback Loop
> **This is the core of the skill.** Everything else is mechanical. If you have a tight, deterministic pass/fail signal for the bug, fixing it is 90% done. If you don't have one, staring at code will only produce fragile hacks.

Spend disproportionate effort here. Refuse to write "fixes" until you can reproduce the failure with a single command.

### Preferred Loop Construction Order:
1. **Failing Unit / Integration Test**:
   - In Go: `go test -v -run TestBugName ./...`
   - In Frontend: `npm test -- -t "should reproduce specific bug"`
2. **Curl / HTTP Script**:
   - Direct HTTP call against the running microservice or gateway demonstrating the error status, payload corruption, or timeout.
3. **CLI / Direct Execution**:
   - Isolated script or Go benchmark reproducing memory leaks, race conditions, or CPU spikes.
4. **Differential Loop**:
   - Compare output between expected known-good state vs current broken state on identical inputs.
5. **Trace Replay**:
   - Capture the exact input payload or subtitle SRT/SSA cue that crashed the parser; run it in isolation through the function.

### Tighten the Loop:
- **Fast**: Aim for <2 seconds execution. A 40-second slow test loop hinders debugging; a 1-second test gives superhuman speed.
- **Sharp**: Assert on the exact failure symptom (e.g. `expected status 200, got 500` or `expected subtitle to strip {\i1}, got raw tag`), not merely "didn't crash".
- **Deterministic**: Eliminate external network stalls, pin timestamps, seed randomizers, and mock unpredictable third-party APIs.

### Non-Deterministic / Flaky Bugs:
If the bug occurs intermittently (race condition, goroutine leak, UI timing issue):
- Do not stop at a single non-reproducible run.
- Loop the trigger 50–100 times (`go test -count=50 -race`), stress concurrent goroutines, or narrow timing windows until the failure rate is >50%.

---

## Phase 2: Isolate the Root Cause
Once you have a loop that reliably turns **RED**:
1. Formulate a single testable hypothesis.
2. Trace data flow from the entry seam to the failure point using minimal targeted logging or assertions.
3. Verify or refute the hypothesis using the loop.
4. Do NOT make multiple speculative changes simultaneously.

---

## Phase 3: Implement & Verify Green
1. Apply the minimal surgical fix at the correct architectural seam.
2. Run your feedback loop: verify it transitions from **RED to GREEN**.
3. Run the full verification suite (all service unit tests, linting, production build) to guarantee zero regressions.
4. Keep the failing test permanently in the test suite as a regression guard.
