FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install

FROM deps AS dev-setup
WORKDIR /app

RUN npm install -g pnpm

COPY --from=deps --chown=node:node /app/node_modules ./node_modules
COPY . .

EXPOSE 3000

USER node

RUN ["npx", "tsc", "--noEmit"]
RUN ["npm", "run", "build_client"]
RUN ["npm", "run", "build_server"]

CMD ["node", "public/server.cjs"]