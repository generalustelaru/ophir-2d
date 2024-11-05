build:
	npx tsc --noEmit
	npm run build_client
	npm run build_server
	cp src/client/index.html public/index.html
	cp src/client/style.css public/style.css

run:
	node public/server.cjs

check:
	npx tsc --noEmit

