---
name: fast-fix
description: Fast-path workflow for small fixes (≤100 changed lines, one concern, no contract/schema/dependency/tooling change). Reproduce with a failing test, apply the minimal fix, verify. Use for bug fixes, typos and small hotfixes that do not need a spec.
argument-hint: "<TICKET> <what is broken>"
---

# Fast-path fix

## 0. Gate

Confirm all of the following. If any is false, stop and use `spec-writer` instead.

- The expected diff is ≤ 100 changed lines (production + tests).
- One concern only.
- No change to API/event contracts, DB schema, dependencies, build or lint configuration.
- Only this repository is involved.

## 1. Red

1. Find the narrowest seam where the bug is observable (service method, controller endpoint, message listener).
2. Write a test that fails for the reason described in the ticket. Assert on the exact symptom (status code, value, exception type), not just "does not throw".
3. Run only that test and paste the failing output. If you cannot make it fail, switch to the `diagnosing-bugs` skill. Do not start editing code.

## 2. Green

1. Make the smallest change that makes the test pass, at the layer that owns the rule. Domain rules go in the domain, not in the controller.
2. Do not refactor neighbouring code, rename things or "improve while here". Note those under Follow-ups in the PR.

## 3. Verify

1. Run `.harness/verify.sh`. With no spec, the scope check accepts the change only if the diff is ≤ 100 lines.
2. If an unrelated pre-existing test fails, do not fix it. Report it.

## 4. PR

Description: `Fast-path`, ticket, root cause in one or two sentences, the red→green test name, the verify result, risk.
