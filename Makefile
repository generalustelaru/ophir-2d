app:
	npm run build_client

end:
	# npm run build_server

all:
	npm run build_client
	# npm run build_server
	node server.js

serve:
	node server.js

start:
	npm run build
	node server.js