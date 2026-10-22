---
name: diagnosing-bugs
description: Systematic diagnosis for hard bugs, regressions, flaky tests and performance problems. Build a deterministic failing feedback loop first, then isolate the root cause, then fix. Use whenever something is broken, slow, flaky or throwing errors and the cause is not obvious.
argument-hint: "<symptom>"
---

# Diagnosing bugs: feedback loop first

If you have a fast, deterministic pass/fail signal for the bug, the fix is most of the way done. Without one, reading code produces guesses. Spend most of your effort on step 1.

## Redact first

Replace tokens, passwords, cookies and `Authorization` headers with `<REDACTED>` in anything you print, paste or commit. Read secrets from environment variables, never from literals.

## 1. Build the loop

Pick the first option that works:

1. **Failing test at a seam.** Java: `./gradlew test --tests 'com.example.FooTest.reproduces_bug'`. Python: `uv run pytest tests/test_foo.py::test_reproduces_bug -x`.
2. **Integration test with real dependencies.** Testcontainers (Postgres, Kafka, Redis) when the bug depends on SQL, transactions, serialization or broker behaviour. Do not use H2 or in-memory fakes for these.
3. **HTTP script.** A single `curl` against the locally running service that shows the wrong status or payload.
4. **Replay.** Capture the exact input (request body, Kafka message, file) and feed it through the entry point in isolation.
5. **Differential.** Run the same input against the last known-good commit and the current one (`git bisect run <loop command>`).

Make the loop:
- **fast**: a few seconds, not a full build;
- **sharp**: it asserts the exact symptom (`expected 409, got 500`);
- **deterministic**: fixed clock (`Clock` / `time-machine`), seeded randomness, no real external network.

**Flaky or concurrent bugs.** Repeat until the failure rate is high. Java: `@RepeatedTest(200)` or a loop with a `CountDownLatch`. Python: `pytest --count=200` (pytest-repeat). Narrow the timing window. One green run proves nothing.

**Performance bugs.** The loop is a measurement: query count (Hibernate statistics or `assertSelectCount`), p95 latency of a focused benchmark (JMH / pytest-benchmark), or allocations. Record the baseline number.

## 2. Isolate

1. Write down one hypothesis.
2. Add the minimum logging or assertions needed to confirm or refute it, using the loop.
3. Change one variable at a time. Several speculative edits at once destroy the signal.
4. Repeat until you can explain the root cause in one or two sentences, including why it was not caught earlier.

## 3. Fix and keep the guard

1. Fix at the layer that owns the invariant.
2. The loop turns from red to green. Paste both outputs.
3. Run `.harness/verify.sh`.
4. The reproducing test stays in the suite. Remove temporary logging.

## Report

Root cause, the evidence (`path:line`), the fix, the guarding test, and anything similar elsewhere in the code that might share the cause (as a follow-up, not fixed here).
