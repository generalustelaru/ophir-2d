FROM node:20-alpine AS builder
# Set project path
WORKDIR /app
#  Install dependencies (cached)
COPY package*.json ./
RUN npm ci
# Copy source
COPY . .
# Build
RUN	mkdir -p dist/public && cp -r src/static/* dist/public/
RUN npm run build_client & npm run build_server & wait

FROM builder AS dev

COPY --from=builder /app/debug.sh ./debug.sh
EXPOSE 3001
CMD ["node", "dist/server.cjs"]

FROM node:20-alpine AS prod
WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/seed-db.cjs ./seed-db.cjs
COPY --from=builder /app/debug.sh ./debug.sh

EXPOSE 3001
CMD ["node", "dist/server.cjs"]
