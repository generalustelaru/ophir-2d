FROM node:22-alpine AS resources
WORKDIR /app
# Advanced copying for Docker to cache dependencies
COPY package*.json ./
RUN npm ci

COPY . .
RUN mkdir -p dist/public && cp -r src/static/* dist/public/

FROM resources AS development_image
# Build with sourcemaps
RUN npm run build_client & npm run build_server & wait

EXPOSE 3001
CMD ["node", "dist/server.cjs"]

FROM resources AS production_build
# Build without sourcemaps
RUN npm run build_client_prod & npm run build_server_prod & wait

FROM node:22-alpine AS production_image
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=production_build /app/dist ./dist

EXPOSE 3001
CMD ["node", "dist/server.cjs"]
