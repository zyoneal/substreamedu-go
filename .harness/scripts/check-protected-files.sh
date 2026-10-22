#!/usr/bin/env bash
set -euo pipefail

# check-protected-files.sh
# Verifies that no tooling or compliance configuration was modified by the agent.

if [ "${ALLOW_PROTECTED_CHANGES:-false}" = "true" ]; then
  echo "⚠️  ALLOW_PROTECTED_CHANGES=true is set: skipping protected files check."
  exit 0
fi

HARNESS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ROOT_DIR="$(cd "$HARNESS_DIR/.." && pwd)"
PROTECTED_LIST="$HARNESS_DIR/protected-files"

if [ ! -f "$PROTECTED_LIST" ]; then
  echo "⚠️  No protected-files list found at $PROTECTED_LIST, skipping."
  exit 0
fi

# Detect modified files (staged, unstaged, and vs main if in git)
MODIFIED_FILES=$(git status --porcelain | sed -E 's/^.. //; s/^"//; s/"$//' || true)

if [ -n "$(git rev-parse --verify origin/main 2>/dev/null || true)" ]; then
  BRANCH_FILES=$(git diff --name-only origin/main...HEAD 2>/dev/null || true)
  ALL_MODIFIED=$(printf "%s\n%s" "$MODIFIED_FILES" "$BRANCH_FILES" | sort -u | grep -v '^$' || true)
else
  ALL_MODIFIED="$MODIFIED_FILES"
fi

VIOLATIONS=()

while IFS= read -r pattern || [ -n "$pattern" ]; do
  # Trim whitespace and skip comments/empty lines
  pattern=$(echo "$pattern" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')
  [ -z "$pattern" ] && continue
  [[ "$pattern" =~ ^# ]] && continue

  while IFS= read -r file || [ -n "$file" ]; do
    [ -z "$file" ] && continue
    # Exact match, directory prefix match, or glob match
    if [ "$file" = "$pattern" ] || [[ "$file" == "$pattern"/* ]] || [[ "$file" == "$pattern" ]]; then
      VIOLATIONS+=("$file (matches protected: $pattern)")
    fi
  done <<< "$ALL_MODIFIED"
done < "$PROTECTED_LIST"


if [ ${#VIOLATIONS[@]} -gt 0 ]; then
  echo "❌ ERROR: Tooling / protected files were modified! (Anti-Tamper Guard Violation)"
  echo "AI agents are forbidden from altering build configs, linters, or harness rules to force checks to pass."
  echo ""
  echo "Offending files:"
  for v in "${VIOLATIONS[@]}"; do
    echo "  - $v"
  done
  echo ""
  echo "If this is a deliberate human chore task, rerun with ALLOW_PROTECTED_CHANGES=true"
  exit 1
fi

echo "✅ Protected files check passed (zero tooling config tampering)."
exit 0
