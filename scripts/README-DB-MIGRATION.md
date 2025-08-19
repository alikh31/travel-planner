# Database Migration Guide: Day.dayIndex Fix

## Problem

The error `UNIQUE constraint failed: Day.itineraryId, Day.dayIndex` occurs when deploying due to duplicate dayIndex values in the existing production database.

## Root Cause

The `Day` table has a unique constraint on `[itineraryId, dayIndex]` but existing data may have:
- Multiple days with the same dayIndex for the same itinerary
- Missing or incorrect dayIndex values

## Solution Options

### Option 1: Quick Fix (Recommended)

Run the quick fix script directly in production:

```bash
# In production environment
node scripts/quick-fix-db.js
```

This will:
1. Check for duplicate dayIndex values
2. Fix them by reassigning sequential indexes (0, 1, 2, etc.) based on date
3. Verify the fix worked
4. Allow you to then run `npx prisma db push --accept-data-loss`

### Option 2: Using Prisma Client

Run the Node.js migration script:

```bash
# In production environment  
node scripts/reset-day-indexes.js
```

### Option 3: Manual SQL Fix

If you have direct database access:

```bash
# Connect to database
sqlite3 /app/data/prod.db

# Check for duplicates
SELECT itineraryId, dayIndex, COUNT(*) as count 
FROM Day 
GROUP BY itineraryId, dayIndex 
HAVING COUNT(*) > 1;

# Apply the fix
WITH ordered_days AS (
  SELECT 
    id,
    itineraryId,
    date,
    dayIndex,
    ROW_NUMBER() OVER (PARTITION BY itineraryId ORDER BY date, id) - 1 as new_dayIndex
  FROM Day
)
UPDATE Day 
SET dayIndex = (
  SELECT new_dayIndex 
  FROM ordered_days 
  WHERE ordered_days.id = Day.id
);

# Verify fix
SELECT itineraryId, dayIndex, COUNT(*) as count 
FROM Day 
GROUP BY itineraryId, dayIndex 
HAVING COUNT(*) > 1;
```

### Option 4: Full Deployment Script

Use the comprehensive deployment script:

```bash
./scripts/deploy-with-migration.sh
```

This handles backup, migration, and schema application automatically.

## Prevention

The updated Dockerfile now includes automatic migration before schema deployment to prevent this issue in future deployments.

## Verification

After applying any fix, verify success by:

1. Checking no duplicates remain:
```sql
SELECT itineraryId, dayIndex, COUNT(*) as count 
FROM Day 
GROUP BY itineraryId, dayIndex 
HAVING COUNT(*) > 1;
```

2. Running the schema push:
```bash
npx prisma db push --accept-data-loss
```

3. Confirming the application starts successfully.

## Backup

All migration scripts create automatic backups. Manual backup:

```bash
cp /app/data/prod.db /app/data/prod-backup-$(date +%Y%m%d-%H%M%S).db
```