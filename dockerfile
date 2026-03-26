FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN mkdir -p dist/public && cp -r src/static/* dist/public/

FROM build AS development
# Build with sourcemaps
RUN npm run build_client & npm run build_server & wait

EXPOSE 3001
CMD ["node", "dist/server.cjs"]

FROM node:22-alpine AS dependencies
WORKDIR /app
COPY package*.json ./
# Install only production deps (no prune needed later)
RUN npm ci --omit=dev

FROM build AS production_build
# Build without sourcemaps
RUN npm run build_client_prod & npm run build_server_prod & wait

FROM node:22-alpine AS production
WORKDIR /app
# Copy only production node_modules (already clean, no pruning needed)
COPY --from=dependencies /app/node_modules ./node_modules
# Copy built artifacts and static files
COPY --from=production_build /app/dist ./dist
COPY package*.json ./

EXPOSE 3001
CMD ["node", "dist/server.cjs"]
