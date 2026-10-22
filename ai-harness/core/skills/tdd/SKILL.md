---
name: tdd
description: Seam-based test-driven development for Java (JUnit 5) and Python (pytest). Red → green → refactor through public interfaces, mocking only at system boundaries. Use when implementing a new behaviour or changing an existing one.
---

# Seam-based TDD

## What a good test is

- It checks **behaviour through a public seam**: a controller endpoint, application service method, message listener, or domain object's public API. After a refactor that keeps behaviour, it still passes untouched.
- It reads like a specification: `placeOrder_whenStockIsInsufficient_rejectsWithOutOfStock` / `test_place_order_rejects_when_stock_insufficient`.
- It fails for one reason, and the failure message says what broke.

## The loop

1. **Red.** Write one test for the next smallest behaviour. Run it and see it fail for the expected reason. A compile error is not a meaningful red. Add the empty method first.
2. **Green.** Write the simplest code that passes. Hard-coding is fine if the next test will force generalization.
3. **Refactor.** Remove duplication, improve names, move behaviour onto the object that owns the data. Tests stay green.
4. Repeat. Commit at green.

## Choosing the test level

| Behaviour | Java | Python |
|---|---|---|
| Domain rule, calculation, state transition | Plain JUnit on the domain object, no Spring | Plain pytest on the domain object, no app or DB |
| HTTP mapping, validation, error envelope | `@WebMvcTest` / `@WebFluxTest` with the service mocked | `TestClient` / `httpx.AsyncClient` with the dependency overridden |
| SQL, transactions, locking, migrations | `@DataJpaTest` / `@SpringBootTest` + Testcontainers Postgres | pytest + testcontainers Postgres + real Alembic migrations |
| Kafka publish/consume, outbox | Testcontainers Kafka + Awaitility | testcontainers Kafka + polling with timeout |
| Outbound HTTP client | WireMock | respx / pytest-httpx |

## Mock only at boundaries you don't own

Mock: external HTTP APIs, message brokers in unit tests, the clock (`Clock`, `time-machine`), randomness, the file system when the behaviour isn't about files.

Do not mock: your own domain objects, value objects, mappers, or the class under test. Do not verify the call order of internal collaborators. If a test needs many mocks, the design is too shallow (see the `codebase-design` skill).

## Hygiene

- Use builders or factories for test data (`anOrder().withStatus(PAID).build()` / `order_factory(status="paid")`) once a fixture repeats three or more times.
- No `Thread.sleep` / `time.sleep`. Use Awaitility or polling with a timeout.
- No shared mutable state between tests. Each test sets up what it needs.
- Never weaken an assertion, add `@Disabled` / `skip`, or lower a coverage threshold to get green.
