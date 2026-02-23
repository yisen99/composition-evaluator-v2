#!/bin/bash
# Quick command to auto-commit and push changes
# Usage: ./git-auto-push.sh or add to your path as 'git-auto-push'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
"$SCRIPT_DIR/.git/hooks/auto-commit.sh"
