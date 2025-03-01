update:
	git pull
	npm update

build:
	make public
	npm run build_client
	npm run build_server
	make run

install:
	npm install
	make build

server:
	npm run build_server
	make run

client:
	npm run build_client

public:
ifeq ($(OS),Windows_NT)
	powershell -command "if (-not (Test-Path 'public')) { New-Item -ItemType Directory -Name 'public' }"
	powershell -command "if (Get-ChildItem 'public' -ErrorAction SilentlyContinue) { Get-ChildItem 'public' -Recurse | Remove-Item -Force }"
	powershell -command "cp -r src/client/layout/* public/"
else
	if [ ! -d 'public' ]; then mkdir 'public'; fi
	if [ -f 'public/*' ]; then rm -r public/*; fi
	cp -r src/client/layout/* public/
endif

run:
	node public/server.cjs

check:
	npx tsc --noEmit
