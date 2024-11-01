build:
	npm run build_client
	npm run build_server

client:
	npm run build_client
	node public/server.cjs
server:
	npm run build_server
	node public/server.cjs

all:
	make build
	node public/server.cjs

run:
	node public/server.cjs
