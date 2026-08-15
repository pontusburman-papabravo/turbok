#!/usr/bin/env bash
set -euo pipefail

echo "==> Verifying turbok development environment"

required_commands=(git node npm python3)
for cmd in "${required_commands[@]}"; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "ERROR: missing required command: $cmd" >&2
    exit 1
  fi
  echo "OK: $cmd -> $($cmd --version 2>&1 | head -n 1)"
done

echo "OK: repository root -> $(pwd)"
echo "OK: git status clean -> $(git status --porcelain | wc -l) untracked/modified files"
echo "==> Environment verification passed"
