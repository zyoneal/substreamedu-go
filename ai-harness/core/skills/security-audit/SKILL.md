---
name: security-audit
description: Report-only security audit and vulnerability assessment for Java and Python microservices. Detects OWASP Top 10, SQL injection, SSRF, Deserialization, Path Traversal, and credential leaks. Never modifies code directly.
argument-hint: "[directory or file path]"
allowed-tools:
  - read
  - grep
  - glob
---

# Security Audit: Report-Only Vulnerability Scanner

> [!IMPORTANT]
> **REPORT-ONLY MODE ENFORCED**
> The auditor NEVER alters code or fixes vulnerabilities directly. Doing so invalidates the audit and risks introducing untested regressions. Output is delivered as a structured Markdown vulnerability report.

---

## 1. Vulnerability Checklist by Tech Stack

### A. General & Secrets (Java & Python)
- **Hardcoded secrets**: API keys, JWT secrets, passwords, cloud tokens (`AKIA...`, `Bearer ...`).
- **Committed secret files**: `.env`, `id_rsa`, `.pem`, keystores (`.jks`, `.p12`).
- **Unverified command execution**: Shell execution (`Runtime.getRuntime().exec()`, `ProcessBuilder`, `subprocess.run(shell=True)`, `os.system()`).

### B. Java Microservices (Spring Boot / Micronaut / JPA)
- **SQL / JPQL Injection**: String concatenation in `EntityManager.createQuery()`, `JdbcTemplate.query()`, or native queries (`@Query(value = "SELECT * FROM ... " + var, nativeQuery = true)`).
- **Insecure Deserialization**: `ObjectInputStream.readObject()`, untyped Jackson polymorphics (`enableDefaultTyping()`, `@JsonTypeInfo(use = Id.CLASS)`), unsafe XML parsing (`DocumentBuilderFactory` without disabling external entities - XXE).
- **SSRF**: Unvalidated user URLs passed to `RestTemplate`, `WebClient`, or `HttpClient`.
- **Path Traversal**: Direct file serving or writing using untrusted path variables without canonicalization (`Path.normalize()`, verifying `startsWith(baseDir)`).
- **Insecure TLS / Auth**: `TrustAllCerts`, `NoopHostnameVerifier`, disable CSRF without proper stateless JWT protections, unauthenticated actuator endpoints.

### C. Python Microservices (FastAPI / Flask / SQLAlchemy)
- **SQL Injection**: Raw SQL queries using string formatting (`session.execute(f"SELECT * FROM {table}")`).
- **SSRF**: Passing arbitrary user URLs to `requests.get()`, `httpx.get()`, `urllib.request`.
- **Insecure Deserialization**: `pickle.loads()`, `yaml.load()` without `SafeLoader`, `shelve`.
- **Path Traversal**: Unchecked filename parameters in `open()`, `shutil.copy()`, `FileResponse()`.
- **CORS & Auth**: Overly permissive CORS (`allow_origins=["*"]` with `allow_credentials=True`), weak JWT algorithm configuration (`algorithms=["none"]`).

---

## 2. Audit Workflow

1. **Scan target**: Inspect the files specified in `$ARGUMENTS` or all modified files in the active branch.
2. **Verify exploitability**: Prove how an attacker could trigger the vulnerability from the public interface (HTTP request, Kafka message, etc.).
3. **Draft remediation**: Write the exact minimal diff that resolves the issue securely.

---

## 3. Output Format

```markdown
# Security Audit Report

- **Target**: <paths scanned>
- **Status**: Vulnerabilities Found / Clean

## Findings

### 1. [Vulnerability Title]
- **Severity**: Critical | High | Medium | Low
- **CWE / OWASP**: e.g., CWE-89 (SQL Injection) / OWASP A03:2021
- **Location**: `path/to/File.ext:line`
- **Exploit Vector**: Concrete explanation of how an untrusted input reaches this sink.
- **Vulnerable Code**:
  ```code
  // exact snippet
  ```
- **Recommended Fix**:
  ```diff
  - vulnerable_code()
  + secure_parameterized_code()
  ```

---
*(If no issues found)*
## Result: Zero vulnerabilities detected across the audited files.
```
