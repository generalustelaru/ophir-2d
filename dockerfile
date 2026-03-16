FROM node:22-alpine AS pre_build
# Set project path
WORKDIR /app
#  Install dependencies (cached)
COPY package*.json ./
RUN npm ci
# Copy source
COPY . .
# Create folder structure and copy static files
RUN	mkdir -p dist/public && cp -r src/static/* dist/public/

FROM pre_build AS dev_build
# Build with sourcemaps
RUN npm run build_client & npm run build_server & wait

EXPOSE 3001
CMD ["node", "dist/server.cjs"]

FROM pre_build AS prod_build
# Build without sourcemaps
RUN npm run build_client_prod & npm run build_server_prod & wait
# Remove dev and build dependencies
RUN npm prune --production

EXPOSE 3001
CMD ["node", "dist/server.cjs"]
