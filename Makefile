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

ui:
ifeq ($(OS),Windows_NT)
	powershell -command "cp -r src/client/layout/* public/"
else
	cp -r src/client/layout/* public/
endif

run:
	node public/server.cjs

check:
	npx tsc --noEmit
