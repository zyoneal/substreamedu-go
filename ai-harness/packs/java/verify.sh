#!/usr/bin/env bash
set -euo pipefail

# verify.sh (Java / Gradle)
# Single-command Definition of Done (DoD) verification.

echo "=========================================================="
echo "🚀 Running ai-harness Verification (Java / Gradle)"
echo "=========================================================="

ROOT_DIR="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
HARNESS_DIR="$ROOT_DIR/.harness"

# Step 1: Anti-Tamper Check
echo "🔍 [1/4] Checking protected tooling files..."
"$HARNESS_DIR/scripts/check-protected-files.sh"

# Step 2: Spec Scope Boundary Check
echo "🔍 [2/4] Checking file boundaries against active spec..."
"$HARNESS_DIR/scripts/check-spec-scope.sh"

# Step 3: Gradle Code Hygiene (Spotless & Checkstyle)
echo "🔍 [3/4] Running code formatting & style analysis..."
if [ -f "$ROOT_DIR/gradlew" ]; then
  GRADLE_CMD="$ROOT_DIR/gradlew"
else
  GRADLE_CMD="gradle"
fi

# Run spotless check if plugin exists in build
if "$GRADLE_CMD" tasks --all 2>/dev/null | grep -q 'spotlessCheck'; then
  "$GRADLE_CMD" spotlessCheck --no-daemon -q
fi

# Step 4: Full Compilation, Static Analysis & Tests
echo "🔍 [4/4] Compiling and running tests..."
"$GRADLE_CMD" check --no-daemon --build-cache

echo ""
echo "=========================================================="
echo "✅ ALL CHECKS PASSED: Task is clean and meets Definition of Done."
echo "=========================================================="
exit 0
