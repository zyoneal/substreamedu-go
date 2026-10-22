# Java & Gradle Microservice Rules

## 1. Build & Tooling Hygiene
- Always use the wrapper: `./gradlew`. Never rely on a system-wide `gradle`.
- In non-interactive and CI environments, use `--no-daemon --build-cache`.
- Formatting: run `./gradlew spotlessApply` before committing.
- Build warnings: treat compiler warnings and deprecations as actionable.

## 2. Layer Boundaries & Architectural Seams
- **Layers**:
  - `web / controller`: Accepts DTOs, validates request format (`@Valid`), delegates immediately to application services. Returns response DTOs or `ResponseEntity<ProblemDetail>`. Never queries DB repositories directly.
  - `application / service`: Orchestrates domain entities, transactions, and event emissions.
  - `domain`: Pure business rules and aggregates. Must NOT import web annotations (`@RestController`, `@PathVariable`) or Jackson annotations if separated.
  - `infrastructure / persistence`: Spring Data repositories, Kafka producers/consumers, outbound WebClient adapters.
- **Architectural Verification**: Layer boundaries are verified in unit tests via **ArchUnit**.

## 3. Spring Boot & Concurrency Standards
- **Stateless Beans**: Spring service and component beans (`@Service`, `@Component`) are singletons by default. NEVER store mutable per-request state in instance fields.
- **Transaction Boundaries**:
  - Place `@Transactional` on public methods in service classes.
  - Self-invocation (calling a `@Transactional` method from another method in the same class) bypasses Spring AOP proxy and will NOT open a transaction. Extract to a separate bean or self-inject.
  - Always specify rollback policy for checked exceptions if used: `@Transactional(rollbackFor = Exception.class)`.
- **Async Execution**: Never fire unbounded `new Thread()` or bare `@Async` without a bounded, monitored `TaskExecutor`.

## 4. JPA & Database Best Practices
- **N+1 Prevention**: Never access lazily-loaded `@OneToMany` collections inside loops. Use `JOIN FETCH` queries, `@EntityGraph`, or Spring Data projection interfaces.
- **Batching**: Never call `repository.save()` inside a loop for bulk data. Use `saveAll()` with `spring.jpa.properties.hibernate.jdbc.batch_size` configured.
- **Explicit Column Mapping**: Map column names explicitly (`@Column(name = "created_at")`).
- **Flyway / Liquibase**: All schema changes require a forward migration script. Never use `ddl-auto: update` or `create` in production configs.

## 5. Testing with Testcontainers
- Integration tests involving PostgreSQL, Redis, or Kafka MUST use **Testcontainers**.
- In-memory substitutes (such as H2 or embedded brokers) are forbidden for verifying SQL dialect, transactional semantics, or message serialization.
- Reuse container instances across test classes via singleton container pattern to keep test execution fast.

## 6. Observability & Logging
- Use SLF4J (`log.info()`, `log.warn()`, `log.error()`).
- Always pass exceptions as the last parameter: `log.error("Failed to process order ID {}: {}", orderId, e.getMessage(), e);`.
- Propagate `traceId`, `spanId`, and `userId` via MDC.
- Never log passwords, tokens, API keys, or unmasked credit card / PII data.
