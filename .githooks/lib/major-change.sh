#!/usr/bin/env bash

set -euo pipefail

major_change_files_threshold() {
  printf "%s" "${MAJOR_CHANGE_MIN_FILES:-8}"
}

major_change_lines_threshold() {
  printf "%s" "${MAJOR_CHANGE_MIN_LINES:-300}"
}

parse_shortstat() {
  local shortstat="${1:-}"
  local files=0
  local insertions=0
  local deletions=0

  if [[ -n "${shortstat}" ]]; then
    if [[ "${shortstat}" =~ ([0-9]+)[[:space:]]+files?[[:space:]]+changed ]]; then
      files="${BASH_REMATCH[1]}"
    fi
    if [[ "${shortstat}" =~ ([0-9]+)[[:space:]]+insertions?\(\+\) ]]; then
      insertions="${BASH_REMATCH[1]}"
    fi
    if [[ "${shortstat}" =~ ([0-9]+)[[:space:]]+deletions?\(-\) ]]; then
      deletions="${BASH_REMATCH[1]}"
    fi
  fi

  local changed_lines=$((insertions + deletions))
  printf "%s %s %s %s\n" "${files}" "${insertions}" "${deletions}" "${changed_lines}"
}

is_major_change() {
  local files="${1:-0}"
  local changed_lines="${2:-0}"
  local files_threshold
  local lines_threshold

  files_threshold="$(major_change_files_threshold)"
  lines_threshold="$(major_change_lines_threshold)"

  [[ "${files}" =~ ^[0-9]+$ ]] || files=0
  [[ "${changed_lines}" =~ ^[0-9]+$ ]] || changed_lines=0

  if (( files >= files_threshold )); then
    return 0
  fi
  if (( changed_lines >= lines_threshold )); then
    return 0
  fi
  return 1
}
