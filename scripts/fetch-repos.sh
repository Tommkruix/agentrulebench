#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

REPO_URL="https://github.com/Snouzy/workout-cool.git"
REPO_SHA="e3dcd23b4ebdfb6254010b9a7c350cfef9e236c8"
DEST="repos/workout-cool"

if [ -d "$DEST/.git" ]; then
  git -C "$DEST" fetch origin "$REPO_SHA"
else
  mkdir -p repos
  git clone --filter=blob:none "$REPO_URL" "$DEST"
fi
git -C "$DEST" checkout --quiet "$REPO_SHA"
echo "workout-cool checked out at $REPO_SHA"
echo
echo "Next, install its dependencies so acceptance tests can resolve modules:"
echo "  (cd $DEST && pnpm install)   # workout-cool uses pnpm; match its lockfile"
