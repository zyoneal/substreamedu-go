#!/usr/bin/env bash
set -euo pipefail

# check-spec-scope.sh
# Enforces that all modified files in the working copy or branch match the
# "Allowed files" declared in the active spec under docs/specs/, or complies with Fast-Path (<= 100 LOC).

ROOT_DIR="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT_DIR"

# 1. Gather all modified files
MODIFIED_FILES=$(git status --porcelain | sed -E 's/^.. //; s/^"//; s/"$//' || true)

if [ -n "$(git rev-parse --verify origin/main 2>/dev/null || true)" ]; then
  BRANCH_FILES=$(git diff --name-only origin/main...HEAD 2>/dev/null || true)
  ALL_MODIFIED=$(printf "%s\n%s" "$MODIFIED_FILES" "$BRANCH_FILES" | sort -u | grep -v '^$' || true)
else
  ALL_MODIFIED="$MODIFIED_FILES"
fi

if [ -z "$ALL_MODIFIED" ]; then
  echo "✅ No files modified. Scope check clean."
  exit 0
fi

# 2. Check if an active spec exists in docs/specs/
# Look for specs matching branch name, or recently touched specs in docs/specs/
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
ACTIVE_SPEC=""

SPEC_DIRS=("context/feature_specs" "docs/specs")

for sdir in "${SPEC_DIRS[@]}"; do
  if [ -d "$sdir" ] && [ -z "$ACTIVE_SPEC" ]; then
    TICKET_ID=$(echo "$CURRENT_BRANCH" | grep -oE '[A-Z0-9]+-[0-9]+|[0-9]+' | head -1 || true)
    if [ -n "$TICKET_ID" ]; then
      ACTIVE_SPEC=$(find "$sdir" -type f -name "*${TICKET_ID}*.md" 2>/dev/null | head -1 || true)
    fi
  fi
done

if [ -z "$ACTIVE_SPEC" ]; then
  ACTIVE_SPEC=$(echo "$ALL_MODIFIED" | grep -E '^(context/feature_specs|docs/specs)/.*\.md$' | head -1 || true)
fi


# 3. Handle Fast-Path if no spec found
if [ -z "$ACTIVE_SPEC" ] || [ ! -f "$ACTIVE_SPEC" ]; then
  echo "ℹ️  No active spec file found in docs/specs/. Evaluating under Fast-Path rules (≤ 100 LOC)..."
  
  # Calculate total LOC touched (insertions + deletions)
  if [ -n "$(git rev-parse --verify origin/main 2>/dev/null || true)" ]; then
    DIFF_STAT=$(git diff --shortstat origin/main...HEAD 2>/dev/null || true)
  else
    DIFF_STAT=$(git diff --shortstat HEAD 2>/dev/null || true)
  fi

  # Parse insertions and deletions: e.g. "2 files changed, 45 insertions(+), 12 deletions(-)"
  INSERTIONS=$(echo "$DIFF_STAT" | grep -oE '[0-9]+ insertion' | awk '{print $1}' || echo "0")
  DELETIONS=$(echo "$DIFF_STAT" | grep -oE '[0-9]+ deletion' | awk '{print $1}' || echo "0")
  TOTAL_LOC=$(( ${INSERTIONS:-0} + ${DELETIONS:-0} ))

  if [ "$TOTAL_LOC" -gt 100 ]; then
    echo "❌ ERROR: Fast-Path scope exceeded! Modified $TOTAL_LOC lines (> 100 LOC limit)."
    echo "Tasks touching more than 100 lines MUST have a spec created in docs/specs/ (Rule 2 / Ship Task)."
    echo "Use the 'spec-writer' skill to draft an approved specification with an 'Allowed files' boundary."
    exit 1
  fi

  echo "✅ Fast-Path verified: $TOTAL_LOC lines changed (within 100 LOC limit)."
  exit 0
fi

# 4. Spec Found: Parse "Allowed files" section
echo "📄 Found active spec: $ACTIVE_SPEC"
ALLOWED_PATTERNS=()
IN_ALLOWED_SECTION=false

while IFS= read -r line; do
  if [[ "$line" =~ ^##[[:space:]]+.*[Aa]llowed[[:space:]]+[Ff]iles ]]; then
    IN_ALLOWED_SECTION=true
    continue
  fi

  if [ "$IN_ALLOWED_SECTION" = true ]; then
    # Stop when next section begins
    if [[ "$line" =~ ^##[[:space:]]+ ]]; then
      break
    fi
    # Extract backtick pattern: e.g. - `src/main/java/**` -> src/main/java/**
    if [[ "$line" =~ \`([^\`]+)\` ]]; then
      ALLOWED_PATTERNS+=("${BASH_REMATCH[1]}")
    fi
  fi
done < "$ACTIVE_SPEC"

if [ ${#ALLOWED_PATTERNS[@]} -eq 0 ]; then
  echo "❌ ERROR: Active spec $ACTIVE_SPEC has no patterns listed under '## Allowed files'!"
  echo "Please define explicit file boundaries in the spec."
  exit 1
fi

# Always permit the spec itself, test reports, and scout output
ALLOWED_PATTERNS+=("$ACTIVE_SPEC" "context/feature_specs/*" "docs/specs/*" "docs/adr/*" "docs/scout/*")


# 5. Check each modified file against allowed patterns
OUT_OF_BOUNDS=()

while IFS= read -r file || [ -n "$file" ]; do
  [ -z "$file" ] && continue
  MATCHED=false
  for pattern in "${ALLOWED_PATTERNS[@]}"; do
    clean_p="${pattern//\*\*/\*}"
    prefix_p="${pattern%%\**}"
    if [ "$file" = "$pattern" ] || [[ "$file" == $clean_p ]] || [ -n "$prefix_p" -a "${file#$prefix_p}" != "$file" ]; then
      MATCHED=true
      break
    fi
  done
  if [ "$MATCHED" = false ]; then
    OUT_OF_BOUNDS+=("$file")
  fi
done <<< "$ALL_MODIFIED"



if [ ${#OUT_OF_BOUNDS[@]} -gt 0 ]; then
  echo "❌ ERROR: Spec boundary violation! (Zero Cross-Boundary Contamination)"
  echo "The following modified files are NOT permitted by $ACTIVE_SPEC:"
  for f in "${OUT_OF_BOUNDS[@]}"; do
    echo "  - $f"
  done
  echo ""
  echo "If these changes are genuinely necessary, update '## Allowed files' in the spec first with justification."
  exit 1
fi

echo "✅ All modified file(s) strictly match Allowed files in $ACTIVE_SPEC."
exit 0

