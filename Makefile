# Local (outside Docker)
static:
	mkdir -p dist/public
	rm -rf dist/public/*
	cp -r src/static/* dist/public/

client:
	npm run build_client

server:
	npm run build_server

run:
	node dist/server.cjs

check:
	npx tsc --noEmit
	npx eslint .

fix:
	npx eslint . --fix


# Docker
start:  # Start everything (rebuild if missing)
	docker compose up -d

stop: # Stop everything
	docker compose down

image: # Rebuild image and start
	docker compose up -d --build

restart:
	docker compose restart game-server

ps: # Shows active containers
	docker compose ps

watch:
	docker compose logs -f game-server

watch-all:
	docker compose logs -f

seed:
	docker compose exec game-server node seed-db.cjs

shell:
	docker compose exec game-server sh

# Cleanup
clean:
	docker compose down -v
	rm -rf dist node_modules

.PHONY: client server static build run up down image restart watch watch-all seed shell clean