build:
	npx tsc --noEmit
	npm run build_client
	npm run build_server

run:
	node public/server.cjs

check:
	npx tsc --noEmit

