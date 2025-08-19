#!/usr/bin/env node

// Quick fix script for production database Day.dayIndex issue
// Run this directly: node scripts/quick-fix-db.js

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = process.env.DATABASE_URL?.replace('file:', '') || '/app/data/prod.db';

console.log('🔧 Quick Fix: Day.dayIndex Unique Constraint Violation');
console.log(`📂 Database: ${DB_PATH}`);

// Check if database exists
const fs = require('fs');
if (!fs.existsSync(DB_PATH)) {
    console.log('❌ Database file not found!');
    process.exit(1);
}

const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('❌ Error opening database:', err.message);
        process.exit(1);
    }
    console.log('✅ Connected to SQLite database');
});

// Fix the dayIndex duplicates
const fixQuery = `
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
`;

db.serialize(() => {
    // First show current duplicates
    db.all(`
        SELECT itineraryId, dayIndex, COUNT(*) as count 
        FROM Day 
        GROUP BY itineraryId, dayIndex 
        HAVING COUNT(*) > 1
    `, (err, rows) => {
        if (err) {
            console.error('❌ Error checking duplicates:', err.message);
            return;
        }
        
        if (rows.length > 0) {
            console.log('🔍 Found duplicates:');
            rows.forEach(row => {
                console.log(`  - Itinerary ${row.itineraryId}, dayIndex ${row.dayIndex}: ${row.count} duplicates`);
            });
            
            // Run the fix
            console.log('🔧 Applying fix...');
            db.run(fixQuery, (err) => {
                if (err) {
                    console.error('❌ Error applying fix:', err.message);
                    process.exit(1);
                }
                
                console.log('✅ Fix applied successfully!');
                
                // Verify no duplicates remain
                db.all(`
                    SELECT itineraryId, dayIndex, COUNT(*) as count 
                    FROM Day 
                    GROUP BY itineraryId, dayIndex 
                    HAVING COUNT(*) > 1
                `, (err, rows) => {
                    if (err) {
                        console.error('❌ Error verifying fix:', err.message);
                    } else if (rows.length === 0) {
                        console.log('✅ No duplicates found - fix successful!');
                        console.log('🎉 You can now run: npx prisma db push --accept-data-loss');
                    } else {
                        console.log('❌ Duplicates still exist:', rows);
                    }
                    
                    db.close((err) => {
                        if (err) {
                            console.error(err.message);
                        }
                        console.log('📦 Database connection closed');
                        process.exit(rows.length === 0 ? 0 : 1);
                    });
                });
            });
        } else {
            console.log('✅ No duplicates found - database is clean!');
            db.close();
        }
    });
});