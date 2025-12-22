install:
	docker pull mongo:latest
	docker pull redis:latest
	docker pull redis/redisinsight:latest
ifeq ($(OS),Windows_NT)
	powershell -command "cp .env.example .env"
	powershell.exe -ExecutionPolicy Bypass -File update-ip.ps1
else
	cp .env.example .env
	@sed -i '/^SERVER_ADDRESS=/d' .env 2>/dev/null || true
	@echo "SERVER_ADDRESS=$$(hostname -I | awk '{print $$1}')" >> .env
endif
	npm ci
	make build
	make persistence
	make seed

persistence:
	docker run -d -p 27017:27017 --name ophir-mongo mongo
	docker run -d -p 6379:6379 --name ophir-redis redis
	docker run -d --name redisinsight -p 5540:5540 redis/redisinsight:latest

seed:
	node seed-db.cjs

run:
	node dist/server.cjs

# DEV
build:
	make static
	make server
	make client

server:
	npm run build_server

client:
	npm run build_client

static:
ifeq ($( -commandO"S),Windows_NT)
	powershell -command "if (-not (Test-Path 'dist')) { New-Item -ItemType Directory -Path 'dist'; New-Item -ItemType Directory -Path 'dist/public' }"
	powershell -command "if (Test-Path 'dist/*') { Remove-Item -Recurse -Force dist/* }"
	powershell -command "Copy-Item -Recurse -Force src/static/* dist/public/"
else
	if [ ! -d 'dist' ]; then mkdir 'dist'; mkdir 'dist/public'; fi
	if [ -f 'dist/*' ]; then rm -r dist/*; fi
	cp -r src/static/* dist/public/
endif

check:
	npx tsc --noEmit
	npx eslint .

fix:
	npx eslint . --fix
