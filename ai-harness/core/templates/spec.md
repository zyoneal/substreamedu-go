# <TICKET>: <Title>

- **Status**: Draft | Approved | In progress | Done | Abandoned
- **Type**: Ship
- **Owner**: <human owner>
- **Contracts touched**: none | `docs/contracts/<file>` (backward compatible: yes/no)
- **Related ADRs**: none | `docs/adr/NNNN-...`

## 1. Problem

What is wrong or missing, for whom, and how we know (ticket, incident, metric). 3–8 lines.

## 2. Scope

**In scope**
- ...

**Out of scope**
- ...

## 3. Design

### Options considered
| Option | How it works | Pros | Cons |
|---|---|---|---|
| A | | | |
| B | | | |

**Chosen:** A, because ...

### Details
- Seams / modules touched and their interfaces after the change.
- Data model and migration (expand → migrate → contract), rollback plan.
- Contract changes (request/response/event examples).
- Failure modes: timeouts, retries, idempotency, fallback, what the caller sees.
- Load impact (queries per request, payload sizes, rate limits) against `docs/ai/load.md`.

## 4. Allowed files

Change boundary checked by `.harness/scripts/check-spec-scope.sh`. One glob per line, in backticks; `*` matches across directories.

- `docs/specs/<TICKET>-*.md`
- `src/main/java/com/example/orders/application/*`
- `src/test/java/com/example/orders/*`

## 5. Test plan

| Behaviour | Test level | Test name |
|---|---|---|
| | unit / slice / integration (Testcontainers) | |

## 6. Verification checklist

- [ ] `.harness/verify.sh` green
- [ ] New/changed behaviour covered at the public seam
- [ ] Contract diff reviewed (if contracts touched)
- [ ] Migration tested forward on a copy of the previous schema

## Follow-ups

Problems noticed but out of scope.
