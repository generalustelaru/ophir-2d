app:
	npm run build_client

end:
	npm run build_server

all:
	npm run build_client
	npm run build_server
	node public/server.cjs

serve:
	node public/server.cjs
