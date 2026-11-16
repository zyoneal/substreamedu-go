# Database, JPA & Transactions

## Contents
1. Schema & migrations
2. SQL rules
3. Transactions (Spring)
4. JPA / Hibernate
5. MyBatis
6. Connection pool & performance

---

## 1. Schema & migrations

- **Migrations (Mandatory):** manage all schema changes with Flyway or Liquibase, versioned and in git. Never `spring.jpa.hibernate.ddl-auto=update`/`create` in production (use `validate` or `none`). Never edit an already-applied migration; add a new one.
- **Backward-compatible changes (Mandatory):** during rolling deploys old and new code run together. Expand → migrate → contract: add the new column (nullable or with default), deploy code that writes both, backfill, then drop the old column in a later release. Never rename/drop a column in the same release that stops using it.
- **Naming (Mandatory):** tables and columns `snake_case`, lowercase, `[a-z0-9_]`, start with a letter, no reserved words, within DB limits (MySQL 64, PostgreSQL 63, Oracle 30/128). Be consistent with singular/plural.
- **Index naming (Mandatory):** `idx_<table>_<cols>` for normal, `uk_<table>_<cols>` for unique (e.g. `idx_user_email`). PostgreSQL index names are schema-global, so include the table.
- **Comments (Recommended):** add table and column comments describing meaning and units (e.g. `amount_minor` — "amount in minor currency units").
- **Primary keys (Mandatory):** `BIGINT` (or UUID) for generated keys — `INT` overflows. Prefer UUIDv7 / time-ordered UUIDs over random UUIDv4 for index locality.
- **Online index changes (Mandatory):** add the new index → confirm it's used (`EXPLAIN`) → then drop the old one. Dropping first leaves queries unindexed. Use `CREATE INDEX CONCURRENTLY` (PostgreSQL) / online DDL (MySQL) on large tables.
- **NULL handling (Mandatory):** prefer `NOT NULL` columns with defaults. Unique constraints allow multiple NULLs; `=`, `!=`, `IN`, `LIKE` against NULL yield unknown (rows silently excluded); `COUNT(col)` skips NULLs; use `IS NULL` / `IS DISTINCT FROM`.
- **Money columns (Mandatory):** `DECIMAL(19,4)` (or `BIGINT` minor units) + a currency column. Never `FLOAT`/`DOUBLE`.
- **Timestamps (Recommended):** store in UTC (`TIMESTAMP WITH TIME ZONE` in PostgreSQL; set `spring.jpa.properties.hibernate.jdbc.time_zone=UTC`).

## 2. SQL rules

- **No SELECT * (Mandatory):** list columns explicitly.
- **No unconditional UPDATE/DELETE (Mandatory):** every `UPDATE`/`DELETE` has a `WHERE` clause; MyBatis dynamic `<where>` blocks must not collapse to an empty condition.
- **Queue/job tables (Mandatory):** poll with an indexed condition and `FOR UPDATE SKIP LOCKED`; never an unconditioned `LIMIT 1` scan.
- **Stable ordering (Recommended):** when sorting by a non-unique column, append a unique tiebreaker (`ORDER BY created_at, id`) so pagination is deterministic.
- **Pagination (Recommended):** prefer keyset (seek) pagination over large `OFFSET` on big tables. Always cap page size.
- **Batch writes (Recommended):** batch inserts/updates (`hibernate.jdbc.batch_size`, `JdbcTemplate.batchUpdate`) instead of row-by-row loops. Note `GenerationType.IDENTITY` disables Hibernate insert batching — use `SEQUENCE` where batching matters.
- **Large IN lists (Recommended):** chunk lists (e.g. 500–1000) — databases have parameter limits (Oracle 1000, PostgreSQL 32767).

## 3. Transactions (Spring)

- **Proxy rules (Mandatory):** see SKILL.md §1.7 — public methods, no self-invocation, `rollbackFor` for checked exceptions.
- **Keep transactions short (Mandatory):** no remote calls, file I/O, or user waits inside a transaction. Long transactions hold locks and connections.
- **readOnly (Recommended):** `@Transactional(readOnly = true)` on query methods — Hibernate skips dirty checking and flushing, and routing datasources can send them to replicas. A common pattern: `readOnly = true` at class level, plain `@Transactional` on write methods.
- **Propagation (Recommended):** default `REQUIRED` joins the caller's transaction. Use `REQUIRES_NEW` only for work that must commit independently (audit log, outbox write that must survive rollback) — it takes a second connection, so beware pool exhaustion and deadlocks. Avoid `NESTED`/`MANDATORY`/`NEVER` unless you know why.
- **Rollback-only surprise (Mandatory):** if an inner `REQUIRED` method throws and the outer catches it, the whole transaction is already marked rollback-only → `UnexpectedRollbackException` at commit. Either let it propagate or put the inner work in `REQUIRES_NEW`.
- **Isolation (Recommended):** know your DB default (MySQL InnoDB `REPEATABLE_READ`, PostgreSQL `READ_COMMITTED`). For read-modify-write, use optimistic locking (`@Version`), `SELECT ... FOR UPDATE` (`@Lock(PESSIMISTIC_WRITE)`), or an atomic `UPDATE ... SET balance = balance - ? WHERE balance >= ?`.
- **Programmatic transactions:** inside `TransactionTemplate.execute(status -> ...)`, if you catch an exception, call `status.setRollbackOnly()`.
- **Side effects after commit:** publish events/messages with `@TransactionalEventListener(phase = AFTER_COMMIT)` or the outbox pattern, never mid-transaction.
- **@Transactional in tests:** test-level `@Transactional` rolls back after each test — convenient, but it hides lazy-loading and flush errors that happen in production. Add some tests without it.

## 4. JPA / Hibernate

- **Entity equals/hashCode (Mandatory):** never Lombok `@Data` / `@EqualsAndHashCode` on entities (touches lazy associations → extra queries, `LazyInitializationException`, infinite recursion through bidirectional links, and broken `HashSet` membership when the ID is assigned on persist). Use ID-based equality with a constant `hashCode()`:
  ```java
  @Override public boolean equals(Object o) {
      if (this == o) return true;
      if (!(o instanceof Order other)) return false;
      return id != null && id.equals(other.getId());
  }
  @Override public int hashCode() { return getClass().hashCode(); }
  ```
  Also exclude associations from `toString()`.
- **Fetch types (Mandatory):** all associations `LAZY` (`@ManyToOne(fetch = LAZY)`, `@OneToOne(fetch = LAZY)` — their default is EAGER). Load what a use case needs with `JOIN FETCH` or `@EntityGraph`.
- **N+1 queries (Mandatory on hot paths):** detect with SQL logging / Hibernate statistics in dev or tests; fix with `JOIN FETCH`, `@EntityGraph`, `@BatchSize`, or `hibernate.default_batch_fetch_size`. Don't `JOIN FETCH` two collections at once (cartesian product / `MultipleBagFetchException`) — fetch them in separate queries.
- **LazyInitializationException:** don't "fix" it with `EAGER`, `open-in-view=true`, or `enable_lazy_load_no_trans`. Fetch what you need inside the transaction and map to DTOs before returning.
- **open-in-view (Recommended):** `spring.jpa.open-in-view=false`.
- **Don't return entities from APIs (Mandatory):** map to DTOs/records. Entities leak internal fields, trigger lazy loading during serialization, and cause recursion.
- **Projections for reads (Recommended):** read-only lists use DTO/interface projections or `record` constructor expressions (`select new com.x.OrderSummary(o.id, o.total) ...`) instead of loading full entities.
- **Cascade & orphanRemoval (Recommended):** cascade only from aggregate root to its owned children. Never `CascadeType.REMOVE`/`ALL` on `@ManyToOne` or `@ManyToMany`. Keep both sides of bidirectional associations in sync with helper methods (`addItem`/`removeItem`).
- **Collections (Recommended):** prefer `Set` for `@ManyToMany`; never replace a managed collection instance with `setItems(new ArrayList<>())` when `orphanRemoval = true` — clear and add instead.
- **Bulk operations (Recommended):** `@Modifying` JPQL/SQL updates bypass the persistence context; use `@Modifying(clearAutomatically = true, flushAutomatically = true)` or don't reuse loaded entities afterwards. Bulk updates also skip `@Version` and entity listeners.
- **Optimistic locking (Recommended):** `@Version` on entities edited concurrently; handle `ObjectOptimisticLockingFailureException` (retry or return 409).
- **save() semantics (Recommended):** managed entities are flushed automatically at commit; calling `repository.save()` on them is unnecessary. `save()` on a detached entity with an ID does a `merge` (SELECT + copy).
- **Derived query names (Recommended):** keep them short; switch to `@Query` when the method name grows beyond ~3 conditions.
- **Auditing (Recommended):** `@CreatedDate`, `@LastModifiedDate` with `@EnableJpaAuditing` instead of manual timestamps.

## 5. MyBatis

- `#{}` only for values (see security.md).
- Mapper XML must include `<!DOCTYPE mapper PUBLIC "-//mybatis.org//DTD Mapper 3.0//EN" "https://mybatis.org/dtd/mybatis-3-mapper.dtd">`.
- Use `<resultMap>` with explicit columns; enable `mapUnderscoreToCamelCase`.
- Guard dynamic SQL: `<if>` conditions on UPDATE/DELETE must never leave the statement without a `WHERE`.

## 6. Connection pool & performance

- Size HikariCP deliberately (start around `cores * 2`, measure); set `maximum-pool-size`, `connection-timeout`, and `leak-detection-threshold` in non-prod.
- Set query timeouts (`spring.jpa.properties.jakarta.persistence.query.timeout`, `JdbcTemplate.setQueryTimeout`).
- Check slow queries with `EXPLAIN`; index foreign keys and frequent filter/sort columns.
