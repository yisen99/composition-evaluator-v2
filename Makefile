.PHONY: up down logs compose-config backend-test frontend-test db-upgrade db-downgrade db-stamp-head db-verify-rollback

up:
	docker compose up --build

down:
	docker compose down -v

logs:
	docker compose logs -f

compose-config:
	docker compose config

backend-test:
	cd backend && python3 -m pytest -q

frontend-test:
	cd frontend && npm run test -- --run

db-upgrade:
	./backend/scripts/db_migrate.sh

db-downgrade:
	docker compose exec -T backend sh -lc "cd /app && alembic downgrade -1"

db-stamp-head:
	docker compose exec -T backend sh -lc "cd /app && alembic stamp head"

db-verify-rollback:
	./backend/scripts/db_verify_rollback.sh
