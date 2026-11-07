---
name: review-diff
description: Review git diff for real, provable bugs only. Checks for logic errors, broken null-safety, silent fallback exceptions, concurrency issues, and broken contracts in Java/Python. Never reports formatting or stylistic bikeshedding.
argument-hint: "[base-branch-or-commit]"
allowed-tools:
  - read
  - grep
  - glob
  - exec
---

# Review diff: high-confidence bug review

Review staged/unstaged changes or PR branch diff for **real runtime bugs only**. Do not guess, do not speculate, and do not report style or formatting opinions.

## 1. Gather context
- If `$ARGUMENTS` provided: inspect `git diff $ARGUMENTS`
- Otherwise: check unstaged (`git diff`) and staged (`git diff --cached`)
- Check status: `git status --short`
- Read recent commit intent: `git log --oneline -5`
- Always read the surrounding method and file context using file read tools, not just isolated diff lines.

## 2. Bug Checklist (Java & Python focus)

### Java & Spring / JVM:
- **Equality**: `==` on objects (Strings, UUIDs, BigDecimals, Long wrappers) instead of `.equals()`.
- **Null Safety**: Optional `.get()` called without `.isPresent()` / `.orElseThrow()`; null dereference in newly added branches.
- **Exception handling**: Catching `Exception` or `Throwable` and returning `null`, empty list or doing nothing without caller distinction ("exception → silent fallback").
- **Transactions**: Missing `@Transactional` on write methods, or `@Transactional` on private/internal calls within the same class (self-invocation bypasses Spring proxy).
- **Hibernate / JPA**: Detached entity mutations, missing cascade/orphan removal, N+1 queries introduced in loops, mutating immutable collections.
- **Concurrency**: Race conditions in shared singleton beans (mutating un-synchronized class-level fields in Spring services).

### Python & FastAPI / AsyncIO:
- **Async pitfalls**: Missing `await` on coroutines; calling blocking I/O inside `async def` without `run_in_executor` / `asyncio.to_thread`.
- **Mutable default arguments**: `def fn(items=[])` or `def fn(config={})`.
- **None handling**: `if not obj:` when `obj` can be a valid falsy value (`0`, `""`, `[]`, `False`); missing `is None` checks.
- **Exception silencing**: `except Exception: pass` or bare `except:` hiding database connection drops or critical errors.
- **Type mismatch**: Passing unparsed string dates/UUIDs where ORM / domain models expect typed objects.

### Cross-cutting Microservice bugs:
- **Contract violations**: Renamed, deleted or re-typed fields in request/response DTOs breaking backward compatibility.
- **Data loss / Silent Overwrites**: Missing WHERE clause conditions; partial DTO updates overwriting omitted fields with null.
- **Lost tracing**: Spawning background threads/tasks without propagating MDC / tracing context.

## 3. Reporting standard

Report ONLY if all three conditions are met:
1. It is directly caused by the diff (not pre-existing).
2. It has concrete, provable runtime impact.
3. The impact can be demonstrated with a failing test case or exact input.

### Output format
If bugs found:
```markdown
### Diff review: N issue(s) found

1. **[short title]** `[critical | high | medium]`
   - File: `path/to/File.ext:line`
   - Problem: Concrete technical explanation
   - Runtime impact: What fails, who is affected
   - Evidence: `quote diff lines`
```

If clean:
```markdown
### Diff review: No confirmed bugs found.
```
