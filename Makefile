.PHONY: dev seed analyze demo logs clean test build setup

# ── Development ──────────────────────────────────────────

dev:
	docker-compose up -d neo4j analysis
	@echo "Waiting for Neo4j to become healthy..."
	@sleep 8
	npm run dev --workspaces

setup:
	cp -n .env.example .env || true
	npm install
	cd packages/analysis && pip install -r requirements.txt
	docker-compose up -d neo4j
	@echo "Waiting for Neo4j to become healthy..."
	@sleep 10
	@echo "Setup complete. Run 'make demo' for full demonstration."

# ── Data ─────────────────────────────────────────────────

seed:
	curl -s -X POST http://localhost:3001/api/ingest/mock \
	  -H "Content-Type: application/json" \
	  -d '{"scenario":"enterprise_1000"}' | jq .

seed-small:
	curl -s -X POST http://localhost:3001/api/ingest/mock \
	  -H "Content-Type: application/json" \
	  -d '{"scenario":"startup_50"}' | jq .

# ── Analysis ─────────────────────────────────────────────

analyze:
	curl -s -X POST http://localhost:3001/api/analysis/run \
	  -H "Content-Type: application/json" | jq .

# ── Demo ─────────────────────────────────────────────────

demo: seed
	@echo "Seeding complete. Waiting for data to settle..."
	@sleep 3
	$(MAKE) analyze
	@echo ""
	@echo "═══════════════════════════════════════════════"
	@echo "  ◈ SYBIL — Demo ready"
	@echo "  Dashboard: http://localhost:3000"
	@echo "  API:       http://localhost:3001"
	@echo "  Neo4j:     http://localhost:7474"
	@echo "═══════════════════════════════════════════════"

# ── Testing ──────────────────────────────────────────────

test:
	cd packages/analysis && python -m pytest tests/ -v
	npm run test --workspaces --if-present

test-analysis:
	cd packages/analysis && python -m pytest tests/ -v

# ── Build ────────────────────────────────────────────────

build:
	docker-compose build

build-prod:
	docker-compose -f docker-compose.yml -f docker-compose.prod.yml build

# ── Logs ─────────────────────────────────────────────────

logs:
	docker-compose logs -f

logs-ingestion:
	docker-compose logs -f ingestion

logs-analysis:
	docker-compose logs -f analysis

# ── Cleanup ──────────────────────────────────────────────

clean:
	docker-compose down -v
	rm -rf packages/*/node_modules packages/*/dist
	rm -rf packages/analysis/__pycache__ packages/analysis/.pytest_cache
	@echo "All containers, volumes, and build artifacts removed."
