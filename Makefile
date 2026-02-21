# Cultivated CRM — Docker Dev Commands

.PHONY: up down build logs seed migrate studio reset

up:
	docker compose up -d --build

down:
	docker compose down

build:
	docker compose build --no-cache

logs:
	docker compose logs -f

logs-web:
	docker compose logs -f web

logs-worker:
	docker compose logs -f worker

migrate:
	docker compose exec web sh -c "cd packages/db && pnpm exec prisma migrate deploy"

migrate-dev:
	docker compose exec web sh -c "cd packages/db && pnpm exec prisma migrate dev"

db-push:
	docker compose exec web sh -c "cd packages/db && pnpm exec prisma db push"

seed:
	docker compose exec web pnpm db:seed

generate:
	docker compose exec web sh -c "cd packages/db && pnpm exec prisma generate"

studio:
	docker compose --profile tools up -d studio

reset:
	docker compose down -v
	docker compose up -d --build

shell:
	docker compose exec web sh

psql:
	docker compose exec postgres psql -U crm_user -d cultivated_crm