/**
 * Calculate the actual date for a day based on itinerary start date and day index
 * @param startDate - The itinerary start date (Date or string)
 * @param dayIndex - The 0-based day index (0 = first day, 1 = second day, etc.)
 * @returns The calculated date for the specified day
 */
export function getDayDate(startDate: Date | string, dayIndex: number): Date {
  const date = new Date(startDate)
  date.setDate(date.getDate() + dayIndex)
  return date
}

/**
 * Format a day with its calculated date for display
 * @param startDate - The itinerary start date
 * @param dayIndex - The 0-based day index
 * @returns Formatted string like "Day 1 - Mar 15, 2024"
 */
export function formatDayWithDate(startDate: Date | string, dayIndex: number): string {
  const date = getDayDate(startDate, dayIndex)
  return `Day ${dayIndex + 1} - ${date.toLocaleDateString('en-US', { 
    weekday: 'short', 
    month: 'short', 
    day: 'numeric' 
  })}`
}