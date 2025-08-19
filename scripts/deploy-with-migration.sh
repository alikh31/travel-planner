#!/bin/bash

# Production Deployment Script with Database Migration
# Handles the Day.dayIndex unique constraint issue

set -e  # Exit on any error

echo "🚀 Starting production deployment with database migration..."

# Create backup
echo "📦 Creating database backup..."
BACKUP_DIR="/app/data/backups"
mkdir -p "$BACKUP_DIR"
BACKUP_FILE="$BACKUP_DIR/prod-backup-$(date +%Y%m%d-%H%M%S).db"

if [ -f "/app/data/prod.db" ]; then
    cp /app/data/prod.db "$BACKUP_FILE"
    echo "✅ Database backed up to: $BACKUP_FILE"
else
    echo "ℹ️  No existing database found, skipping backup"
fi

# Check if we need to run the migration
echo "🔍 Checking for Day.dayIndex conflicts..."

# Run the day index fix script
echo "🔧 Running Day.dayIndex migration..."
cd /app
node scripts/reset-day-indexes.js

if [ $? -eq 0 ]; then
    echo "✅ Day index migration completed successfully"
else
    echo "❌ Day index migration failed"
    if [ -f "$BACKUP_FILE" ]; then
        echo "🔄 Restoring backup..."
        cp "$BACKUP_FILE" /app/data/prod.db
    fi
    exit 1
fi

# Generate Prisma client
echo "🔨 Generating Prisma client..."
npx prisma generate

# Push schema changes
echo "📊 Applying Prisma schema..."
npx prisma db push --accept-data-loss

if [ $? -eq 0 ]; then
    echo "✅ Schema migration completed successfully"
    echo "🎉 Deployment completed successfully!"
    
    # Clean up old backups (keep last 5)
    find "$BACKUP_DIR" -name "prod-backup-*.db" -type f | sort -r | tail -n +6 | xargs rm -f
    echo "🧹 Cleaned up old backups"
else
    echo "❌ Schema migration failed"
    if [ -f "$BACKUP_FILE" ]; then
        echo "🔄 Restoring backup..."
        cp "$BACKUP_FILE" /app/data/prod.db
    fi
    exit 1
fi