---
name: security-audit
description: |
  Comprehensive security audit and vulnerability assessment for Go microservices and React/TypeScript frontend. Evaluates code against OWASP Top 10, secrets leakage, GORM SQL injection, XSS, and SSRF.

  Use this skill to:
  - Perform structured, report-only security audits of new features, endpoints, or PR diffs.
  - Detect hardcoded secrets, API tokens, and committed environment variables.
  - Identify Go backend vulnerabilities: GORM raw queries, path traversal, InsecureSkipVerify, unvalidated SSRF.
  - Identify React frontend vulnerabilities: unsanitized HTML, DOM mutation, insecure token handling.
  - Produce an actionable, prioritized vulnerability report without modifying code directly.

  Do NOT use this skill for:
  - Applying fixes in the same pass (security review is strictly REPORT-ONLY).
user-invocable: true
paths: ["**/*.go", "**/*.ts", "**/*.tsx", "**/*.yaml", "**/*.json"]
---

# Security Audit Protocol & Vulnerability Patterns

This skill establishes the security audit standard for SubStreamEdu across all Go backend services and the React frontend.

---

## 1. Operating Principle: Report-Only Mode

> [!IMPORTANT]
> **The Security Reviewer MUST NOT edit source code directly.**
>
> An auditor who modifies code reviews their own fixes, risks introducing untested logic, and bypasses the developer's architectural context.
> - **Audit Pass**: Identifies vulnerabilities, assigns severity, proves exploitability, and prescribes the exact remediation in a markdown report.
> - **Fix Pass**: The responsible service architect or developer implements the prescribed fix with a minimal diff.
> - **Verification Pass**: QA / test suites are executed to ensure tests pass and regressions are prevented.

---

## 2. Core Detection Patterns

### A. Secrets & Credentials (All Languages)
- **Private Keys**: `-----BEGIN (RSA |DSA |EC |OPENSSH |PGP )?PRIVATE KEY`
- **Cloud Provider Tokens**: `AKIA[0-9A-Z]{16}`, `AIza[0-9A-Za-z_-]{35}`, `aws_secret_access_key`
- **Credential Literals**: Hardcoded `password`, `api_key`, `secret`, `jwt_secret` assigned to non-placeholder string literals.
- **Tracked `.env` files**: `.env`, `.env.production` committed to git rather than `.env.example`.
- **Command Shell Pipes**: `curl ... | bash` or unverified script executions in Dockerfiles or scripts.

### B. Go Microservices Vulnerabilities
- **GORM SQL Injection**:
  ```go
  // ❌ Vulnerable: direct string interpolation in query
  db.Where(fmt.Sprintf("username = '%s'", input))
  db.Raw("SELECT * FROM cards WHERE deck_id = " + deckID)

  // ✅ Secure: parameterized binding
  db.Where("username = ?", input)
  db.Raw("SELECT * FROM cards WHERE deck_id = ?", deckID)
  ```
- **Insecure TLS Transport**:
  - `InsecureSkipVerify: true` in `http.Transport` or `tls.Config`.
- **Path Traversal in Media / File Uploads**:
  - Using raw user-supplied filenames in `os.Open` or `filepath.Join`.
  - Must use `filepath.Clean`, check `strings.HasPrefix`, or generate a randomized UUID on disk.
- **SSRF (Server-Side Request Forgery)**:
  - In video downloading or external subtitle fetching handlers: fetching URLs from untrusted user input without verifying scheme (`http`/`https`) and banning internal IP ranges (`127.0.0.1`, `10.0.0.0/8`, `192.168.0.0/16`, AWS metadata `169.254.169.254`).
- **Authorization Bypass**:
  - Querying entities without validating ownership: `db.First(&card, cardID)` vs `db.Where("id = ? AND user_id = ?", cardID, authUserID).First(&card)`.

### C. React / TypeScript Frontend Vulnerabilities
- **Cross-Site Scripting (XSS)**:
  - `dangerouslySetInnerHTML` without sanitization via `DOMPurify.sanitize(...)`.
  - Direct DOM mutation: `ref.current.innerHTML = ...`.
- **Insecure Token & Session Storage**:
  - Storing sensitive authentication tokens or refresh tokens in `localStorage` instead of `HttpOnly`, `SameSite=Strict` cookies.
- **Open Redirects**:
  - Unvalidated redirection paths: `window.location.href = searchParams.get('return_to')` without verifying it begins with a single leading `/` and not `//` or an external protocol.

---

## 3. Security Audit Report Format

When executing a security audit, format findings using the standardized report structure:

```markdown
# Security Audit Report: [Module / Service Name]

## Executive Summary
- **Audit Date**: YYYY-MM-DD
- **Target Files / Diffs**: [List of paths]
- **Findings Count**: Critical: 0 | High: 1 | Medium: 1 | Low: 0
- **Overall Assessment**: [PASS / PASS WITH REMEDIATION / BLOCKED]

---

## Findings Detail

### [SEC-01] [SEVERITY: HIGH] GORM SQL Injection in Subtitle Search
- **Location**: `substreamedu-course-go/internal/service/subtitle.go:L142`
- **Rule**: `go_sql_injection_string_concat`
- **Vulnerability Description**:
  User-supplied search keyword is concatenated directly into the `db.Raw()` query string.
- **Proof of Concept / Risk**:
  An attacker can pass `'; DROP TABLE subtitles; --` to compromise database integrity.
- **Prescribed Remediation**:
  Use parameterized placeholder:
  ```go
  - db.Raw(fmt.Sprintf("SELECT * FROM subtitles WHERE content LIKE '%%%s%%'", query))
  + db.Raw("SELECT * FROM subtitles WHERE content LIKE ?", "%"+query+"%")
  ```

---

## Remediation Workflow
1. Developer applies prescribed fixes in branch.
2. QA executes `go test -v ./...` and `npm test`.
3. Security re-scans diff to verify closure.
```
