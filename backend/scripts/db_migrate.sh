#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT_DIR"

if ! docker compose ps --services --filter status=running | grep -q '^backend$'; then
  echo "backend container is not running. Start services first: docker compose up -d"
  exit 1
fi

docker compose exec -T backend sh -lc "cd /app && alembic upgrade head"
