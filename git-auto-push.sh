#!/usr/bin/env bash
# Quick command for major-change auto commit + push
# Usage: ./git-auto-push.sh

set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
"${script_dir}/.githooks/auto-major-commit-push.sh"
