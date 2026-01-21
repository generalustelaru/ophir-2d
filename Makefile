# Local Development
pull:
	git pull
	npm run omit_revs

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

m ?= Formatting commit
ignore:
	@echo "# $(m)" >> .git-blame-ignore-revs
	@git rev-parse HEAD >> .git-blame-ignore-revs

fix:
	npx eslint . --fix


# Docker Production
start:
	docker compose up game-server-prod -d --build

seed:
	docker compose exec game-server-prod node seed-db.cjs

# Docker Development / Debugging
dev:
	docker compose up game-server-dev -d --build

stop: # Stop everything
	docker compose down --remove-orphans

restart:
	docker compose restart game-server-dev

containers:
	docker compose ps

watch:
	docker compose logs -f game-server-dev

watch-all:
	docker compose logs -f

shell:
	docker compose exec game-server-dev sh

clean:
	docker compose down -v

.PHONY: client server static build run containers start dev restart watch watch-all seed shell clean