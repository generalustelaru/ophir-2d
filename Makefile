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

# Git wrappers
branches:
	git branch -a
sync-branches:
	git fetch --prune origin
	git pull
	npm run omit_revs
remove:
	git push origin --delete $(branch)
	git branch --delete $(branch)
create:
	git checkout --branch $(branch)
	git push --set-upstream origin $(branch)
mirror:
	git checkout --track origin/$(branch)
ignore-last:
	@echo "# $(m)" >> .git-blame-ignore-revs
	@git rev-parse HEAD >> .git-blame-ignore-revs
	@echo "Hash added."

check:
	npx tsc --noEmit
	npx eslint .
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

.PHONY: branches sync-branches remove create mirror static client server run check ignore-last fix watch peek clear build restart shell restart-daemon