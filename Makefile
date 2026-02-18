.PHONY: up down logs compose-config backend-test frontend-test

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
