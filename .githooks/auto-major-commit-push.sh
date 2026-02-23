#!/usr/bin/env bash

set -euo pipefail

repo_root="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [[ -z "${repo_root}" ]]; then
  echo "[major-auto-commit] not inside a git repository." >&2
  exit 1
fi

# shellcheck source=.githooks/lib/major-change.sh
source "${repo_root}/.githooks/lib/major-change.sh"

if [[ -z "$(git status --porcelain)" ]]; then
  echo "[major-auto-commit] no local changes; nothing to commit."
  exit 0
fi

shortstat="$(git diff --shortstat)"
read -r files _insertions _deletions changed_lines <<<"$(parse_shortstat "${shortstat}")"

if ! is_major_change "${files}" "${changed_lines}"; then
  echo "[major-auto-commit] change is not major (${files} files, ${changed_lines} lines); skip auto commit."
  echo "[major-auto-commit] thresholds: files>=$(major_change_files_threshold) or lines>=$(major_change_lines_threshold)"
  exit 0
fi

branch="$(git symbolic-ref --quiet --short HEAD 2>/dev/null || true)"
if [[ -z "${branch}" ]]; then
  echo "[major-auto-commit] detached HEAD; skip."
  exit 1
fi

remote="${MAJOR_AUTO_PUSH_REMOTE:-origin}"
if ! git remote get-url "${remote}" >/dev/null 2>&1; then
  echo "[major-auto-commit] remote '${remote}' not found." >&2
  exit 1
fi

timestamp="$(date +"%Y-%m-%d %H:%M:%S")"
commit_message="chore(auto): checkpoint major change (${files} files, ${changed_lines} lines) @ ${timestamp}"

echo "[major-auto-commit] major change detected. creating commit."
git add -A
SKIP_MAJOR_AUTO_PUSH=1 git commit -m "${commit_message}"

echo "[major-auto-commit] pushing ${branch} -> ${remote}/${branch}"
git push "${remote}" "${branch}"
echo "[major-auto-commit] done."
