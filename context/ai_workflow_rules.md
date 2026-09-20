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

