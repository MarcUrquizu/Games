#!/usr/bin/env bash
set -euo pipefail

TARGET_REF="${1:-origin/main}"

if ! git rev-parse --verify "$TARGET_REF" >/dev/null 2>&1; then
  echo "Target ref '$TARGET_REF' no existe en este repo." >&2
  exit 2
fi

MERGE_BASE=$(git merge-base HEAD "$TARGET_REF")
if [[ -z "$MERGE_BASE" ]]; then
  echo "No se pudo calcular merge-base entre HEAD y $TARGET_REF" >&2
  exit 2
fi

RANGE="${MERGE_BASE}..HEAD"

BIN_ROWS=$(git diff --numstat "$RANGE" | awk '$1=="-" || $2=="-" {print}')
if [[ -n "$BIN_ROWS" ]]; then
  echo "❌ Se detectaron archivos binarios en $RANGE:" >&2
  echo "$BIN_ROWS" >&2
  exit 1
fi

echo "✅ No hay archivos binarios en $RANGE (target: $TARGET_REF)"
