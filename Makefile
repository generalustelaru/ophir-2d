build:
	npm run build_client
	npm run build_server

all:
	make build
	node public/server.cjs

run:
	node public/server.cjs
