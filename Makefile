SHELL   := /bin/bash
NODE    := source $$HOME/.nvm/nvm.sh && nvm use 20 &&

.DEFAULT_GOAL := dev

.PHONY: dev stop clean reset logs db-up db-migrate db-seed

# ── Main ──────────────────────────────────────────────────────────────────────

dev: .env.local db-up db-migrate db-seed   ## Start everything, then run Next.js dev server
	@echo ""
	@echo "✓ http://localhost:3000"
	@echo ""
	$(NODE) npm run dev

# ── Database ──────────────────────────────────────────────────────────────────

db-up:   ## Start Postgres (detached)
	docker compose up -d postgres
	@printf "⏳ Postgres"
	@until docker compose exec -T postgres pg_isready -U rentaltrust -q 2>/dev/null; do \
		printf "."; sleep 1; \
	done
	@echo " ready"

db-migrate:   ## Run Prisma migrations
	$(NODE) npm run db:migrate

db-seed:   ## Seed the database
	$(NODE) npm run db:seed

# ── Utils ─────────────────────────────────────────────────────────────────────

stop:   ## Stop Docker services
	docker compose stop

clean:   ## Remove containers + volumes (wipes DB data)
	docker compose down -v

reset: clean db-up db-migrate db-seed   ## Wipe DB and start fresh

logs:   ## Tail Postgres logs
	docker compose logs -f postgres

# ── Guard ─────────────────────────────────────────────────────────────────────

.env.local:
	@echo "❌  .env.local not found. Copy .env.example → .env.local and fill in AUTH_SECRET."
	@exit 1
