#!/usr/bin/env bash
set -euo pipefail

# install.sh
# Installs ai-harness into a target Java or Python microservice repository.
#
# Usage:
#   ./install.sh --pack <java|python> [--target <path>] [--name <service-name>]
#
# Example:
#   cd /path/to/my-service
#   /path/to/ai-harness/install.sh --pack java --name order-service

HARNESS_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET_DIR="$(pwd)"
PACK=""
SERVICE_NAME=""
HARNESS_VERSION="1.0.0"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --pack)
      PACK="$2"
      shift 2
      ;;
    --target)
      TARGET_DIR="$2"
      shift 2
      ;;
    --name)
      SERVICE_NAME="$2"
      shift 2
      ;;
    -h|--help)
      echo "Usage: ./install.sh --pack <java|python> [--target <path>] [--name <service-name>]"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

if [ -z "$PACK" ]; then
  echo "❌ Error: --pack <java|python> is required."
  exit 1
fi

if [ "$PACK" != "java" ] && [ "$PACK" != "python" ]; then
  echo "❌ Error: Unsupported pack '$PACK'. Supported packs: java, python."
  exit 1
fi

if [ -z "$SERVICE_NAME" ]; then
  SERVICE_NAME="$(basename "$TARGET_DIR")"
fi

echo "=========================================================="
echo "📦 Installing ai-harness (v${HARNESS_VERSION})"
echo "   Target : $TARGET_DIR"
echo "   Service: $SERVICE_NAME"
echo "   Pack   : $PACK"
echo "=========================================================="

cd "$TARGET_DIR"

# 1. Create .harness directory structure
mkdir -p .harness/scripts .harness/templates

# Copy protected files list and enforcement scripts
cp "$HARNESS_ROOT/core/protected-files" .harness/protected-files
cp "$HARNESS_ROOT/core/scripts/check-protected-files.sh" .harness/scripts/
cp "$HARNESS_ROOT/core/scripts/check-spec-scope.sh" .harness/scripts/
cp "$HARNESS_ROOT/core/scripts/devin-pre-exec.sh" .harness/scripts/
chmod +x .harness/scripts/*.sh

# Copy templates
cp "$HARNESS_ROOT/core/templates/"*.md .harness/templates/

# Copy pack verification script
cp "$HARNESS_ROOT/packs/$PACK/verify.sh" .harness/verify.sh
chmod +x .harness/verify.sh

# Record version
echo "$HARNESS_VERSION" > .harness/.version

# 2. Install Skills into .agents/skills/
mkdir -p .agents/skills
for skill_dir in "$HARNESS_ROOT/core/skills/"*; do
  if [ -d "$skill_dir" ]; then
    skill_name="$(basename "$skill_dir")"
    rm -rf ".agents/skills/$skill_name"
    cp -r "$skill_dir" ".agents/skills/$skill_name"
  fi
done

# 3. Configure Devin (.devin/hooks.v1.json and blueprint.yaml)
mkdir -p .devin
cp "$HARNESS_ROOT/core/templates/devin-hooks.json" .devin/hooks.v1.json

if [ ! -f .devin/blueprint.yaml ]; then
  cp "$HARNESS_ROOT/packs/$PACK/blueprint.yaml.tmpl" .devin/blueprint.yaml
fi

# 4. Generate AGENTS.md (under Devin 16 KiB limit)
# Load pack commands
source "$HARNESS_ROOT/packs/$PACK/pack.env"

PROJECT_HEADER=$(cat "$HARNESS_ROOT/core/AGENTS.project.tmpl")
PROJECT_HEADER="${PROJECT_HEADER//\{\{SERVICE_NAME\}\}/$SERVICE_NAME}"
PROJECT_HEADER="${PROJECT_HEADER//\{\{CMD_FAST\}\}/$CMD_FAST}"
PROJECT_HEADER="${PROJECT_HEADER//\{\{CMD_SINGLE_TEST\}\}/$CMD_SINGLE_TEST}"
PROJECT_HEADER="${PROJECT_HEADER//\{\{CMD_FORMAT\}\}/$CMD_FORMAT}"
PROJECT_HEADER="${PROJECT_HEADER//\{\{CMD_RUN\}\}/$CMD_RUN}"

CORE_RULES=$(cat "$HARNESS_ROOT/core/AGENTS.core.md")
CORE_RULES="${CORE_RULES//\{\{HARNESS_VERSION\}\}/$HARNESS_VERSION}"

PACK_RULES=$(cat "$HARNESS_ROOT/packs/$PACK/rules/$PACK.md")

if [ ! -f AGENTS.md ]; then
  cat <<EOF > AGENTS.md
$PROJECT_HEADER

---

$CORE_RULES

---

$PACK_RULES
EOF
  echo "📄 Created AGENTS.md"
else
  echo "ℹ️  Existing AGENTS.md preserved. Update manually if needed."
fi

# Verify AGENTS.md file size against Devin 16 KiB limit
FILE_SIZE=$(wc -c < AGENTS.md | tr -d ' ')
if [ "$FILE_SIZE" -gt 16384 ]; then
  echo "⚠️ WARNING: AGENTS.md is ${FILE_SIZE} bytes (> 16 KiB limit for Devin auto-load)."
else
  echo "✅ AGENTS.md size: ${FILE_SIZE} bytes (comfortably under Devin 16 KiB limit)."
fi

# 5. Initialize documentation structure
mkdir -p docs/specs docs/contracts docs/adr docs/scout docs/ai

if [ ! -f docs/ai/overview.md ]; then
  cat <<EOF > docs/ai/overview.md
# $SERVICE_NAME: Service Overview

## Purpose
What this service is responsible for.

## Key Capabilities
- Feature 1
- Feature 2
EOF
fi

if [ ! -f docs/ai/architecture.md ]; then
  cat <<EOF > docs/ai/architecture.md
# $SERVICE_NAME: Architecture & Seams

## Core Aggregates & Domain
- Aggregate 1

## Inbound Interfaces
- REST controllers in \`web\`
- Kafka consumer topics

## Outbound Interfaces
- Database (PostgreSQL)
- Outbound REST clients
EOF
fi

if [ ! -f docs/ai/load.md ]; then
  cat <<EOF > docs/ai/load.md
# $SERVICE_NAME: SLA & Expected Load

- P95 Latency SLA: < 200ms
- Target throughput: 500 RPS
EOF
fi

echo ""
echo "=========================================================="
echo "🎉 ai-harness successfully installed into $SERVICE_NAME!"
echo "   Run .harness/verify.sh to test your verification pipeline."
echo "=========================================================="
