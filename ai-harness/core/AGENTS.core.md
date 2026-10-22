## Operating model (ai-harness {{HARNESS_VERSION}})

These rules exist so that changes stay small, verified and reviewable. Where a rule is enforced by a script, the script is named — trust the script over your own judgement.

### 1. Classify the task before doing anything

| Type | When | What you deliver |
|---|---|---|
| **Scout** | Research, audit, "how does X work", bug investigation without a fix | Markdown report (`.harness/templates/scout-report.md`). No changes to source files. Skill: `scout`. |
| **Fast-path** | ≤ 100 changed lines, one concern, no change to contracts, DB schema, dependencies or tooling | Failing test → fix → green. No spec. Skill: `fast-fix`. |
| **Ship** | Everything else | Approved spec in `docs/specs/` → implementation. Skill: `spec-writer`. |

State the classification in your first reply and in the PR description. If a Fast-path task grows past 100 lines or touches a contract, stop and switch to Ship.

### 2. Specs (Ship tasks)

- One file per ticket: `docs/specs/<TICKET>-<slug>.md`, created from `.harness/templates/spec.md`. Branch name contains the ticket ID (`feature/PROJ-123-short-name`).
- The `## Allowed files` section is the change boundary. `.harness/scripts/check-spec-scope.sh` fails the build if the diff touches anything else. Need another file? Edit the spec first and mention it in the PR.
- For a non-trivial design, write 2–3 alternatives with trade-offs in the spec and pick one with a reason.
- Spec status lives in the spec header. There is no shared progress file. Decisions that outlive the ticket go to `docs/adr/NNNN-<slug>.md`.
- Unrelated problems you notice: list them under `## Follow-ups` in the spec or PR. Do not fix them in the same change.

### 3. Bugs: reproduce first

Write a test (or one-command script) that reproduces the bug and show it failing before changing production code. Then make the smallest fix that turns it green. The test stays as a regression guard. A fix without a red→green test is not done. Skill: `diagnosing-bugs`.

### 4. Definition of Done

1. `.harness/verify.sh` passes. It runs the build, tests, static analysis, the spec-scope check and the protected-files check.
2. New behaviour is covered by tests through the public seam (controller/handler, service API, message listener), not private methods.
3. The PR description has: classification, spec link, what changed and why, the `verify.sh` result, risks and rollout notes.

If `verify.sh` fails and you cannot fix it inside the task scope, stop and report the failure. Never mark a task done with a red check.

### 5. Never do these without an explicit instruction from a human in this session

- **Weaken checks to get green**: editing linter/static-analysis/build-plugin config, lowering coverage thresholds, adding suppressions (`@SuppressWarnings`, `// NOSONAR`, `# noqa`, `# type: ignore`, `@Disabled`, `pytest.mark.skip`) to silence a failure. Protected paths are listed in `.harness/protected-files` and checked by `check-protected-files.sh`.
- **Destructive git**: `reset --hard`, `clean -fd`, `checkout -- .`, `push --force`, rewriting shared history, `--no-verify`.
- **Collateral damage**: killing processes by name (`pkill`, `killall`), removing containers, volumes or databases you did not create.
- **Unspecified surface changes**: new dependencies, DB schema changes, public API or event contract changes outside an approved spec.
- **Other repositories**: never change another service. If the task needs one, use the `cross-service-change` skill and stop.
- **Secrets**: never print, log, commit or write to `.env*`, keystores or credential files. Redact tokens in anything you paste.

### 6. Microservice invariants

- **Contracts first.** API and event schemas live in `docs/contracts/` (OpenAPI / AsyncAPI / Avro / Protobuf). Changes must be backward compatible (add optional fields, never remove or rename). A breaking change needs a new version and its own spec.
- **Outbound calls** have a timeout, bounded retries with backoff (only for idempotent operations) and a circuit breaker. The spec states the fallback.
- **Messaging.** Consumers are idempotent (dedup by message key/ID). A DB write plus an event publish goes through a transactional outbox, never "save then send".
- **No in-memory state** that must be consistent across requests or instances. Use the database or a shared cache.
- **Observability.** Propagate trace context on every inbound and outbound hop. Use structured logs with IDs. Never log secrets, tokens or personal data.
- **Migrations** are forward-only and compatible with the previous app version (expand → migrate → contract) so rolling deploys work.
- **Domain integrity.** Business rules live in the domain layer. Controllers and handlers validate request shape only. Factory methods enforce creation invariants. Derived values are computed, not stored.

### 7. Code shape

Static analysis enforces most of this. Refactor rather than suppress:

- file ≤ 400 lines, method ≤ 60 lines, nesting ≤ 3, parameters ≤ 6, cyclomatic complexity ≤ 10;
- guard clauses instead of deep `if`/`else`; no dead code, no commented-out code;
- a method that reads several fields of another object belongs on that object (feature envy);
- a fixture built 3+ times in tests becomes a builder or factory.

### 8. Scout and review tasks

Scout and review tasks are read-only on source files. Every claim cites `path:line`. Security reviews are report-only: findings with severity, evidence and a proposed diff, but no edits (skill `security-audit`). Diff reviews report only bugs you can prove from the code (skill `review-diff`).

### 9. Stop and ask when

- requirements are still ambiguous after reading the ticket, spec and contracts;
- the only way forward breaks a rule in section 5;
- `verify.sh` fails for a reason outside the task scope (pre-existing failure): report it, do not silently fix it;
- the change needs more than one service.

### 10. Map

| What | Where |
|---|---|
| Service overview, architecture, load/SLA | `docs/ai/` |
| API / event contracts | `docs/contracts/` |
| Specs (one per ticket) | `docs/specs/` |
| Architecture decisions | `docs/adr/` |
| Templates | `.harness/templates/` |
| Verification (DoD) | `.harness/verify.sh` |
| Skills | `.agents/skills/`: `spec-writer`, `fast-fix`, `diagnosing-bugs`, `tdd`, `review-diff`, `security-audit`, `codebase-design`, `cross-service-change`, `scout` |
