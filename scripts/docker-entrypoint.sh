#!/bin/sh

# Docker entrypoint script for Travel Planner
set -e

echo "🚀 Starting Travel Planner..."

# Set OpenSSL and Prisma environment variables
export OPENSSL_CONF=/dev/null
export PRISMA_CLI_BINARY_TARGETS="linux-musl-openssl-3.0.x"
export PRISMA_CLIENT_ENGINE_TYPE="binary"

# Check if running behind a proxy (Cloudflare Tunnel, etc.)
if [ "$TRUST_HOST" = "true" ]; then
    echo "🌐 Running behind proxy - trusting host headers"
    echo "📝 NEXTAUTH_URL: $NEXTAUTH_URL"
else
    echo "🌐 Running in direct mode (no proxy)"
fi

# Ensure DATABASE_URL is properly set for production
if [ -z "$DATABASE_URL" ]; then
    export DATABASE_URL="file:/app/data/prod.db"
    echo "📝 Set default DATABASE_URL to: $DATABASE_URL"
else
    echo "📝 Using DATABASE_URL: $DATABASE_URL"
fi

echo "📝 Prisma target: $PRISMA_CLI_BINARY_TARGETS"

# Ensure data directory exists and has correct permissions
if [ ! -d "/app/data" ]; then
    echo "📁 Creating data directory..."
    mkdir -p /app/data
    chown nextjs:nodejs /app/data
fi

# Skip Prisma client generation in entrypoint - it should be pre-built
echo "🔧 Prisma client already generated during build"

# Check if database exists, if not initialize it
if [ ! -f "/app/data/prod.db" ]; then
    echo "🗄️ Initializing database..."
    
    # Run Prisma migrations to create the database with explicit DATABASE_URL
    DATABASE_URL="file:/app/data/prod.db" npx prisma db push --accept-data-loss --skip-generate
    
    echo "✅ Database initialized successfully"
else
    echo "📊 Database already exists, checking for updates..."
    
    # Apply any pending migrations with explicit DATABASE_URL
    DATABASE_URL="file:/app/data/prod.db" npx prisma db push --skip-generate
    
    echo "✅ Database updated successfully"
fi

# Ensure proper permissions on database
chmod 664 /app/data/prod.db 2>/dev/null || echo "⚠️ Could not set database permissions"

# Start the application
echo "🌟 Starting Next.js application..."
exec "$@"