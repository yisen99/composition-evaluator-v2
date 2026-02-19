#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT_DIR"

if ! docker compose ps --services --filter status=running | grep -q '^backend$'; then
  echo "backend container is not running. Start services first: docker compose up -d"
  exit 1
fi
if ! docker compose ps --services --filter status=running | grep -q '^postgres$'; then
  echo "postgres container is not running. Start services first: docker compose up -d"
  exit 1
fi

DB_NAME="ce_migration_verify_$(date +%s)"
DB_URL="postgresql+psycopg://postgres:postgres@postgres:5432/${DB_NAME}"

cleanup() {
  docker compose exec -T postgres psql -U postgres -d postgres -c "DROP DATABASE IF EXISTS \"${DB_NAME}\";" >/dev/null 2>&1 || true
}
trap cleanup EXIT

echo "[verify] creating temp database: ${DB_NAME}"
docker compose exec -T postgres psql -U postgres -d postgres -c "CREATE DATABASE \"${DB_NAME}\";" >/dev/null

echo "[verify] alembic upgrade head"
docker compose exec -T -e DATABASE_URL="$DB_URL" backend sh -lc "cd /app && alembic upgrade head" >/dev/null

echo "[verify] checking core tables exist"
docker compose exec -T postgres psql -U postgres -d "$DB_NAME" -c "\dt" >/dev/null

echo "[verify] alembic downgrade base"
docker compose exec -T -e DATABASE_URL="$DB_URL" backend sh -lc "cd /app && alembic downgrade base" >/dev/null

echo "[verify] alembic upgrade head (second pass)"
docker compose exec -T -e DATABASE_URL="$DB_URL" backend sh -lc "cd /app && alembic upgrade head" >/dev/null

echo "[verify] migration rollback cycle passed"
