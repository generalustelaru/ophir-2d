install:
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
	npm run ommit_revs
	make migrate

migrate:
ifeq ($(OS),Windows_NT)
	powershell -command "cp db_template.json db.json"
else
	cp db_template.json db.json
endif

db:
	npx json-server --watch db.json

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
ifeq ($(OS),Windows_NT)
	# FIXME: adapt Windows script for dist/public
	powershell -command "if (-not (Test-Path 'dist/public')) { New-Item -ItemType Directory -Name 'public' }"
	powershell -command "if (Get-ChildItem 'public' -ErrorAction SilentlyContinue) { Get-ChildItem 'public' -Recurse | Remove-Item -Force }"
	powershell -command "cp -r src/client/static/* dist/public/"
else
	if [ ! -d 'dist' ]; then mkdir 'dist'; mkdir 'dist/public'; fi
	if [ -f 'dist/*' ]; then rm -r dist/*; fi
	cp -r src/client/static/* dist/public/
endif

check:
	npx tsc --noEmit
	npx eslint .

fix:
	npx eslint . --fix
