---
description: Review git diff for real bugs. Optionally pass a base branch/commit, defaults to develop.
argument-hint: "[base-branch-or-commit]"
allowed-tools: Bash(git diff:*), Bash(git log:*), Bash(git show:*), Bash(git status:*), Read
---

Review the staged/unstaged diff for real bugs only. Do NOT guess or speculate. Report only issues you can justify confidently from the diff and git-visible context.

## Steps

1. Get the diff and context:
   - If `$ARGUMENTS` provided: `git diff $ARGUMENTS`
   - Otherwise: `git diff` (unstaged) and `git diff --cached` (staged)
   - Run: `git status --short`
   - Run: `git log --oneline -10` — understand recent intent and branch direction
   - Run: `git diff -U50` (or with $ARGUMENTS) — use wide context

2. Inspect changes with context:
   - For non-trivial changes, read the full method/class using Read tool
   - Prioritize files where logic, validation, or control flow changed
   - Do not rely only on diff lines — understand surrounding behavior

3. Analyze for bugs. Focus on:
   - Logic errors and incorrect conditionals
   - Inverted boolean logic or changed condition semantics
   - Null pointer risks introduced by this change
   - Exception replaced by silent fallback
   - Removed or weakened validation, authorization, sanitization
   - Data loss or silent overwrites
   - Lost fields during object rebuild / copy / builder migration
   - Changed defaults, early returns, or comparison semantics
   - Equality changes (== vs equals, null safety)
   - Concurrency issues (only when explicitly evidenced)
   - Security issues

4. For each candidate issue, ask:
   - Is this definitely caused by this diff (not pre-existing)?
   - What is the concrete runtime impact?
   - Can the impact be observed from this code path?
   - For "exception → silent fallback": what does the caller receive and can it distinguish error from success?
   - Does the git log suggest this was intentional?

5. Reporting threshold:
   - Treat as high-priority and review carefully:
      - Exception → silent fallback
      - Removed validation / authorization / sanitization
   - Report them if they can lead to incorrect or unsafe behavior
   - For other categories: report only when runtime impact is clear and concrete
   - If a change looks suspicious but cannot be proven incorrect from the diff and context, do NOT report it
   - Prefer fewer high-confidence findings over a longer speculative list

## Output format

---
**Diff review**

Found N issue(s):

1. **[short title]** `[critical / high / medium]`
   - File: `path/to/File.java` (line ~N)
   - Problem: [concrete explanation]
   - Impact: [what breaks at runtime, who is affected]
   - Caller impact: [what does the caller receive — can it detect the failure?]
   - Evidence: [quote the relevant diff lines]

---

If no issues:

---
**Diff review**

No confirmed bugs found.

---

## Severity guideline
- critical — data loss, security issue, or guaranteed incorrect behavior
- high — likely incorrect behavior in common scenarios
- medium — edge-case incorrect behavior

## Rules
- Do NOT report style, formatting, tests, or documentation issues
- Do NOT report pre-existing issues
- Do NOT report compiler/import errors
- Do NOT suggest fixes unless a bug is confirmed
- Do NOT rely on assumptions about unseen code