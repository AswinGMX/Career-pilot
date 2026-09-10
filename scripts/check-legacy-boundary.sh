#!/bin/sh

set -eu

BASE_REF="${1:-}"

if [ -z "$BASE_REF" ]; then
  echo "No base ref provided. Skipping legacy boundary check."
  exit 0
fi

CHANGED_FILES="$(git diff --name-only "$BASE_REF"...HEAD)"

if [ -z "$CHANGED_FILES" ]; then
  echo "No changed files detected."
  exit 0
fi

LEGACY_MATCHES="$(printf '%s\n' "$CHANGED_FILES" | grep -E '^(src/|server\.js$|index\.html$|styles\.css$|vite\.config(\..+)?$|scripts/dev\.js$)')"

if [ -z "$LEGACY_MATCHES" ]; then
  echo "Legacy boundary check passed."
  exit 0
fi

echo "Legacy prototype files changed:"
printf '%s\n' "$LEGACY_MATCHES"
echo "Prototype files are frozen during cutover. Move production changes into apps/* or packages/*."
exit 1
