FROM node:20-alpine

# Set project path
WORKDIR /app

#  npm ci not run every time; package is diffed;
COPY package*.json ./
RUN npm ci

# Copy source to path
COPY . .

# Full build
RUN	mkdir -p dist/public && \
    rm -rf dist/public/* && \
    cp -r src/static/* dist/public/ && \
    npm run build_client && \
    npm run build_server

# Expose port for HTTP/WS
EXPOSE 3001

CMD ["node", "dist/server.cjs"]
