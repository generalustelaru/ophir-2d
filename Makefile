# Building
build: static server client

server:
	npm run build_server

client:
	npm run build_client

static:
	mkdir -p dist/public
	rm -rf dist/public/*
	cp -r src/static/* dist/public/

# Local
run:
	node dist/server.cjs

check:
	npx tsc --noEmit
	npx eslint .

fix:
	npx eslint . --fix

#Docker
start:  # Start everything
	docker compose up -d

stop: # Stop everything
	docker compose down

rebuild: # Rebuilds just the app
	docker compose up -d --build

restart:
	docker compose restart game-server

watch:
	docker compose logs -f game-server

watch-all:
	docker compose logs -f

# Database utilities
seed:
	docker compose exec game-server node seed-db.cjs

shell:
	docker compose exec game-server sh

# Cleanup
clean:
	docker compose down -v
	rm -rf dist node_modules

.PHONY: client server static build run up down rebuild restart logs logs-all seed shell clean