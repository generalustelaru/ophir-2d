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
