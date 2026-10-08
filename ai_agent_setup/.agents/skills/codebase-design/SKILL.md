---
name: codebase-design
description: Shared vocabulary and principles for designing Deep Modules and robust architectural seams. Use when designing new modules, refactoring interfaces, reducing complexity, or deciding where seams and boundaries belong.
---

# Codebase Design: Deep Modules & Clean Seams

Design **deep modules**: rich, sophisticated capability behind a simple, intuitive interface, positioned at a natural seam, testable through that interface.

Reference: John Ousterhout (*A Philosophy of Software Design*).

---

## Core Glossary

Use these terms consistently:

- **Module**: Anything with an interface and an implementation (function, struct/class, package, or microservice slice).
- **Interface**: Everything a caller must know to use the module correctly: signatures, invariants, error modes, configuration, and performance traits.
- **Implementation**: The body of code hidden inside the module.
- **Depth**: Leverage at the interface. A module is **deep** when substantial behavior sits behind a clean, compact interface. A module is **shallow** when its interface is nearly as complex as its implementation (e.g. getters/setters or thin pass-through wrappers).
- **Seam**: A location where behavior can be altered or observed without modifying the callers (Michael Feathers).
- **Adapter**: A concrete implementation satisfying an interface at a seam (e.g., PostgreSQL repository vs In-Memory test fake).
- **Leverage**: Capability earned per unit of cognitive interface learned. One deep implementation pays dividends across multiple call sites.
- **Locality**: Concentration of change, bugs, and invariants in one place rather than leaking across consumers.

---

## Key Principles

1. **Hide Complexity Behind Clean Seams**:
   Callers should not need to orchestrate 5 internal steps to accomplish 1 domain goal. Provide high-leverage entry points.
2. **The Interface is the Test Surface**:
   Test through the module's public seam. If tests must mock internal helper functions or inspect private struct fields, the module is either shallow or lacks a proper seam.
3. **Design It Twice**:
   When introducing a non-trivial new module, interface, or service boundary, explore at least two distinct approaches before committing. See [DESIGN-IT-TWICE.md](DESIGN-IT-TWICE.md).
4. **Deepen Shallow Modules**:
   Merge fragmented micro-classes or sprawling multi-file utilities when they represent a single cohesive capability. See [DEEPENING.md](DEEPENING.md).
