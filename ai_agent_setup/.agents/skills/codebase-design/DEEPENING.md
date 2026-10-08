# Deepening: Transforming Shallow Modules

How to deepen a cluster of shallow modules safely, given their dependencies.

---

## What Makes a Module Shallow?
- **Pass-through methods**: Functions that merely translate parameters and forward them to another service or helper.
- **Leaky internals**: Callers must understand the module's execution order or configure 4 internal objects before calling `Run()`.
- **Temporal coupling**: Caller must remember to call `Init()`, `Validate()`, `Process()`, `Cleanup()` in exact sequence.
- **Fragmented helpers**: A folder with 10 two-line utility files that are only ever called together by one consumer.

---

## Deepening Strategies

### 1. In-Process Logic
Pure algorithms, state transforms, text cleaners (e.g. `subtitleCleaner.ts`, `subtitleSentenceStitcher.ts`).
- **Strategy**: Merge fragmented helpers into a single cohesive deep module.
- **Testing**: Test directly through the public interface on authentic domain inputs.

### 2. Local-Substitutable Resources
Databases, caches, file storage.
- **Strategy**: Keep the seam internal to the service boundary.
- **Testing**: Use lightweight local test doubles or in-memory fakes rather than mocking every single query function call.

### 3. Remote Boundaries (Ports & Adapters)
External APIs (YouTube API, LLM providers, Speech Synthesis, Dictionary API).
- **Strategy**: Define a clean Go interface or TypeScript adapter at the system seam.
- **Production**: Live network client with timeouts, retries, and circuit breakers.
- **Testing**: Deterministic mock/stub adapter returning fixed fixtures.
