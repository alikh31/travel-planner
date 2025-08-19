-- Fix duplicate dayIndex values for Days table
-- This script ensures each itinerary has unique dayIndex values (0, 1, 2, etc.)

-- First, let's see what duplicates exist
SELECT itineraryId, dayIndex, COUNT(*) as duplicate_count 
FROM Day 
GROUP BY itineraryId, dayIndex 
HAVING COUNT(*) > 1;

-- Update dayIndex values to be sequential starting from 0 for each itinerary
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

-- Verify the fix
SELECT itineraryId, dayIndex, COUNT(*) as count 
FROM Day 
GROUP BY itineraryId, dayIndex 
ORDER BY itineraryId, dayIndex;