#!/usr/bin/env bash

set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

chmod +x \
  "${repo_root}/.githooks/post-commit" \
  "${repo_root}/.githooks/auto-major-commit-push.sh" \
  "${repo_root}/.githooks/lib/major-change.sh" \
  "${repo_root}/git-auto-push.sh"

git -C "${repo_root}" config core.hooksPath .githooks

echo "Installed repository hooks path: .githooks"
echo "Major auto push hook: .githooks/post-commit"
echo "Manual major auto commit + push: ./git-auto-push.sh"
echo "Thresholds: MAJOR_CHANGE_MIN_FILES=${MAJOR_CHANGE_MIN_FILES:-8}, MAJOR_CHANGE_MIN_LINES=${MAJOR_CHANGE_MIN_LINES:-300}"
