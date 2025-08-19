/**
 * Time Slot Finder for Wishlist to Itinerary Conversion
 * Finds the first available time slot based on GPT timeframe suggestions
 */

interface Activity {
  startTime: string
  duration: number
  dayIndex: number
}

interface Day {
  dayIndex: number
  date: Date
}

interface TimeSlot {
  dayIndex: number
  startTime: string
  endTime: string
}

// Time slot definitions based on GPT timeframes
const TIMEFRAME_SLOTS = {
  morning: [
    { start: '08:00', end: '12:00' },
    { start: '09:00', end: '12:00' },
    { start: '10:00', end: '12:00' },
  ],
  afternoon: [
    { start: '12:00', end: '18:00' },
    { start: '13:00', end: '17:00' },
    { start: '14:00', end: '18:00' },
    { start: '15:00', end: '18:00' },
  ],
  evening: [
    { start: '18:00', end: '22:00' },
    { start: '19:00', end: '22:00' },
    { start: '20:00', end: '22:00' },
  ],
  night: [
    { start: '20:00', end: '23:59' },
    { start: '21:00', end: '23:59' },
    { start: '22:00', end: '23:59' },
  ],
  anytime: [
    { start: '09:00', end: '18:00' },
    { start: '10:00', end: '16:00' },
    { start: '11:00', end: '17:00' },
    { start: '12:00', end: '18:00' },
    { start: '13:00', end: '19:00' },
    { start: '14:00', end: '20:00' },
  ]
}

/**
 * Convert time string to minutes since midnight
 */
function timeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number)
  return hours * 60 + minutes
}

/**
 * Convert minutes since midnight to time string
 */
function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
}

/**
 * Check if two time ranges overlap
 */
function timeRangesOverlap(
  start1: number, 
  end1: number, 
  start2: number, 
  end2: number
): boolean {
  return start1 < end2 && start2 < end1
}

/**
 * Get available time slots for a specific timeframe
 */
function getTimeframeSlots(timeframe: string): { start: string; end: string }[] {
  const normalizedTimeframe = timeframe.toLowerCase() as keyof typeof TIMEFRAME_SLOTS
  return TIMEFRAME_SLOTS[normalizedTimeframe] || TIMEFRAME_SLOTS.anytime
}

/**
 * Find the first available time slot for an activity
 */
export function findFirstAvailableTimeSlot(
  gptTimeframe: string | null,
  gptDuration: number | null,
  existingActivities: Activity[],
  days: Day[]
): TimeSlot | null {
  const timeframe = gptTimeframe || 'anytime'
  const duration = gptDuration || 60 // Default 60 minutes
  
  const timeSlots = getTimeframeSlots(timeframe)
  
  // Try each day in order
  for (const day of days) {
    const dayActivities = existingActivities.filter(a => a.dayIndex === day.dayIndex)
    
    // Try each time slot for this timeframe
    for (const slot of timeSlots) {
      const slotStartMinutes = timeToMinutes(slot.start)
      const slotEndMinutes = timeToMinutes(slot.end)
      
      // Check if the activity can fit in this time slot
      if (slotEndMinutes - slotStartMinutes < duration) {
        continue // Slot too small
      }
      
      // Find the best start time within this slot
      const latestStartTime = slotEndMinutes - duration
      
      // Try different start times within the slot (every 30 minutes)
      for (let startMinutes = slotStartMinutes; startMinutes <= latestStartTime; startMinutes += 30) {
        const endMinutes = startMinutes + duration
        
        // Check if this time conflicts with existing activities
        const hasConflict = dayActivities.some(activity => {
          const activityStart = timeToMinutes(activity.startTime)
          const activityEnd = activityStart + activity.duration
          
          return timeRangesOverlap(startMinutes, endMinutes, activityStart, activityEnd)
        })
        
        if (!hasConflict) {
          // Found a free slot!
          return {
            dayIndex: day.dayIndex,
            startTime: minutesToTime(startMinutes),
            endTime: minutesToTime(endMinutes)
          }
        }
      }
    }
  }
  
  return null // No available slot found
}

/**
 * Find multiple available time slots (for user to choose from)
 */
export function findAvailableTimeSlots(
  gptTimeframe: string | null,
  gptDuration: number | null,
  existingActivities: Activity[],
  days: Day[],
  maxSlots: number = 5
): TimeSlot[] {
  const timeframe = gptTimeframe || 'anytime'
  const duration = gptDuration || 60
  
  const timeSlots = getTimeframeSlots(timeframe)
  const availableSlots: TimeSlot[] = []
  
  // Try each day in order
  for (const day of days) {
    if (availableSlots.length >= maxSlots) break
    
    const dayActivities = existingActivities.filter(a => a.dayIndex === day.dayIndex)
    
    // Try each time slot for this timeframe
    for (const slot of timeSlots) {
      if (availableSlots.length >= maxSlots) break
      
      const slotStartMinutes = timeToMinutes(slot.start)
      const slotEndMinutes = timeToMinutes(slot.end)
      
      // Check if the activity can fit in this time slot
      if (slotEndMinutes - slotStartMinutes < duration) {
        continue
      }
      
      const latestStartTime = slotEndMinutes - duration
      
      // Try different start times within the slot (every 30 minutes)
      for (let startMinutes = slotStartMinutes; startMinutes <= latestStartTime; startMinutes += 30) {
        if (availableSlots.length >= maxSlots) break
        
        const endMinutes = startMinutes + duration
        
        // Check if this time conflicts with existing activities
        const hasConflict = dayActivities.some(activity => {
          const activityStart = timeToMinutes(activity.startTime)
          const activityEnd = activityStart + activity.duration
          
          return timeRangesOverlap(startMinutes, endMinutes, activityStart, activityEnd)
        })
        
        if (!hasConflict) {
          availableSlots.push({
            dayIndex: day.dayIndex,
            startTime: minutesToTime(startMinutes),
            endTime: minutesToTime(endMinutes)
          })
        }
      }
    }
  }
  
  return availableSlots
}

/**
 * Get human-readable day name for display
 */
export function getDayName(dayIndex: number, startDate: Date): string {
  const dayDate = new Date(startDate)
  dayDate.setDate(dayDate.getDate() + dayIndex)
  
  return dayDate.toLocaleDateString('en-US', { 
    weekday: 'long',
    month: 'short',
    day: 'numeric'
  })
}