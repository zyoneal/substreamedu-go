#!/usr/bin/env bash
set -euo pipefail

# verify.sh (Python)
# Single-command Definition of Done (DoD) verification.

echo "=========================================================="
echo "🚀 Running ai-harness Verification (Python)"
echo "=========================================================="

ROOT_DIR="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
HARNESS_DIR="$ROOT_DIR/.harness"

# Step 1: Anti-Tamper Check
echo "🔍 [1/5] Checking protected tooling files..."
"$HARNESS_DIR/scripts/check-protected-files.sh"

# Step 2: Spec Scope Boundary Check
echo "🔍 [2/5] Checking file boundaries against active spec..."
"$HARNESS_DIR/scripts/check-spec-scope.sh"

# Helper for running with uv or poetry or venv
RUN_CMD="uv run"
if ! command -v uv &> /dev/null; then
  if command -v poetry &> /dev/null; then
    RUN_CMD="poetry run"
  else
    RUN_CMD=""
  fi
fi

# Step 3: Linting & Code Style (Ruff)
echo "🔍 [3/5] Running Ruff linter and format validation..."
$RUN_CMD ruff check .
$RUN_CMD ruff format --check .

# Step 4: Strict Type Checking & Architectural Layering
echo "🔍 [4/5] Running static type checks (Mypy)..."
$RUN_CMD mypy .

if [ -f "$ROOT_DIR/.importlinter" ]; then
  echo "🔍 [4b/5] Checking layer import contracts..."
  $RUN_CMD lint-imports
fi

# Step 5: Test Suite Execution
echo "🔍 [5/5] Running Pytest test suite..."
$RUN_CMD pytest -q

echo ""
echo "=========================================================="
echo "✅ ALL CHECKS PASSED: Task is clean and meets Definition of Done."
echo "=========================================================="
exit 0
