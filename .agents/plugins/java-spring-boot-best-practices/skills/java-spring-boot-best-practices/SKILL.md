---
name: java-spring-boot-best-practices
description: Java + Spring Boot coding standards covering core Java pitfalls, collections/streams, money arithmetic, concurrency, transactions, JPA/database, REST API design, resilience, caching, observability, security, logging, and testing, with a severity map for code review. Use this skill whenever writing, reviewing, refactoring, or debugging Java or Spring Boot code (controllers, services, repositories, entities, @Transactional, JPA/Hibernate/MyBatis, REST endpoints, @Scheduled jobs, Kafka/RabbitMQ listeners, thread pools, CompletableFuture, BigDecimal/money logic, date/time handling, serialization, JUnit tests), even if the user does not say "best practices" or "code review". Also use it when someone asks whether Java code is correct, safe, performant, or production-ready.
---

# Java & Spring Boot Coding Best Practices

Target: Java 17+, Spring Boot 3.x (Jakarta EE namespace). Most rules also apply to older versions.

## How to use this skill

- **Writing code:** follow the rules below by default. Each exists because it has caused real production bugs: silent data loss, money errors, outages, or vulnerabilities.
- **Reviewing code:** check the code against these rules and report findings by severity using the map in §11 (Blocker → Critical → Major → Minor). For each finding give `file:line`, the rule, why it matters, and the fix. Don't pad reviews with rules the code doesn't touch.
- Levels: **Mandatory** = treat a violation as a defect. **Recommended** = strong default; deviate only with a reason.

**Reference files — read the one that matches the code in front of you:**

| File | Read when the code involves |
|---|---|
| `references/security.md` | auth/authz, Spring Security, JWT, user input reaching SQL/shell/XML/URLs/files, uploads, CORS/CSRF, secrets, crypto, deserialization — and for any security review |
| `references/database-jpa.md` | entities, repositories, JPA/Hibernate, MyBatis, SQL, migrations, transaction propagation/isolation, locking, N+1 |
| `references/api-design.md` | REST controllers, DTOs, validation, error responses, pagination, idempotency, API versioning, HTTP clients |

---

## 1. Core Java Rules

### 1.1 String comparison — Mandatory
Compare Strings with `equals()`, never `==` / `!=`. `==` compares references.

```java
// WRONG
if (s1 == s2) { ... }
// RIGHT
if (Objects.equals(s1, s2)) { ... }   // or "CONST".equals(s) when one side is a constant
```

### 1.2 Boxed types — Mandatory
- Compare `Integer`/`Long`/other wrappers with `equals()`, never `==`. `Integer a = 127, b = 127; a == b` is true (cached −128..127) but `1000 == 1000` boxed is false — the bug passes tests with small values and fails in production.
- Unboxing `null` throws NPE: `int count = map.get(key);`, `if (dto.getEnabled())` with `Boolean enabled = null`, ternaries mixing `int` and `Integer`. Null-check or use primitives with defaults.
- Use primitives for local variables and calculations; wrappers for nullable DTO/entity fields.

### 1.3 Null handling — Mandatory
- Never `x.equals(null)`. Use `x != null` / `Objects.isNull(x)`.
- `if (str != null && !str.isEmpty())`; `if (str == null || str.isEmpty())`. Prefer `StringUtils.hasText(str)` (Spring) or `StringUtils.isNotBlank(str)` (commons-lang3).
- Return empty collections, never `null`, from methods returning collections.
- Nested null checks → `Optional.ofNullable(e).map(Employee::getDepartment).map(Department::getId).orElse(DEFAULT_ID)`. Use `Optional` as a return type, not as a field or parameter. Never call `optional.get()` without checking — use `orElse`/`orElseThrow`.

### 1.4 Collections — Mandatory
- Never add/remove elements while iterating with for-each → `ConcurrentModificationException`. Use `removeIf(...)` or an explicit `Iterator.remove()`.
- `Arrays.asList(...)` is fixed-size (`add`/`remove` throw); `List.of`/`Map.of`/`Set.of` are immutable and reject `null`; `subList` is a view backed by the original list (structural changes to the original break it). Copy (`new ArrayList<>(...)`) when you need an independent mutable list.
- `toArray(new T[0])` (or `toArray(T[]::new)`); never cast the no-arg `toArray()` result.
- Override `hashCode()` whenever you override `equals()`; never use mutable fields in either for objects stored in `HashMap`/`HashSet`.
- Don't return internal mutable collections from getters; return `List.copyOf(...)` or an unmodifiable view.
- Recommended: size `HashMap`/`ArrayList` when the count is known (`HashMap.newHashMap(n)` on Java 19+); `entrySet()` over `keySet()` + `get()`; `EnumMap`/`EnumSet` for enum keys.

### 1.5 Streams — Mandatory
- `Collectors.toMap` throws `IllegalStateException` on duplicate keys and NPE on `null` values. Pass a merge function (`toMap(k, v, (a, b) -> a)`) when duplicates are possible; filter nulls first.
- Stream lambdas must not mutate external state (`list.add` inside `forEach`/`map`) — collect instead. This is a hard bug with `parallelStream()` (see §3).
- `Stream.toList()` (Java 16+) returns an unmodifiable list; `Collectors.toList()` doesn't guarantee mutability either. Copy if you need to modify.
- Don't use `parallelStream()` for I/O or inside request handling — it runs on the shared `ForkJoinPool.commonPool()`.
- Recommended: a plain loop is fine when it's clearer; avoid long chains with side effects; don't reuse a stream.

### 1.6 Date/time: use java.time — Mandatory
- Use `java.time` (`Instant`, `LocalDate`, `ZonedDateTime`, `DateTimeFormatter`). Store and transmit `Instant`/UTC; convert to a `ZoneId` only at the edges.
- Always specify the zone explicitly when converting between strings and dates: `LocalDateTime.parse(s, fmt).atZone(ZoneId.of("Europe/Paris"))`. The JVM default zone differs per server.
- Never do manual offset math (`+ 8 * 3600 * 1000`); it breaks on DST. Use `ZoneId` rules.
- Patterns: lowercase `yyyy` (`YYYY` is week-based year — 2010-12-26 formats as "2011"), uppercase `HH` for 24-hour (`hh` is 12-hour), lowercase `dd` (`DD` is day-of-year). Prefer ISO-8601 for APIs.
- No hardcoded 365 days — use `plusYears(1)` / `Year.of(y).length()`.
- Inject a `java.time.Clock` instead of calling `now()` directly, so logic is testable.
- `SimpleDateFormat`/`DecimalFormat` are not thread-safe; never store them in `static` fields. Use immutable `DateTimeFormatter` constants.

### 1.7 Spring proxy annotations — Mandatory
`@Transactional`, `@Cacheable`, `@Async`, `@Retryable`, `@PreAuthorize` and custom aspects work through proxies:
- Put them on `public` methods; on private methods they are silently ignored.
- Self-invocation (`this.foo()` inside the same bean) bypasses the proxy, so the annotation does nothing. Move the annotated method to another bean.
- `@Transactional` rolls back only on unchecked exceptions by default; declare `rollbackFor = Exception.class` if checked exceptions should roll back.
- More transaction rules (propagation, readOnly, rollback-only trap): `references/database-jpa.md` §3.

### 1.8 Exceptions — Mandatory
- No `return`/`throw` inside `finally` — it discards the original exception. Use try-with-resources for anything `AutoCloseable`.
- Never swallow exceptions (empty `catch`). Handle, or rethrow wrapped **with the cause**: `throw new OrderException("Failed to load order " + id, e)`.
- Log with the throwable as the last argument: `log.error("Failed to process order {}", orderId, e)`. Never `"..." + e` (loses the stack).
- Don't catch `Exception`/`Throwable` broadly in business code; never catch `Error`.
- Don't log-and-rethrow at every layer — log once, where it's handled.
- Don't use exceptions for normal control flow (they're slow and obscure intent).
- Recommended: a small domain exception hierarchy (unchecked) mapped to HTTP status in one `@RestControllerAdvice`; messages include the identifying context (IDs), never secrets.
- No `e.printStackTrace()` / `System.out` in application code.

### 1.9 Misc API traps — Mandatory
- `Boolean.getBoolean(String)` / `Integer.getInteger(String)` read **system properties**. Use `Boolean.parseBoolean` / `Integer.parseInt`.
- `String.split` takes a regex: `"a.b".split(".")` returns an empty array — use `split("\\.")` or `Pattern.quote`.
- String concatenation inside loops → `StringBuilder` (or `String.join` / `Collectors.joining`).
- `Random` shared across threads contends — use `ThreadLocalRandom.current()` (non-security) or `SecureRandom` (security).
- Specify charsets explicitly (`StandardCharsets.UTF_8`) on byte↔String conversions (default changed in Java 18).

### 1.10 Classes, POJOs & serialization — Mandatory
- Never define both `isXxx()` and `getXxx()` for one property, and don't name boolean fields `isXxx` (Jackson/MyBatis/Lombok disagree on the property name). Field `deleted`, accessor `isDeleted()`.
- No same-name fields across an inheritance chain (frameworks bind only the child's copy → parent reads null).
- `Serializable` classes declare `serialVersionUID`; nested serializable classes must be `static`.
- Prefer immutability: `final` fields, records (Java 16+) for DTOs/value objects, defensive copies of mutable inputs.
- Lombok: `@Data` is fine for simple DTOs, never on JPA entities (see `references/database-jpa.md` §4); prefer `@Value`/records for immutables.

### 1.11 Naming & style — Recommended
- Classes `UpperCamelCase` nouns; methods/variables `lowerCamelCase`, methods start with a verb; constants `UPPER_SNAKE_CASE` (`static final`, immutable); packages lowercase, no underscores.
- Booleans read as questions: `active`, `hasItems`, `canRetry`. Collections plural.
- Suffixes signal role: `*Service`, `*Repository`, `*Controller`, `*Config`, `*Exception`, `*Request`/`*Response` DTOs.
- No magic numbers/strings — named constants or enums.
- Methods short and single-purpose; limit parameters (≥4 → parameter object/record).
- Javadoc on public APIs describes params, return value, thrown exceptions; comments explain *why*, not *what*.
- Mark nullable params/returns with `@Nullable` (Spring or JSpecify), or return `Optional`.
- Put `default:` last in `switch`; prefer switch expressions, which force exhaustiveness over enums/sealed types.

### 1.12 Modern Java — Recommended
Use what the target version offers: records for data carriers; sealed interfaces + pattern-matching `switch` for closed hierarchies (Java 21); `instanceof` pattern matching; text blocks for SQL/JSON literals; `var` where the type is obvious from the right-hand side; `List.of`/`Map.of` factories; enhanced `Stream`/`Optional` APIs.

---

## 2. Money Safety

| Rule | Level | Practice |
|---|---|---|
| No float/double for money | Mandatory | `BigDecimal` (or `long` minor units, or JSR-354 `javax.money` / Joda-Money). `0.1 + 0.2 != 0.3` in `double`. |
| BigDecimal construction | Mandatory | `new BigDecimal("0.1")` or `BigDecimal.valueOf(0.1d)`; never `new BigDecimal(0.1)` (→ 0.1000000000000000055…). |
| BigDecimal equality | Mandatory | `a.compareTo(b) == 0`, not `equals()` — `equals` compares scale (`2.0` ≠ `2.00`). Same issue as `HashSet`/`HashMap` keys: normalize with `stripTrailingZeros()` or use a money type. |
| BigDecimal division | Mandatory | Always pass scale + `RoundingMode` to `divide(...)`; non-terminating results throw `ArithmeticException`. Choose rounding deliberately (`HALF_EVEN` for banking). |
| Immutable results | Mandatory | `add`/`subtract`/`multiply` return NEW objects. `total.add(x);` alone is a silent no-op — write `total = total.add(x);`. |
| Minor-unit conversion | Mandatory | Never multiply/divide by 100 blindly — JPY/KRW have 0 fraction digits, BHD/KWD have 3. `amount.movePointRight(Currency.getInstance(ccy).getDefaultFractionDigits())`. |
| Minor units are integers | Mandatory | Amounts in minor units use `long`, never a fractional type. Watch overflow on multiplication (`Math.multiplyExact`). |
| Float comparison (non-money) | Mandatory | `Math.abs(a - b) < EPSILON`; never `==` on primitives, never `equals()` on boxed `Float`/`Double`. |
| Integer division | Recommended | Cast first: `(double) done / total` — `long / long` truncates. |
| Money serialization | Recommended | `{ "amount": "12.34", "currency": "USD" }` with amount as a string; JSON numbers become doubles in many clients. Test the round-trip. |

---

## 3. Concurrency

- **parallelStream with shared mutable state (Critical):** never add to `ArrayList`/`HashMap`/`HashSet` from a parallel lambda. Use collectors or concurrent collections.
- **ThreadLocal / MDC cleanup (Critical):** always `threadLocal.remove()` / `MDC.remove(key)` in `finally`. Pooled threads reuse values across requests → data leaks between users and memory leaks.
- **Paired resources (Critical):** anything acquired (locks, permits, timers, spans) is released in `finally`. `lock.lock()` goes *before* `try`; `unlock()` in `finally`.
- **Check-then-act is not atomic (Critical):** `if (!map.containsKey(k)) map.put(k, v)` races even on `ConcurrentHashMap`. Use `computeIfAbsent`, `putIfAbsent`, `merge`, `AtomicLong`/`LongAdder`. Don't do slow work or modify the same map inside `computeIfAbsent`.
- **Visibility (Mandatory):** fields read by other threads must be `volatile`, `final`, atomic, or guarded by a lock. Lazy singletons: holder idiom, or `volatile` + double-checked locking.
- **InterruptedException (Mandatory):** never swallow it. Restore the flag and stop: `catch (InterruptedException e) { Thread.currentThread().interrupt(); throw new IllegalStateException(e); }`.
- **CompletableFuture (Mandatory):** `supplyAsync`/`runAsync` without an executor use `ForkJoinPool.commonPool()` — pass your own bounded executor for I/O. Always handle failures (`exceptionally`/`handle`/`whenComplete`) or they vanish. Set timeouts (`orTimeout`, `completeOnTimeout`). Propagate MDC/trace context to async threads (Micrometer context propagation / `TaskDecorator`).
- **Deadlocks (Mandatory):** acquire multiple locks in a consistent global order; prefer `tryLock(timeout)`; never call external/unknown code while holding a lock.
- **Synchronization scope (Recommended):** keep critical sections small; lock on a private final object, not `this`/`getClass()`; prefer `java.util.concurrent` utilities over `wait/notify`.
- **Message listener failure (Major):** in `@KafkaListener` / `@RabbitListener`, let exceptions propagate so the container retries / dead-letters. Catch-and-log acks the message → silent loss. Configure `DefaultErrorHandler` with backoff + DLT (Kafka) or a DLX (RabbitMQ). Consumers must be idempotent (at-least-once delivery).
- **Messages and transactions (Major):** don't publish to Kafka/RabbitMQ/HTTP inside a DB transaction and assume it rolls back. Use the outbox pattern or `@TransactionalEventListener(phase = AFTER_COMMIT)`.
- **No remote calls inside transactions (Major):** not atomic, and holds DB connections during network waits. Do DB work in the transaction; call remote services outside with an idempotency key.
- **@Async (Recommended):** configure a dedicated bounded executor; exceptions from `void` `@Async` methods vanish unless an `AsyncUncaughtExceptionHandler` is set.
- **Distributed locking (Recommended):** `synchronized` only protects one JVM. Across instances use DB row locks, optimistic locking, or Redis/ShedLock-style locks with TTLs.
- **Virtual threads (Recommended, Java 21+):** good for blocking I/O (`spring.threads.virtual.enabled=true`). Avoid `synchronized` around blocking calls (pinning on Java 21–23), don't pool them, and bound downstream concurrency with semaphores/connection pools.

---

## 4. Resilience & Operations

- **Bounded thread pools (Mandatory):** never `Executors.newCachedThreadPool()` / `newFixedThreadPool()` (unbounded threads or unbounded queue → OOM). Explicit core/max size, bounded queue, named threads, rejection policy, metrics.
  ```java
  @Bean
  ThreadPoolTaskExecutor orderExecutor() {
      var ex = new ThreadPoolTaskExecutor();
      ex.setCorePoolSize(10);
      ex.setMaxPoolSize(50);
      ex.setQueueCapacity(100);
      ex.setThreadNamePrefix("order-");
      ex.setRejectedExecutionHandler(new ThreadPoolExecutor.CallerRunsPolicy());
      ex.setWaitForTasksToCompleteOnShutdown(true);
      return ex;
  }
  ```
- **Timeouts on every remote call (Mandatory):** connect + read timeouts on `RestClient`/`WebClient`, JDBC, Redis, and message clients. Defaults are often infinite.
- **Fail fast on required config (Mandatory):** `@ConfigurationProperties` + `@Validated` (`@NotNull`, `@NotBlank`) so the app refuses to start with missing settings. Health checks must reflect real dependency state.
- **Circuit breakers / retries (Recommended):** Resilience4j (`@CircuitBreaker`, `@Retry`, `@Bulkhead`, `@RateLimiter`). Retry only idempotent operations, with exponential backoff + jitter, and a total time budget.
- **Health & shutdown (Recommended):** Actuator liveness/readiness probes (`management.endpoint.health.probes.enabled=true`), `server.shutdown=graceful`, `spring.lifecycle.timeout-per-shutdown-phase`.
- **Containers (Recommended):** size heap relative to the container (`-XX:MaxRAMPercentage=75`), not fixed `-Xmx` that ignores limits; build layered images (`spring-boot:build-image` / Buildpacks or layered jar Dockerfile); run as non-root; `-XX:+ExitOnOutOfMemoryError` so orchestrators restart broken pods.
- **Observability (Recommended):** see §5.6.

---

## 5. Spring Boot Framework

### 5.1 Dependencies & configuration — Mandatory
- Use `spring-boot-starter-*` (or vendors' official starters) and let the Boot BOM manage versions. Don't pin individual Spring/Jackson/Hibernate versions without reason — mismatches cause `NoSuchMethodError` at runtime.
- No environment-specific values in code. `application-{profile}.yml`, env vars, or a config server. Type-safe `@ConfigurationProperties` (records work) over scattered `@Value`.
- Keep the main class in the root package; don't `@ComponentScan`/`@Import` what is already scanned (duplicate beans).

### 5.2 Beans & injection — Mandatory
- Constructor injection with `final` fields (Lombok `@RequiredArgsConstructor` fine). No field `@Autowired`.
- Beans are singletons: no mutable per-request state in fields of services/controllers.
- Circular dependencies are a design smell (disallowed by default since Boot 2.6) — extract a third bean rather than enabling `allow-circular-references`.
- `ApplicationListener<ContextRefreshedEvent>` fires once per context (parent/child) — guard on the context, or use `ApplicationReadyEvent` / `ApplicationRunner` for "app started" logic.
- `@PostConstruct` (`jakarta.annotation`) is fine; no heavy I/O there and don't rely on other beans' proxies being ready.

### 5.3 Layering — Recommended
- Controllers thin (validate, map DTOs, delegate). Business logic and `@Transactional` in services. Repositories only do persistence.
- Never expose JPA entities in API responses. API rules: `references/api-design.md`.
- One `@RestControllerAdvice` producing `ProblemDetail`; never leak stack traces.
- Structure by feature (`order/`, `payment/`) rather than by technical layer for larger apps; keep packages cohesive.

### 5.4 Scheduling — Mandatory
- `@Scheduled` runs on **every** instance. Jobs that must run once cluster-wide need ShedLock, Quartz clustered mode, or a Kubernetes CronJob.
- The default scheduler has one thread — set `spring.task.scheduling.pool.size` when you have several jobs, or one slow job blocks the rest.
- Jobs must be idempotent and safe to re-run; catch and log per-item failures so one bad record doesn't abort the batch.

### 5.5 Caching — Recommended
- `@Cacheable` keys must include every parameter that changes the result (tenant, user, locale). Explicit `key = "#tenantId + ':' + #id"` beats implicit keys when parameters are objects.
- Set TTLs (`spring.cache.redis.time-to-live`) — no unbounded caches. Bound local caches (Caffeine `maximumSize`).
- Evict/update on writes (`@CacheEvict`, `@CachePut`); accept and document the staleness window.
- Don't cache `null`/errors unintentionally (`unless = "#result == null"`), and protect hot keys from stampedes (`sync = true`).
- Cache immutable values; verify Redis serialization round-trips (`BigDecimal` scale, `java.time` types). Namespace keys per environment.
- Self-invocation bypasses `@Cacheable` (§1.7).

### 5.6 Observability — Recommended
- Micrometer metrics for business events and latencies (`Counter`, `Timer`, `@Timed`/`@Observed`); keep tag cardinality low (no user IDs/order IDs as tags).
- Micrometer Tracing with `%X{traceId} %X{spanId}` in the log pattern; propagate context across async boundaries.
- Expose metrics to Prometheus/OTLP; alert on error rate, latency, saturation (pools, queues).

### 5.7 JPA & data — Mandatory summary
`spring.jpa.open-in-view=false`, LAZY associations, no `@Data` on entities, avoid N+1, `ddl-auto=validate` with Flyway/Liquibase. Full rules: `references/database-jpa.md`.

### 5.8 Reactive (WebFlux) — Mandatory if used
- Never block in a reactive chain (`.block()`, JDBC, `Thread.sleep`, blocking HTTP clients) — it stalls the event loop. Wrap unavoidable blocking calls in `Mono.fromCallable(...).subscribeOn(Schedulers.boundedElastic())`.
- Nothing happens until subscription — don't build a `Mono` and forget to return it.
- Don't mix MVC and WebFlux in one app without a reason; choose WebFlux only when you need it (streaming, very high concurrency). With virtual threads, MVC often suffices.

---

## 6. Security — summary

All Mandatory. Full rules and code: `references/security.md`.
- Parameterized SQL only (MyBatis `#{}`, never `${}` with user input); no user input in shell commands, SpEL, or templates.
- Spring Security, deny-by-default, `@PreAuthorize`; check resource ownership (IDOR) on every ID.
- Bind requests to DTOs, never entities (mass assignment); validate with Bean Validation.
- No hardcoded secrets; BCrypt/Argon2 for passwords; AES-GCM; `SecureRandom`.
- XXE disabled on XML parsers; no untrusted Java deserialization or Jackson default typing.
- CSRF on for session apps; explicit CORS origins; HttpOnly/Secure/SameSite cookies.
- Validate user-supplied URLs (SSRF), uploads, and file paths.
- Lock down Actuator (only `health`/`info` public).

## 7. Database — summary

Full rules: `references/database-jpa.md`. Key Mandatory points: Flyway/Liquibase migrations (backward compatible), no `SELECT *`, no unconditional UPDATE/DELETE, `BIGINT`/UUID keys, `DECIMAL` money columns, add-new-index-before-dropping-old, `FOR UPDATE SKIP LOCKED` for job tables, short transactions.

## 8. REST API — summary

Full rules: `references/api-design.md`. Key points: correct status codes (never 200 with an error body), request/response DTOs with `@Valid`, `ProblemDetail` errors, capped pagination (don't serialize `Page` directly), idempotency keys on payment/order POSTs, additive-only changes within a version.

---

## 9. Logging — all Recommended

- Log through SLF4J (Logback by default), not `System.out`/`System.err`.
- Libraries depend on `slf4j-api` only; apps pick one binding. Check `mvn dependency:tree` for duplicate bindings and bridge loops (`log4j-slf4j2-impl` + `log4j-to-slf4j` = infinite loop).
- `{}` placeholders, not concatenation. Request context in MDC, cleared in `finally`.
- Guard expensive arguments: `if (log.isDebugEnabled())` or the fluent `log.atDebug().addArgument(() -> toJson(req)).log(...)`.
- Always include the throwable (`log.error("msg", e)`). Downgrade expected noise (client disconnects) or turn it into metrics. Run with `-XX:-OmitStackTraceInFastThrow`.
- Levels mean something: `ERROR` = needs human attention, `WARN` = unexpected but handled, `INFO` = business milestones, `DEBUG` = diagnostics. Don't log every request body at `INFO`.
- Declare loggers with the enclosing class (`LoggerFactory.getLogger(Foo.class)` / `@Slf4j`); watch copy-paste bugs.
- Never log secrets, tokens, passwords, full card numbers, or unnecessary PII.
- Structured JSON logs in production (`logging.structured.format.console=ecs` on Boot 3.4+, or logstash-logback-encoder).

---

## 10. Testing

- **Assert, never print (Mandatory):** AssertJ (`assertThat(result.isSuccess()).as("status check").isTrue()`) or JUnit 5 assertions with messages.
- **Assert outcomes (Mandatory):** a call without assertions on result/side effects proves nothing. Verify interactions with Mockito only when the interaction *is* the behavior.
- **Assert exception type AND message (Mandatory):** `assertThatThrownBy(() -> svc.pay(req)).isInstanceOf(InsufficientFundsException.class).hasMessageContaining("balance")`.
- **Independent, deterministic tests (Mandatory):** no ordering dependencies or shared mutable state; inject `Clock`; seed randomness; no `Thread.sleep` for async — use Awaitility.
- **Right slice (Recommended):** plain JUnit + Mockito for logic; `@WebMvcTest`, `@DataJpaTest`, `@JsonTest`, `@RestClientTest` for slices; `@SpringBootTest` only for full integration. Mock beans with `@MockitoBean` (Boot 3.4+; `@MockBean` is deprecated).
- **Real infrastructure (Recommended):** Testcontainers (`@ServiceConnection`) for PostgreSQL/MySQL/Kafka/Redis instead of H2 when SQL dialect or broker behavior matters. Reuse containers across tests to keep suites fast.
- **Context caching (Recommended):** every distinct `@MockitoBean`/property combination creates a new Spring context — keep configurations uniform to avoid slow suites.
- **Data-driven (Recommended):** `@ParameterizedTest` with `@CsvSource`/`@MethodSource`.
- **Intent names (Recommended):** `pay_whenBalanceInsufficient_throws()` or `@DisplayName`.
- **Cover the edges (Recommended):** null/empty inputs, boundaries, money rounding, time zones/DST, concurrency on critical paths, and security rules (unauthorized access returns 401/403).

---

## 11. Review Severity Map

**Blocker (must fix before merge):** String or boxed-number `==` · `SELECT *` · `YYYY`/`hh`/`DD` date patterns · float/double for money · `new BigDecimal(double)` · `BigDecimal.equals` for value comparison · unconditional UPDATE/DELETE · `@Transactional` on non-public or self-invoked methods · missing explicit timezone in string↔date conversion · float equality with `==` · hardcoded 365 days · SQL/JPQL built by concatenation or MyBatis `${}` with user input · hardcoded secrets · missing authorization / ownership check on sensitive endpoints · entity bound directly from request body · XXE-enabled parser · unsafe deserialization of untrusted data · swallowed `InterruptedException` · exposed sensitive Actuator endpoints.

**Critical:** ignored `BigDecimal`/money operation result · `divide` without scale/rounding · shared mutable collections in `parallelStream` · ThreadLocal/MDC not cleared · unreleased locks/resources · non-atomic check-then-act on shared maps · unbounded thread pools · remote calls without timeouts · `CompletableFuture` on the common pool for I/O or with unhandled failures · `@Scheduled` single-run job with no distributed lock · `Collectors.toMap` on possibly-duplicate keys · modifying a collection during for-each.

**Major:** message listener that swallows exceptions · programmatic transaction catch without `setRollbackOnly()` · messages/HTTP calls inside a DB transaction · `@Data`/`EAGER` on JPA entities · N+1 queries on hot paths · entities returned from controllers · field injection · `ddl-auto=update` in production · non-backward-compatible migration · enums in cross-service API contracts · 200 responses carrying errors · caching mutable objects or cache keys missing parameters · blocking calls inside WebFlux chains · MyBatis mapper missing DTD · manual timezone offset math.

**Minor:** Recommended-level rules (naming, logging style, test structure, Javadoc, modern-Java idioms).
