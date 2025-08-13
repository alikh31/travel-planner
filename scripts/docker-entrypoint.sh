#!/bin/sh

# Docker entrypoint script for Travel Planner
set -e

echo "🚀 Starting Travel Planner..."

# Ensure data directory exists and has correct permissions
if [ ! -d "/app/data" ]; then
    echo "📁 Creating data directory..."
    mkdir -p /app/data
fi

# Check if database exists, if not initialize it
if [ ! -f "/app/data/prod.db" ]; then
    echo "🗄️ Initializing database..."
    
    # Run Prisma migrations to create the database
    npx prisma db push --accept-data-loss
    
    echo "✅ Database initialized successfully"
else
    echo "📊 Database already exists, checking for updates..."
    
    # Apply any pending migrations
    npx prisma db push
    
    echo "✅ Database updated successfully"
fi

# Start the application
echo "🌟 Starting Next.js application..."
exec "$@"