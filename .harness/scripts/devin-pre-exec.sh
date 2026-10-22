#!/usr/bin/env bash
# devin-pre-exec.sh
# Devin CLI PreToolUse hook for "exec" tool.
# Blocks destructive git commands, mass process killing, and tampering.
# Exits with 2 to block the command, or 0 to allow.

INPUT=$(cat)

# Extract command string using python or grep/sed
CMD=$(echo "$INPUT" | grep -oE '"command":\s*"[^"]+"' | head -1 | sed -E 's/"command":\s*"//; s/"$//' || true)

if [ -z "$CMD" ]; then
  exit 0
fi

# 1. Block destructive git commands
if echo "$CMD" | grep -qE 'git\s+(reset\s+--hard|clean\s+-[a-zA-Z]*f|checkout\s+--\s+\.|checkout\s+\.\s*$|push\s+.*--force|commit\s+.*--no-verify)'; then
  echo '{"decision": "block", "reason": "Destructive git command blocked by ai-harness policy (Rule 5: No unlanded work tear down, no --no-verify)."}'
  exit 2
fi

# 2. Block blanket process kills
if echo "$CMD" | grep -qE '\b(pkill|killall)\b'; then
  echo '{"decision": "block", "reason": "Blanket process termination (pkill/killall) blocked. Target only specific PIDs started by this session."}'
  exit 2
fi

# 3. Block tampering with protected tooling files via shell
if echo "$CMD" | grep -qE '(rm|sed|awk|echo|cat|truncate|cp|mv)\s+.*(build\.gradle|pom\.xml|pyproject\.toml|checkstyle\.xml|ruff\.toml|\.devin/hooks)'; then
  # Allow read-only cat/grep
  if ! echo "$CMD" | grep -qE '^\s*(cat|grep|head|tail|less)\b'; then
    if [ "${ALLOW_PROTECTED_CHANGES:-false}" != "true" ]; then
      echo '{"decision": "block", "reason": "Tampering with build/linter/harness configuration via shell is blocked (Anti-Tamper Rule)."'
      exit 2
    fi
  fi
fi

exit 0
