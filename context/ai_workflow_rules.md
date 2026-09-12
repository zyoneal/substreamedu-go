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
