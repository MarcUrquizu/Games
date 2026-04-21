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

HAS_BIN=0
while read -r c; do
  ROWS=$(git show --numstat --format='' "$c" | awk '$1=="-" || $2=="-" {print}')
  if [[ -n "$ROWS" ]]; then
    HAS_BIN=1
    echo "❌ Commit con binarios: $c"
    echo "$ROWS"
    echo
  fi
done < <(git rev-list "${MERGE_BASE}..HEAD")

if [[ "$HAS_BIN" -eq 1 ]]; then
  exit 1
fi

echo "✅ Ningún commit entre ${MERGE_BASE}..HEAD contiene binarios"
