NAME = game-server
ENV		?= dev
COMPOSE	= docker compose

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

# Docker
watch:
	$(COMPOSE) logs -f $(NAME)-$(ENV)
watch-all:
	$(COMPOSE) logs -f
seed:
	$(COMPOSE) exec $(NAME)-$(ENV) node seed-db.cjs
build:
	$(COMPOSE) up -d $(NAME)-$(ENV) --remove-orphans --build
	$(MAKE) watch
restart:
	$(COMPOSE) restart $(NAME)-$(ENV)
	$(MAKE) watch
shell:
	$(COMPOSE) exec $(NAME)-$(ENV) sh
stop: # Stop everything
	$(COMPOSE) down --remove-orphans
containers:
	$(COMPOSE) ps
nuke:
	$(COMPOSE) down -v

.PHONY: pull static client server run check ignore fix watch watch-all seed build restart shell stop containers nuke