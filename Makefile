NAME 	= game-server
COMPOSE	= docker compose

env	?= dev # env|prod
m	?= Formatting commit

# Local Development (pre-docker)
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

# Coding tools
pull:
	git pull
	npm run omit_revs
check:
	npx tsc --noEmit
	npx eslint .
ignore:
	@echo "# $(m)" >> .git-blame-ignore-revs
	@git rev-parse HEAD >> .git-blame-ignore-revs
fix:
	npx eslint . --fix

# Docker
watch:
	$(COMPOSE) logs --follow $(NAME)-$(env)
watch-all:
	$(COMPOSE) logs --follow
build:
	$(COMPOSE) up $(NAME)-$(env) --remove-orphans --build --detach
	$(MAKE) watch
restart:
	$(COMPOSE) restart $(NAME)-$(env)
	$(MAKE) watch
shell:
	$(COMPOSE) exec $(NAME)-$(env) sh
stop: # Stop everything
	$(COMPOSE) down
containers:
	$(COMPOSE) ps
nuke:
	$(COMPOSE) down --volumes --rmi all

.PHONY: pull static client server run check ignore fix watch watch-all build restart shell stop containers nuke