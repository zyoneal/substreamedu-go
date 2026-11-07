---
name: codebase-design
description: Design deep modules and robust architectural seams. Use when creating new services, refactoring complex packages, designing domain boundaries, or simplifying noisy interfaces.
argument-hint: "<module or package name>"
---

# Codebase Design: Deep Modules & Clean Seams

Design **deep modules**: substantial, sophisticated capability hidden behind a small, simple interface, positioned at a natural seam, testable through that interface.

Reference: John Ousterhout (*A Philosophy of Software Design*), Michael Feathers (*Working Effectively with Legacy Code*).

---

## 1. Core Vocabulary

- **Module**: Anything with an interface and an implementation (class, package, service slice, or microservice).
- **Depth**: Leverage of the interface. A module is **deep** when significant complexity and invariants are encapsulated behind a clean, simple public contract. A module is **shallow** when its interface is as complicated as its internal code (pass-through wrappers, repetitive getters/setters, anemic services that push validation onto callers).
- **Seam**: A public boundary where behaviour can be exercised, observed, or replaced without altering caller code.
- **Locality**: Concentration of a business invariant in one single place rather than leaking validation and logic across five callers.

---

## 2. Invariants for Microservice Codebases

### Invariant 1: Controllers & Handlers are Shallow; Domain is Deep
- Controllers/Handlers: validate request format/JSON syntax, extract authentication identity, map to DTO, call application/domain service, return HTTP response envelope.
- Domain/Application services: enforce business invariants, coordinate transactions, validate state transitions, generate events.
- **Smell**: A controller that contains 50 lines of business `if/else` checks or database calculations is broken. Move it into the domain.

### Invariant 2: The Interface is the Test Surface
- Write unit tests against the public interface of the deep module.
- If testing a feature requires mocking 8 private collaborators or internal helper classes, the module is shallow and improperly partitioned.

### Invariant 3: Design It Twice
- Before committing to a non-trivial service or package structure, write down at least two viable alternatives in the spec:
  - Alternative A: Event-driven outbox vs synchronous orchestration.
  - Alternative B: Embedded aggregate vs separate repository slice.
- State explicitly why the chosen design wins on locality, testability, and operational simplicity.

### Invariant 4: Factory Constructors Enforce Invariants
- Prefer `Order.create(...)` or dedicated builders that enforce valid entity state upon creation over raw multi-setter instantiation.
- An object should never exist in an invalid state in memory.
