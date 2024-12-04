build:
	npx tsc --noEmit
	npm run build_client
	npm run build_server
	make ui
	make run

client:
	npx tsc --noEmit
	npm run build_client
	make ui
	make run

ui:
ifeq ($(OS),Windows_NT)
	powershell -command "cp src/client/index.html public/index.html"
	powershell -command "cp src/client/style.css public/style.css"
else
	cp src/client/index.html public/index.html
	cp src/client/style.css public/style.css
endif

run:
	node public/server.cjs

check:
	npx tsc --noEmit


# Docker
.PHONY: check-docker-compose

check-docker-compose:
    command -v docker-compose > /dev/null 2>&1 || (echo "Error: Docker Compose is not installed. Please install it and try again." && exit 1)

up: check-docker-compose
	docker-compose up -d

down:
	docker-compose down