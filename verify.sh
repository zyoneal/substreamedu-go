#!/usr/bin/env bash
set -euo pipefail

# verify.sh: Definition of Done (DoD) Verification Pipeline for SubStreamEdu
# Executes machine-enforced anti-tamper, spec boundary, Go lint/tests, and Frontend lint/tests.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

echo "=========================================================="
echo "🚀 SubStreamEdu: Running Definition of Done Verification"
echo "=========================================================="

# 1. Anti-Tamper Check
echo "🔍 [1/4] Checking protected tooling and config files..."
"$ROOT_DIR/.harness/scripts/check-protected-files.sh"

# 2. Spec Scope Boundary Check
echo "🔍 [2/4] Validating git diff against active spec scope..."
"$ROOT_DIR/.harness/scripts/check-spec-scope.sh"

# Detect which tiers were touched
GO_TOUCHED=false
FE_TOUCHED=false

MODIFIED=$(git status --porcelain | awk '{print $NF}' || true)
if [ -n "$(git rev-parse --verify origin/main 2>/dev/null || true)" ]; then
  BRANCH_MODS=$(git diff --name-only origin/main...HEAD 2>/dev/null || true)
  ALL_MODS=$(printf "%s\n%s" "$MODIFIED" "$BRANCH_MODS" | sort -u || true)
else
  ALL_MODS="$MODIFIED"
fi

# If no files modified, or full run forced via FULL_VERIFY=true, check both
if [ -z "$ALL_MODS" ] || [ "${FULL_VERIFY:-false}" = "true" ]; then
  GO_TOUCHED=true
  FE_TOUCHED=true
else
  if echo "$ALL_MODS" | grep -qE '^(substreamedu-.*-go|\.golangci|go\.)'; then
    GO_TOUCHED=true
  fi
  if echo "$ALL_MODS" | grep -qE '^substreamedu-frontend'; then
    FE_TOUCHED=true
  fi
  # If harness or specs touched, run both to ensure zero regression
  if echo "$ALL_MODS" | grep -qE '^(context/|\.harness/|verify\.sh|AGENTS\.md)'; then
    GO_TOUCHED=true
    FE_TOUCHED=true
  fi
fi

# 3. Go Microservices Verification
if [ "$GO_TOUCHED" = true ]; then
  echo "🔍 [3/4] Verifying Go Microservices (lint & unit tests)..."
  if command -v golangci-lint &> /dev/null; then
    golangci-lint run ./...
  else
    echo "⚠️  golangci-lint not installed, running go vet..."
    make vet
  fi

  GO_SERVICES=(
    "substreamedu-iam-service-go"
    "substreamedu-dictionary-service-go"
    "substreamedu-media-service-go"
    "substreamedu-notification-service-go"
    "substreamedu-gateway-go"
  )

  for dir in "${GO_SERVICES[@]}"; do
    if [ -d "$dir" ]; then
      echo "  👉 Testing $dir..."
      (cd "$dir" && go test -race -count=1 ./...)
    fi
  done
else
  echo "⏩ [3/4] No Go service files modified. Skipping Go suite."
fi

# 4. Frontend Verification
if [ "$FE_TOUCHED" = true ]; then
  echo "🔍 [4/4] Verifying Frontend Client (tsc, lint, tests)..."
  if [ -d "substreamedu-frontend" ]; then
    (
      cd substreamedu-frontend
      echo "  👉 Running TypeScript type check..."
      npx tsc --noEmit
      echo "  👉 Running linter..."
      npm run lint
      echo "  👉 Running unit tests..."
      npm test -- --watchAll=false
    )
  fi
else
  echo "⏩ [4/4] No Frontend files modified. Skipping Frontend suite."
fi

echo ""
echo "=========================================================="
echo "✅ ALL CHECKS PASSED: State satisfies Definition of Done."
echo "=========================================================="
exit 0
