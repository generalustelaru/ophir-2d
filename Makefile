build:
	npx tsc --noEmit
	npm run build_client
	npm run build_server
	cp src/index.html public/index.html
	cp src/style.css public/style.css

run:
	node public/server.cjs

check:
	npx tsc --noEmit

