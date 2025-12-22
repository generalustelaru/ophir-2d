FROM node:20

# Install make
RUN apt-get update && apt-get install -y make

# Set project path
WORKDIR /app

# node_modules are cached in Docker, no risk of reloading.
COPY package*.json ./
RUN npm ci

# Copy source to path
COPY . .

# Classic build
RUN make build

# Expose port for HTTP/WS
EXPOSE 3001

CMD ["node", "dist/server.cjs"]
