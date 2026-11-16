# REST API Design (Spring Boot)

## Contents
1. Resources & HTTP semantics
2. Request/response models & validation
3. Errors
4. Pagination, filtering, sorting
5. Idempotency & concurrency
6. Versioning & compatibility
7. HTTP clients
8. Documentation

---

## 1. Resources & HTTP semantics

- Nouns, plural, kebab-case paths: `GET /orders/{orderId}/line-items`. No verbs in paths except for genuine actions that aren't CRUD (`POST /orders/{id}/cancel`).
- Methods: `GET` read (safe, no side effects), `POST` create/action, `PUT` full replace (idempotent), `PATCH` partial update, `DELETE` remove (idempotent).
- Status codes:
  | Case | Code |
  |---|---|
  | Read OK | 200 |
  | Created | 201 + `Location` header |
  | Accepted for async processing | 202 |
  | No body (DELETE, some updates) | 204 |
  | Validation error / malformed | 400 |
  | Not authenticated | 401 |
  | Authenticated but not allowed | 403 (or 404 to hide existence) |
  | Not found | 404 |
  | Conflict / version mismatch / duplicate | 409 |
  | Precondition failed (`If-Match`) | 412 |
  | Semantically invalid business rule | 422 |
  | Rate limited | 429 + `Retry-After` |
  | Server bug | 500 — never deliberately |
  | Downstream unavailable | 503 |
- Never return 200 with `{"success": false}` for errors — clients, gateways, and monitoring rely on status codes.
- Return `ResponseEntity` only when you need to set status/headers; otherwise return the body and use `@ResponseStatus`.

## 2. Request/response models & validation

- **Separate DTOs (Mandatory):** request and response types are records/DTOs, never JPA entities (mass assignment, lazy loading, leaking fields). Map with MapStruct or hand-written mappers.
- **Validate at the edge (Mandatory):** `@Valid @RequestBody CreateOrderRequest req`; Bean Validation annotations on fields; `@Valid` on nested objects and collection elements (`List<@Valid LineItem>`). Path/query param validation needs `@Validated` on the controller (automatic for method validation in Spring 6.1+).
- **Validation groups (Recommended):** use groups (`OnCreate`, `OnUpdate`) or, simpler, separate request types for create vs update.
- **Consistent JSON (Recommended):** camelCase fields; ISO-8601 timestamps with offset (`2026-11-12T10:15:30Z`) — set `spring.jackson.serialization.write-dates-as-timestamps=false`; money as `{ "amount": "12.34", "currency": "USD" }`; IDs as strings if they can exceed 2^53 (JavaScript number precision).
- **Tolerant reader (Recommended):** keep `FAIL_ON_UNKNOWN_PROPERTIES=false` (Boot default) so adding fields doesn't break clients.
- **Don't expose internals:** no DB IDs that reveal volume if that matters, no internal enum names you might change, no stack traces.

## 3. Errors

- One `@RestControllerAdvice` that maps exceptions to RFC 9457/7807 `ProblemDetail` (`spring.mvc.problemdetails.enabled=true`, or extend `ResponseEntityExceptionHandler`).
- Include a stable machine-readable error code (`"type"` URI or a `code` property), a human message, the trace ID, and field errors for validation failures.
- Map domain exceptions explicitly (`OrderNotFoundException` → 404, `InsufficientFundsException` → 422); unknown exceptions → 500 with a generic message, logged with stack trace.
- Don't log-and-rethrow at every layer; log once where handled (usually the advice).

## 4. Pagination, filtering, sorting

- Always paginate collection endpoints and cap page size (`spring.data.web.pageable.max-page-size=100`).
- Don't return Spring Data's `Page` object directly — its JSON shape is not a stable contract (Spring Data 3.3+ warns about it). Return your own `PageResponse<T>(content, page, size, totalElements)` or use `@EnableSpringDataWebSupport(pageSerializationMode = VIA_DTO)`.
- Large or fast-changing datasets: cursor/keyset pagination (`?after=<opaqueCursor>&limit=50`).
- Whitelist sortable/filterable fields; never pass raw sort strings into queries.

## 5. Idempotency & concurrency

- **Idempotency keys (Mandatory for payments/orders):** accept an `Idempotency-Key` header on non-idempotent `POST`s; store key + response; replay the stored response on retry. Clients and gateways retry on timeouts.
- **Optimistic concurrency (Recommended):** return `ETag` (entity version) and require `If-Match` on updates; return 412 on mismatch. Or carry `version` in the body and return 409.
- **Long-running work:** return 202 with a status resource (`Location: /jobs/{id}`) instead of holding the request open.

## 6. Versioning & compatibility

- Pick one versioning scheme and keep it: URL prefix (`/api/v1/...`) is simplest. Spring Framework 7 / Boot 4 add first-class API versioning support.
- Additive changes (new optional fields, new endpoints) are non-breaking. Removing/renaming fields, changing types, making fields required, or adding enum values that clients switch on are breaking → new version or a deprecation period (`Deprecation` / `Sunset` headers).
- Avoid enums in response contracts that clients deserialize strictly; document that new values may appear.

## 7. HTTP clients

- Use `RestClient` (Boot 3.2+) or `WebClient`; declarative `@HttpExchange` interfaces for typed clients. `RestTemplate` is in maintenance mode.
- Always set connect and read timeouts; build clients from the auto-configured `RestClient.Builder` so tracing and metrics are applied.
- Handle 4xx/5xx explicitly (`.onStatus(...)`); don't let a downstream 404 become your 500.
- Retry only idempotent requests, with backoff; combine with a circuit breaker.

## 8. Documentation

- Generate OpenAPI with springdoc-openapi (`springdoc-openapi-starter-webmvc-ui`); annotate non-obvious behavior (`@Operation`, `@ApiResponse`). Disable Swagger UI in production or protect it.
- Consider contract tests (Spring Cloud Contract / Pact) between services.
