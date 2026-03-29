NAME			= ophir-2d
CONTAINER		= $(NAME)-server
SILENT_OUTPUT 	= /dev/null 2>&1

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
cut:
	git push origin --delete $(branch)
	git branch --delete origin/$(branch)
	git branch --delete $(branch)
grow:
	git checkout --branch $(branch)
	git push --set-upstream origin $(branch)
sync:
	git checkout --track origin/$(branch)

check:
	npx tsc --noEmit
	npx eslint .
ignore:
	@echo "# $(m)" >> .git-blame-ignore-revs
	@git rev-parse HEAD >> .git-blame-ignore-revs
	@echo "Hash added."
fix:
	npx eslint . --fix

# Orchestration
build:
	docker inspect $(CONTAINER) > $(SILENT_OUTPUT) && $(MAKE) stop || true
	docker compose up $(NAME)-$(env) --build --detach

# Container interaction
peek:
	docker logs $(CONTAINER)
watch:
	docker logs $(CONTAINER) --follow
restart:
	docker restart $(CONTAINER)
	$(MAKE) watch
stop:
	echo "Removing $(CONTAINER) container."
	docker stop $(CONTAINER)
	docker rm $(CONTAINER)
shell:
	docker exec --interactive --tty $(CONTAINER) sh
clear: # Linux exclusive
	truncate -s 0 $$(docker inspect --format='{{.LogPath}}' $(CONTAINER))
restart-daemon:
	systemctl restart docker

.PHONY: pull static client server run check ignore fix watch peek clear build restart shell, restart-daemon