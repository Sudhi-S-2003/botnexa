#!/bin/sh
set -e

# Capture Render external port at the very start
RENDER_EXTERNAL_PORT="${PORT:-10000}"

# Normalize NODE_ENV to avoid non-standard environment warning in Next.js
if [ "$NODE_ENV" != "production" ] && [ "$NODE_ENV" != "development" ] && [ "$NODE_ENV" != "test" ]; then
  export NODE_ENV="production"
fi

# Dynamic non-colliding internal ports for NestJS and Next.js
NEST_INTERNAL_PORT=4001
NEXT_INTERNAL_PORT=4002

if [ "$RENDER_EXTERNAL_PORT" = "$NEST_INTERNAL_PORT" ]; then
  NEST_INTERNAL_PORT=4011
fi
if [ "$RENDER_EXTERNAL_PORT" = "$NEXT_INTERNAL_PORT" ]; then
  NEXT_INTERNAL_PORT=4012
fi

# ==============================================================================
# ENVIRONMENT VARIABLES & SECRETS
# ==============================================================================
if [ -z "$JWT_SECRET" ]; then
  export JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
fi

if [ -z "$GEMINI_API_KEY" ]; then
  echo "WARNING: GEMINI_API_KEY is not set. Please configure your GEMINI_API_KEY in Render environment settings."
fi

export GEMINI_MODEL="${GEMINI_MODEL:-gemini-3.5-flash-lite}"
export GEMINI_EMBEDDING_MODEL="${GEMINI_EMBEDDING_MODEL:-gemini-embedding-001}"
export GOOGLE_PROJECT_NAME="${GOOGLE_PROJECT_NAME:-projects/332966178062}"
export GOOGLE_PROJECT_NUMBER="${GOOGLE_PROJECT_NUMBER:-332966178062}"
export CLIENT_PUBLIC_URL="${CLIENT_PUBLIC_URL:-https://botnexa.onrender.com}"
export WEB_ORIGIN="${WEB_ORIGIN:-https://botnexa.onrender.com}"

# ==============================================================================
# DATABASE SETUP (Self-Contained or External Render Postgres)
# ==============================================================================
if [ -z "$DATABASE_URL" ]; then
  echo "No external DATABASE_URL provided. Initializing internal PostgreSQL with pgvector..."
  su - postgres -c "/etc/init.d/postgresql start"
  su - postgres -c "psql -c \"CREATE USER botnexa_user WITH PASSWORD 'botnexa_pass';\" || true"
  su - postgres -c "psql -c \"CREATE DATABASE botnexa_db OWNER botnexa_user;\" || true"
  su - postgres -c "psql -d botnexa_db -c \"CREATE EXTENSION IF NOT EXISTS vector;\" || true"

  export DATABASE_URL="postgresql://botnexa_user:botnexa_pass@localhost:5432/botnexa_db"
  export POSTGRES_HOST="localhost"
  export POSTGRES_PORT="5432"
  export POSTGRES_USER="botnexa_user"
  export POSTGRES_PASSWORD="botnexa_pass"
  export POSTGRES_DB="botnexa_db"
  export POSTGRES_SSL="false"
else
  echo "External DATABASE_URL detected: Connecting to managed PostgreSQL..."
fi

# Ensure uploads directory exists
mkdir -p /app/server/uploads

# ==============================================================================
# REDIS SETUP (Self-Contained or External Managed Redis)
# ==============================================================================
if [ -z "$REDIS_URL" ]; then
  echo "No external REDIS_URL provided. Initializing internal Redis server on port 6379..."
  redis-server --daemonize yes --port 6379 --bind 127.0.0.1
  export REDIS_HOST="127.0.0.1"
  export REDIS_PORT="6379"
  export REDIS_URL="redis://127.0.0.1:6379"
else
  echo "External REDIS_URL detected: Connecting to managed Redis..."
fi

# ==============================================================================
# START INTERNAL APPLICATIONS
# ==============================================================================
# 1. Start NestJS Backend in background on internal port $NEST_INTERNAL_PORT
echo "Starting NestJS API on internal port $NEST_INTERNAL_PORT..."
(cd /app/server && PORT=$NEST_INTERNAL_PORT npm run start:prod) &

# 2. Start Next.js Frontend in background on internal port $NEXT_INTERNAL_PORT
echo "Starting Next.js Frontend on internal port $NEXT_INTERNAL_PORT..."
(cd /app/client && PORT=$NEXT_INTERNAL_PORT BACKEND_INTERNAL_URL="http://127.0.0.1:$NEST_INTERNAL_PORT" npm run start) &

# Wait for internal services to initialize
sleep 3

# ==============================================================================
# CONFIGURE & START NGINX REVERSE PROXY (PUBLIC GATEWAY)
# ==============================================================================
echo "Configuring Nginx reverse proxy on external port $RENDER_EXTERNAL_PORT..."

mkdir -p /run /var/log/nginx /var/cache/nginx
rm -f /etc/nginx/sites-enabled/* /etc/nginx/sites-available/* || true

sed -e "s/__PORT__/$RENDER_EXTERNAL_PORT/g" \
    -e "s/__NEST_PORT__/$NEST_INTERNAL_PORT/g" \
    -e "s/__NEXT_PORT__/$NEXT_INTERNAL_PORT/g" \
    /app/render-infrastructure/nginx.conf.template > /etc/nginx/nginx.conf
nginx -t

echo "======================================================================"
echo "🚀 BotNexa Gateway Running on External Port $RENDER_EXTERNAL_PORT"
echo "🌐 Frontend URL: https://botnexa.onrender.com (proxied to internal :$NEXT_INTERNAL_PORT)"
echo "🔌 Backend API URL: https://botnexa.onrender.com/botnexa-api/ (proxied to internal :$NEST_INTERNAL_PORT)"
echo "📖 Swagger Docs: https://botnexa.onrender.com/botnexa-api/api-docs"
echo "======================================================================"

# Start Nginx in foreground as PID 1
exec nginx -g "daemon off;"
