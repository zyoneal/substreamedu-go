# Design It Twice

When architecting a new feature, complex data structure, API endpoint, or component hierarchy: **your first idea is rarely your best idea**.

---

## The Protocol

### 1. Frame the Problem & Constraints
Before writing code or locking into a design:
- Define the core capability needed.
- Identify invariants and constraints (performance, concurrency, backward compatibility, mobile vs desktop).
- Clarify what sits behind the seam and what callers must know.

### 2. Formulate 2-3 Radically Different Designs
Develop 2 or 3 distinct alternative designs. The alternatives should differ fundamentally, for example:
- **Design A**: Push logic into the database / storage layer vs push logic into a dedicated in-memory domain service.
- **Design B**: Event-driven / reactive pub-sub vs synchronous request-reply with idempotent retries.
- **Design C**: Compound declarative component pattern vs monolithic parameterized component.

### 3. Evaluate Tradeoffs & Select
Compare the designs against:
- **Depth**: Which design offers the simplest interface for the most leverage?
- **Locality**: Where do bugs and invariants concentrate?
- **Testability**: Can this be tested easily through its public interface without fragile mocks?
- **Cognitive Load**: Which design is easiest for future developers or AI agents to reason about without context drift?
