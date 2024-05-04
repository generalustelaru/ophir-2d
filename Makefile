build:
	npm run build_client
	npm run build_server

all:
	make build
	node public/server.cjs

serve:
	node public/server.cjs
