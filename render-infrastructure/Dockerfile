# Dockerfile for BotNexa (Render Deployment)
# Multi-stage build with Docker layer caching for rapid redeployments.

# ---------------------------------------------------------
# Stage 1: Runtime Base with System Dependencies (Cached)
# Heavy OS packages and pgvector compiled once and cached at top level
# ---------------------------------------------------------
FROM node:24-slim AS base-system

WORKDIR /app

# Install PostgreSQL, contrib, redis-server, nginx, and build essentials/pgvector at top level
RUN apt-get update && apt-get install -y \
    postgresql \
    postgresql-contrib \
    redis-server \
    nginx \
    git \
    build-essential \
    postgresql-server-dev-all \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Clone and compile pgvector from source
RUN git clone --branch v0.7.0 https://github.com/pgvector/pgvector.git /tmp/pgvector \
    && cd /tmp/pgvector \
    && make \
    && make install \
    && rm -rf /tmp/pgvector

# ---------------------------------------------------------
# Stage 2: Application Builder
# ---------------------------------------------------------
FROM node:24-slim AS builder

WORKDIR /app

# Copy dependency manifests for cache leverage
COPY client/package*.json ./client/
COPY server/package*.json ./server/

# Install dependencies using legacy-peer-deps to prevent peer dependency resolution errors
RUN cd client && npm install --legacy-peer-deps
RUN cd server && npm install --legacy-peer-deps

# Copy full source code
COPY client ./client
COPY server ./server

# Build both applications
RUN cd client && npm run build
RUN cd server && npm run build

# ---------------------------------------------------------
# Stage 3: Final Production Runtime Image
# Inherits from base-system: Postgres, Redis, Nginx & pgvector are NEVER reinstalled on code changes!
# ---------------------------------------------------------
FROM base-system

ENV NODE_ENV=production

WORKDIR /app

# Copy compiled Next.js client
COPY --from=builder /app/client/.next ./client/.next
COPY --from=builder /app/client/public ./client/public
COPY --from=builder /app/client/package.json ./client/package.json
COPY --from=builder /app/client/next.config.ts ./client/next.config.ts
COPY --from=builder /app/client/node_modules ./client/node_modules

# Copy compiled NestJS server
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/server/package.json ./server/package.json
COPY --from=builder /app/server/node_modules ./server/node_modules

# Copy Nginx configuration template and start script
COPY render-infrastructure/nginx.conf.template /app/render-infrastructure/nginx.conf.template
COPY render-infrastructure/start.sh /app/start.sh
RUN chmod +x /app/start.sh

# Start the unified container with Nginx reverse proxy
CMD ["/app/start.sh"]
