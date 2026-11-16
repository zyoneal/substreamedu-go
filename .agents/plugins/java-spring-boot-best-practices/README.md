# Java & Spring Boot Best Practices

A Claude Code plugin with one skill: `java-spring-boot-best-practices`. It triggers when you write, review, refactor or debug Java / Spring Boot code. It applies practical, production-tested coding standards and reports review findings by severity.

**Target:** Java 17+, Spring Boot 3.x (most rules apply to older versions too).

## What it covers

| Area | Where |
|---|---|
| Core Java: equality, boxing, nulls, collections, streams, `java.time`, exceptions, naming, modern Java | `SKILL.md` |
| Money: `BigDecimal` rules, rounding, minor units, currencies | `SKILL.md` |
| Concurrency: thread pools, `ThreadLocal`, `CompletableFuture`, atomicity, interrupts, virtual threads | `SKILL.md` |
| Spring Boot: injection, config, scheduling, caching, observability, WebFlux, resilience | `SKILL.md` |
| Logging & testing (JUnit 5, AssertJ, Testcontainers, `@MockitoBean`) | `SKILL.md` |
| Security: injection, XXE, SSRF, Spring Security, JWT, IDOR, secrets, crypto, deserialization | `references/security.md` |
| Database & JPA: migrations, transactions, entity design, N+1, locking, MyBatis | `references/database-jpa.md` |
| REST API design: status codes, DTOs, validation, `ProblemDetail`, pagination, idempotency, versioning | `references/api-design.md` |

Code reviews use a **Blocker / Critical / Major / Minor** severity map. Each finding gives the file and line, the rule it breaks, why it matters, and the fix.

## Install

```
/plugin marketplace add honghaine/java-spring-boot-best-practices-plugin
/plugin install java-spring-boot-best-practices@java-spring-boot-best-practices
```

## Example prompts

- "Review `OrderService.java` before I merge."
- "Write a Kafka listener that processes payment events."
- "Is this `@Transactional` method safe?"

## License

MIT
