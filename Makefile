update:
	git pull
	npm install
	npm update
	make build

build:
	make check
	make ui
	npm run build_client
	npm run build_server
	make run

server:
	make check
	npm run build_server
	make run

client:
	make check
	npm run build_client
	make run

ui:
ifeq ($(OS),Windows_NT)
	powershell -command "rm -r public/*"
	powershell -command "cp -r src/client/layout/* public/"
else
	rm -r public/*
	cp -r src/client/layout/* public/
endif

run:
	node public/server.cjs

check:
	npx tsc --noEmit
