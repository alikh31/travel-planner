#!/bin/bash

# Production Database Migration Script
# This script fixes the UNIQUE constraint violation for Day.dayIndex

echo "🔧 Starting production database migration..."

# Check if we're in production environment
if [ "$NODE_ENV" != "production" ]; then
    echo "⚠️  This script should only run in production. Current NODE_ENV: $NODE_ENV"
    exit 1
fi

# Backup the database first
echo "📦 Creating database backup..."
BACKUP_FILE="/app/data/prod-backup-$(date +%Y%m%d-%H%M%S).db"
cp /app/data/prod.db "$BACKUP_FILE"
echo "✅ Database backed up to: $BACKUP_FILE"

# Apply the data fix using sqlite3
echo "🔧 Fixing duplicate dayIndex values..."
sqlite3 /app/data/prod.db < /app/scripts/fix-day-indexes.sql

if [ $? -eq 0 ]; then
    echo "✅ Data migration completed successfully"
    
    # Now apply the schema changes
    echo "📊 Applying Prisma schema changes..."
    npx prisma db push --accept-data-loss
    
    if [ $? -eq 0 ]; then
        echo "✅ Schema migration completed successfully"
        echo "🎉 Production database migration completed!"
    else
        echo "❌ Schema migration failed. Restoring backup..."
        cp "$BACKUP_FILE" /app/data/prod.db
        echo "🔄 Database restored from backup"
        exit 1
    fi
else
    echo "❌ Data migration failed. Database unchanged."
    exit 1
fi