# SubStreamEdu: AI Agent Workflow & Operating Rules

## 1. Core Operating Philosophy
All automated agents, assistants, and pair-programming AI systems working in this repository MUST operate under **Senior Engineer Spec-Driven Development**. The repository is designed to be completely resilient to AI context drift, hallucinated architectural shortcuts, and uncontrolled ripple effects.

---

## 2. Mandatory Rules for AI Agents

### Rule 1: Read-Before-Write Protocol
Before writing or altering ANY code in this repository, the agent MUST:
1. Read `/context/project_overview.md`
2. Read `/context/architecture.md`
3. Read `/context/code_standards.md`
4. Read `/context/ui_context.md`
5. Read `/context/progress_tracker.md`
6. Locate and read the specific active spec file in `/context/feature_specs/` (e.g., `01_system_audit_refactor.md`).

### Rule 2: Single-Spec Atomicity
- An agent must work on **exactly ONE feature spec / task unit at a time**.
- Multi-task bundling, batching unrelated refactorings, or jumping ahead to another spec is **strictly prohibited**.
- If an agent discovers a tangential bug or tech debt outside the current spec's scope, it MUST log the observation in `/context/progress_tracker.md` under `Session Notes` rather than fixing it ad-hoc.

### Rule 3: Zero Cross-Boundary Contamination
- Never touch files outside the defined implementation rules of the active spec.
- Never modify service boundaries or database schemas without a corresponding spec update and migration file.
- If working on `substreamedu-gateway-go`, do not touch `substreamedu-frontend` unless explicitly stated in the spec.

### Rule 4: Mandatory Verification Pipeline
Before declaring any task or spec closed, the agent MUST execute and verify all relevant checks:
1. **Go Services**:
   - `go test -v ./...` in the modified service directory.
   - `golangci-lint run` (or static analysis).
   - Ensure clean binary build: `go build -o /dev/null ./cmd/...`.
2. **Frontend Service**:
   - TypeScript compilation check: `npm run build` or `npx tsc --noEmit`.
   - Linter pass: `npm run lint`.
   - Unit tests: `npm test -- --watchAll=false`.
3. **Container Orchestration**:
   - Ensure `docker compose config` is syntactically valid when compose files are touched.

### Rule 5: Progress Tracker Update Protocol
Every agent invocation that modifies repository state MUST update `/context/progress_tracker.md`:
1. **At Task Start**:
   - Update `In Progress` with the exact spec and task unit being executed.
   - Update `Current Phase` if transitioning between lifecycle milestones.
2. **At Task Completion**:
   - Move the completed task to `Completed`.
   - Append any new architectural decisions to `Architectural Decisions Log`.
   - Summarize code changes and verification output in `Session Notes`.

---

## 3. Senior Engineering & Multi-Agent Guardrails

### Rule 6: Task Classification (Ship vs Scout)
Every development task belongs to one of two distinct categories:
1. **Ship Tasks**:
   - Aim to deliver production-grade code, migrations, or UI improvements.
   - Must follow the full verification pipeline (Rule 4) and update tracker upon completion.
2. **Scout Tasks**:
   - Dedicated to research, bug reproduction, architectural discovery, third-party library benchmarking, or security audits.
   - **Strictly read-only on project source files**: a Scout task must never mutate source code.
   - Output is delivered as a structured markdown report (e.g. in artifacts or `/docs/`) without unspec'd repository side-effects.

### Rule 7: Bug Diagnosis — Feedback Loop First
When investigating any bug, regression, or unexpected behavior:
1. **Never guess or patch code blindly**.
2. **Construct a 1-command reproducible feedback loop FIRST** (failing unit test, integration test, or curl script) that deterministically turns **RED**.
3. Only after the failure is reliably reproduced may the agent isolate variables and apply the surgical fix.
4. The loop must transition from **RED to GREEN** and remain permanently in the test suite as a regression guard.

### Rule 8: Deep Modules & Design It Twice
When designing new components, service boundaries, or API endpoints:
1. **Deep Modules**: Strive for maximum capability behind minimal, clean interfaces (John Ousterhout). Avoid shallow pass-through wrappers.
2. **Design It Twice**: For non-trivial architectural decisions, formulate 2–3 alternative designs at the spec stage, evaluate tradeoffs (locality, depth, testability), and select the most robust option before coding.

### Rule 9: Code Safety & Unlanded Work Protection
- **Never tear down unlanded work**: Uncommitted user edits or working tree changes must never be discarded.
- **Destructive Git commands are strictly forbidden**: Never run `git reset --hard`, `git checkout -- .`, `git clean -fd`, or `git push --force` without explicit, unambiguous user instruction.

---

## 4. Frontend & Code Quality Guardrails

### Rule 10: Frontend Humble Object Pattern
Component files must be thin wrappers that delegate to dedicated modules:
- **Pure logic** in dedicated hook files (`use*.ts`) or `.logic.ts`: validation, state computation, data mapping, request body construction. No side effects.
- **HTTP calls** in `*Service.ts` files: fetch/axios calls, response mapping, error handling.
- **Components** (`*.tsx`) call hooks + services, translate UI state, and render markup.
- **FORBIDDEN in component files**: business logic, validation regex, direct `fetch`/`axios` calls, request body construction, data transformation beyond trivial display formatting.

### Rule 11: Async Action Loading State
Every interactive control that triggers a network request (or any async operation) MUST reflect its in-flight state:
1. Show a **loading indicator** on the control while the request is pending.
2. **Disable the control** to prevent double-submit.
3. For form submissions, also **disable input fields** during the in-flight request.
4. Drive from a reactive `isSubmitting`/`isPending` state, set `true` before the call and reset in a `finally` block.
- If a button or control calls the backend and has NO loading state, **STOP and confirm with the user** whether one is needed before leaving it without. Loading state is the default expectation; exceptions (optimistic UI, fire-and-forget) are deliberate user choices, not silent omissions.

### Rule 12: Accessibility Baseline
Every component must ship with accessible markup. These are non-negotiable minimums:
- **Interactive controls are native elements**: A clickable/toggleable element is a `<button>`, `<a href>`, or `<input>` — never a `<div>`/`<span>` carrying a click handler.
- **Every form control has an accessible name**: via `<label htmlFor>`, wrapping `<label>`, or `aria-label`. A `placeholder` is a hint, not a name.
- **Keyboard equivalents**: hover behavior pairs with `focus`; click behavior lives on a focusable element.
- **Disclosure triggers**: expose `aria-expanded` bound to the open state (dropdowns, accordions, menus).
- **Decorative icons**: are `aria-hidden="true"`. An icon that IS the control's only content needs an `aria-label` on the control.
- **Modals**: use `role="dialog"` + `aria-modal="true"` on the card. Every dismissible modal closes on `Escape`. The Esc listener is on `window`, not on the overlay.

### Rule 13: File Size Hard Limit
After any file creation or refactoring, verify the file does not exceed its limit. If it does, split it further — no exceptions.

| File Type | Maximum Lines |
|---|---|
| Go source files (`.go`) | 300 |
| React components (`.tsx`) | 250 |
| TypeScript hooks/services (`.ts`) | 300 |
| CSS Modules (`.module.css`) | 200 |
| Test files (`.test.ts`, `.test.tsx`, `_test.go`) | 300 |

### Rule 14: Infrastructure Safety
- **NEVER kill processes by executable name** (e.g., `pkill node`, `killall go`). This kills ALL instances system-wide, including other sessions and user tools. To stop a specific service, target only the specific PID you started.
- **NEVER remove Docker containers you didn't start.** Multiple sessions or services may run in parallel. Use service-specific `docker compose down` only for this project's compose file.
- **No in-memory application state** across requests. The backend may run as multiple instances — use PostgreSQL or Redis for any state that must be consistent across requests. Never store session-critical data in Go global variables, hash maps, or static fields.

### Rule 15: Domain Integrity
- **All domain validation belongs in the domain layer** (model structs, domain functions, entity methods). Never validate domain business rules in HTTP handlers or service orchestrators — handlers validate request shape/format, domain validates business invariants.
- **Computed fields**: if a value is derivable from other fields (e.g., `IsLeech` from `Lapses` + `Stability`, `IsDue` from `NextReview` + current time), compute it as a method — don't persist it as a database column.
- **Factory functions**: prefer `NewCard()`, `NewUser()`, `NewLesson()` constructors with validation over raw struct literals in business logic. The constructor is the single place where creation invariants are enforced.

### Rule 16: UI Implementation Fidelity
Every interactive control shown in a design reference, mockup, or approved UI screenshot MUST be rendered in the component. A control present in the design but absent from the implementation is a fidelity gap, not an intentional scope cut. Omit a design element only on an explicit, recorded decision in `/context/progress_tracker.md` — never silently.

### Rule 17: Refactoring Scan Checklist
Before declaring any refactoring complete or finalizing a code refactoring task, the agent MUST execute the Refactoring Scan Checklist across all modified Go and TypeScript files:
- [ ] **File Size Hard Limits**: No modified file exceeds line count caps defined in Rule 13 (Go: 300, TSX: 250, TS: 300, CSS: 200, Tests: 300).
- [ ] **Function Length**: No function or method exceeds 60 lines.
- [ ] **Nesting Depth**: No control flow nesting exceeds 2 levels (`if`, `for`, `switch`). Guard clauses and early returns are mandatory.
- [ ] **Feature Envy**: No function accesses 2+ fields from the same external struct/object. Relocate the behavior directly to the owning struct or domain entity.
- [ ] **Repeated Construction**: No identical struct, mock, or DTO initialized 3+ times in tests; extract a shared test factory helper.
- [ ] **Repeated Expressions**: No complex expression evaluated 2+ times in the same scope; extract an explanatory named constant or local variable.
- [ ] **Zero Dead Code**: No unused private functions, orphaned variables, or commented-out code blocks left behind.
- [ ] **Sequential Cohesion**: No sequential independent operations packed into a single monolithic function block; split into distinct, descriptively named helpers.
- [ ] **Green Test Verification**: All existing and newly written unit/integration tests must pass cleanly.

### Rule 18: No Hardcoded Placeholder Data
Never copy mockup or wireframe placeholder values into production components, hooks, or service handlers:
- **Strictly Banned as Hardcoded Literals**: Mock user emails (`user@example.com`), dummy user names (`John Doe`), fake dates/timestamps, static prices (`$9.99`), mock lesson titles, dummy flashcard counters, or hardcoded exercise sentences directly in JSX rendering paths.
- **Permitted as Static Literals**: UI section titles, field labels, button callouts, static SVG icon paths, navigation URLs, ARIA labels, semantic CSS class tokens.
- **The Core Invariant**: For every string literal or data value in a component, ask: *"Would this have the exact same value for every single user, across all accounts, at every point in time?"* If NO, it MUST be dynamically loaded from the backend API, service layer, or state context.

### Rule 19: Structured Discovery Before Spec
Before authoring any new feature spec in `/context/feature_specs/`, the agent MUST perform a structured discovery protocol:
1. **Context Ingestion**: Read existing feature specs, `/context/project_overview.md`, `/context/architecture.md`, and `/context/expected_load.md` to prevent overlap and honor system capacity bounds.
2. **Constraint Verification**: Verify how the feature impacts load limits, database query plans, and external API quotas (e.g., LLM context size, rate limits).
3. **Structured Discovery & Scoping**: Clarify and verify:
   - Scope boundaries (what is explicitly IN vs OUT of scope).
   - Affected services and cross-service communication (REST, Kafka, Redis).
   - API contract changes (request/response schemas, error status envelopes).
   - Edge cases, error handling, circuit breakers, and degradation/fallback paths.
   - Database migrations and rollback strategy.
4. **Specification Freezing**: Record all architectural decisions, seams, and verification checklists in the spec file BEFORE writing any implementation code.


