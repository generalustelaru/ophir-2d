install:
ifeq ($(OS),Windows_NT)
	powershell -command "cp .env.example .env"
	powershell.exe -ExecutionPolicy Bypass -File update-ip.ps1
else
	cp .env.example .env
	@sed -i '/^SERVER_ADDRESS=/d' .env 2>/dev/null || true
	@echo "SERVER_ADDRESS=$$(ipconfig | grep -A 3 'Ethernet' | grep 'IPv4' | awk '{print $$NF}')" >> .env
endif
	npm ci
	make build
	npm run ommit_revs

run:
	node public/server.cjs

# DEV
build:
	make layout
	make server
	make client

server:
	npm run build_server

client:
	npm run build_client

layout:
ifeq ($(OS),Windows_NT)
	powershell -command "if (-not (Test-Path 'public')) { New-Item -ItemType Directory -Name 'public' }"
	powershell -command "if (Get-ChildItem 'public' -ErrorAction SilentlyContinue) { Get-ChildItem 'public' -Recurse | Remove-Item -Force }"
	powershell -command "cp -r src/client/layout/* public/"
else
	if [ ! -d 'public' ]; then mkdir 'public'; fi
	if [ -f 'public/*' ]; then rm -r public/*; fi
	cp -r src/client/layout/* public/
endif

check:
	npx tsc --noEmit
	npx eslint .
