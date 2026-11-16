# Security Rules (Java + Spring Boot)

All Mandatory unless noted. Treat every user-controlled input (params, headers, body, cookies, files, stored data) as hostile.

## Contents
1. Injection (SQL, command, XML/XXE, expression, LDAP)
2. Output & browser (XSS, CSRF, CORS, open redirect, cookies)
3. Server-side requests & files (SSRF, upload, path traversal)
4. Authentication & authorization (Spring Security, JWT, IDOR, Actuator)
5. Input binding & abuse (mass assignment, rate limiting, headers)
6. Secrets, crypto, randomness
7. Serialization
8. Hardening & dependencies

---

## 1. Injection

- **SQL injection:** MyBatis `#{}` only — `${}` is forbidden for user input. JPA/JDBC: bind parameters (`:name`, `?`), never string concatenation. JPQL built with `+` is just as injectable as SQL. For dynamic `ORDER BY` / column names, map user input to a whitelist of known columns (`Sort.by` with validated property names). `LIKE`: `CONCAT('%', #{kw}, '%')` (escape `%`/`_` if needed). `IN`: `<foreach>` with `#{item}`.
- **Command execution:** never pass user input into `Runtime.exec` / `ProcessBuilder` through a shell (`sh -c`). Use the argument-array form with validated values, or remove the feature.
- **XML injection & XXE:** disable DTDs/external entities on every parser (`DocumentBuilderFactory`, `SAXParserFactory`, `XMLInputFactory`, `TransformerFactory`, `SAXReader`):
  ```java
  dbf.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
  dbf.setXIncludeAware(false);
  dbf.setExpandEntityReferences(false);
  ```
  Escape values before inserting into XML/XPath.
- **Expression / dynamic code:** no SpEL, OGNL, Groovy, JS, or template evaluation on user input. Never `new SpelExpressionParser().parseExpression(userInput)`; if unavoidable, evaluate with `SimpleEvaluationContext`. Don't let users supply Thymeleaf/Freemarker template content.
- **LDAP injection:** escape input before building filters (`LdapEncoder.filterEncode`) or use `LdapQueryBuilder`.
- **Log injection (Recommended):** strip CR/LF from user input written to logs, or use structured JSON logging.

## 2. Output & browser

- **XSS:** escape all user-controlled output per context (HTML body, attribute, JS, CSS, URL). Thymeleaf `th:text` escapes; `th:utext` does not. For rich text, sanitize with an allowlist (OWASP Java HTML Sanitizer / jsoup `Safelist`). Set a Content-Security-Policy header (`http.headers(h -> h.contentSecurityPolicy(...))`).
- **CSRF:** keep Spring Security CSRF protection on for cookie/session-authenticated apps. Disabling it is acceptable only for stateless Bearer-token APIs. Never use GET for state changes. Add a second factor for high-risk operations.
- **CORS:** never `allowedOrigins("*")` together with credentials. Configure a `CorsConfigurationSource` bean with an explicit origin list, methods, and headers.
- **Open redirect:** validate redirect targets against an allowlist of domains/paths; prefer relative paths.
- **Cookies:** session cookies `HttpOnly`, `Secure`, `SameSite=Lax` (or `Strict`) via `server.servlet.session.cookie.*`.
- **Error responses:** never return stack traces, SQL, or internal class names to clients (`server.error.include-stacktrace=never`, `include-message=never` unless messages are curated).

## 3. Server-side requests & files

- **SSRF:** when fetching user-supplied URLs, allowlist hosts and schemes (`https` only); resolve DNS and reject private, loopback, link-local and cloud-metadata addresses (`169.254.169.254`, `fd00::/8`); disable redirects or re-validate each hop; validate the resolved IP at connect time (DNS rebinding). Risk surfaces: webhooks, URL previews, image/PDF fetchers, import-from-URL, XML/SVG parsers.
- **File upload:** limit size (`spring.servlet.multipart.max-file-size`, `max-request-size`), allowlist extensions *and* check content type/magic bytes (Apache Tika), generate server-side file names, store outside the web root (object storage with private ACLs + signed URLs preferred), and scan files that are redistributed to other users. Serve user files with `Content-Disposition: attachment` and `X-Content-Type-Options: nosniff`.
- **Path traversal:** reject `..`, absolute paths, and control/NUL characters; resolve with `base.resolve(name).normalize()` and verify the result `startsWith(base)`. Use `FilenameUtils.getName()` to strip directories.

## 4. Authentication & authorization

- **Use Spring Security; don't roll your own.** Deny by default: `authorizeHttpRequests(a -> a.requestMatchers("/public/**").permitAll().anyRequest().authenticated())`. Enable method security (`@EnableMethodSecurity`) and use `@PreAuthorize`.
- **JWT / OAuth2:** use `spring-boot-starter-oauth2-resource-server`; validate signature, `iss`, `aud`, `exp`. Never accept `alg: none` or decode JWTs without verification. Keep access tokens short-lived; don't store tokens in `localStorage` for browser apps if you can use HttpOnly cookies. Don't put sensitive data in JWT claims (they're only base64).
- **Passwords:** `PasswordEncoderFactories.createDelegatingPasswordEncoder()` (BCrypt/Argon2). Lock out or throttle repeated failed logins. Return the same error for "unknown user" and "wrong password".
- **Horizontal privilege (IDOR):** verify the current user owns/may access every resource ID they pass — `@PreAuthorize("@orderSecurity.isOwner(#orderId, authentication)")` or filter queries by owner (`findByIdAndOwnerId`). Prefer non-enumerable public IDs (UUIDs).
- **Vertical privilege:** admin/ops endpoints need explicit role checks. Being on the internal network is not authorization.
- **Actuator:** expose only `health` and `info` publicly (`management.endpoints.web.exposure.include=health,info`); secure the rest behind an admin role or a separate management port. `/actuator/env`, `/heapdump`, `/loggers` leak secrets or allow takeover.
- **Session fixation:** keep Spring Security's default session-fixation protection; invalidate sessions on logout.

## 5. Input binding & abuse

- **Mass assignment:** never bind request bodies directly onto JPA entities (`@RequestBody User user` → client can set `role`, `id`, `balance`). Bind to a request DTO/record with only the allowed fields, then map.
- **Validation:** validate every request DTO with Bean Validation (`@Valid`, `@NotBlank`, `@Size`, `@Pattern`, `@Positive`); cascade into nested objects with `@Valid` on the field. Bound collection sizes (`@Size(max = 100)`) to prevent resource exhaustion.
- **Rate limiting (Recommended):** throttle login, OTP, password reset, and expensive endpoints (Bucket4j, Resilience4j `@RateLimiter`, or the API gateway).
- **HTTP headers are untrusted:** `Host`, `User-Agent`, `X-Forwarded-For`, `Referer`, and cookies can be forged. Don't base auth decisions on them. For the client IP behind a proxy, configure `server.forward-headers-strategy=framework` with trusted proxies instead of reading `X-Forwarded-For` directly. Don't build absolute URLs (e.g. password reset links) from the `Host` header — use configured base URLs.
- **Regex DoS (Recommended):** avoid nested quantifiers (`(a+)+`) on user input; bound input length before matching.

## 6. Secrets, crypto, randomness

- **Secrets:** no hardcoded passwords, API keys, tokens, or connection strings in code, committed config, or logs. Use environment variables, Spring Cloud Vault, or a cloud secrets manager. Exclude secrets from `toString()` (Lombok `@ToString.Exclude`) and mask them in logs. Wipe `char[]` passwords after use.
- **Cryptography:** passwords → BCrypt/Argon2 (never MD5/SHA-1/plain SHA-256). Symmetric → AES-GCM with a random 12-byte IV per message (never ECB, never a static IV). Asymmetric → RSA ≥ 2048 / EC P-256+. MAC → HMAC-SHA256. MD5/SHA-1 never for security purposes. Compare MACs/tokens with `MessageDigest.isEqual` (constant time).
- **Randomness:** `SecureRandom` for tokens, IDs, OTPs, salts; never `java.util.Random` / `Math.random()` / `ThreadLocalRandom`.
- **TLS:** don't disable certificate or hostname verification (trust-all `TrustManager`), even "temporarily".

## 7. Serialization

- **Sensitive data:** mark keys/credentials/PII `transient` (Java serialization) or `@JsonIgnore` / `@JsonProperty(access = WRITE_ONLY)` (Jackson). Use separate response DTOs rather than serializing entities.
- **Deserialization:** never Java-deserialize untrusted data; if forced, use an `ObjectInputFilter` allowlist. Don't enable Jackson default typing (`activateDefaultTyping`) or `@JsonTypeInfo(use = Id.CLASS)` on untrusted input. Same caution for XStream, Kryo, Hessian, SnakeYAML (use `SafeConstructor`).
- **Serialization method signatures:** `readObject`/`writeObject` must be `private`; replicate constructor validation inside `readObject`.

## 8. Hardening & dependencies — Recommended

- Scan dependencies (OWASP Dependency-Check, Snyk, Dependabot/Renovate); keep Spring Boot on a supported, patched version.
- Minimize visibility (private fields, final immutables, package-private internals); security-sensitive classes `final`.
- Synchronize on a private lock object, not `this` or `getClass()`.
- Run containers as non-root with a read-only filesystem where possible.
