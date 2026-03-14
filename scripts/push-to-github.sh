#!/usr/bin/env bash
# Push current work to GitHub: push testing, then update and push main.
# Run from repo root. Requires Git credentials (HTTPS token or SSH key).
set -e
cd "$(dirname "$0")/.."

echo "→ Pushing branch 'testing' to origin..."
git push origin testing

echo "→ Updating 'main' with 'testing' and pushing..."
CURRENT=$(git branch --show-current)
git checkout main
git merge testing -m "Merge branch 'testing' into main"
git push origin main
git checkout "$CURRENT"
echo "✓ Done. Pushed testing and main to GitHub."
