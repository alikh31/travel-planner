'use client'

import { Plus, Clock } from 'lucide-react'

interface TimeGapProps {
  startTime?: string
  endTime?: string
  onAddActivity: (suggestedStartTime?: string) => void
  className?: string
  gapType?: 'morning' | 'between' | 'evening' // New prop to handle different gap types
  gapLabel?: string // Custom label for the gap
}

export default function TimeGap({ 
  startTime, 
  endTime,
  onAddActivity,
  className = "",
  gapType = 'between',
  gapLabel
}: TimeGapProps) {
  const calculateTimeGap = () => {
    // Handle special morning/evening gaps
    if (gapType === 'morning') {
      if (!startTime || !endTime) return null
      const start = new Date(`2000-01-01T${startTime}`)
      const end = new Date(`2000-01-01T${endTime}`)
      const diffMs = end.getTime() - start.getTime()
      const diffMinutes = Math.floor(diffMs / (1000 * 60))
      
      if (diffMinutes <= 0) return null
      
      const hours = Math.floor(diffMinutes / 60)
      const minutes = diffMinutes % 60
      
      if (hours > 0 && minutes > 0) {
        return `${hours}h ${minutes}m`
      } else if (hours > 0) {
        return `${hours}h`
      } else {
        return `${minutes}m`
      }
    }
    
    if (gapType === 'evening') {
      if (!startTime) return null
      const start = new Date(`2000-01-01T${startTime}`)
      const defaultEnd = new Date(`2000-01-01T22:00`) // Default evening end
      const diffMs = defaultEnd.getTime() - start.getTime()
      const diffMinutes = Math.floor(diffMs / (1000 * 60))
      
      if (diffMinutes <= 0) return null
      
      const hours = Math.floor(diffMinutes / 60)
      const minutes = diffMinutes % 60
      
      if (hours > 0 && minutes > 0) {
        return `${hours}h ${minutes}m`
      } else if (hours > 0) {
        return `${hours}h`
      } else {
        return `${minutes}m`
      }
    }

    // Original logic for between activities
    if (!startTime || !endTime) return null

    const start = new Date(`2000-01-01T${startTime}`)
    const end = new Date(`2000-01-01T${endTime}`)
    
    // Handle case where end time is next day
    if (end < start) {
      end.setDate(end.getDate() + 1)
    }
    
    const diffMs = end.getTime() - start.getTime()
    const diffMinutes = Math.floor(diffMs / (1000 * 60))
    
    if (diffMinutes <= 0) return null
    
    const hours = Math.floor(diffMinutes / 60)
    const minutes = diffMinutes % 60
    
    if (hours > 0 && minutes > 0) {
      return `${hours}h ${minutes}m`
    } else if (hours > 0) {
      return `${hours}h`
    } else {
      return `${minutes}m`
    }
  }

  const timeGap = calculateTimeGap()
  
  // Don't show if no time gap
  if (!timeGap) return null
  
  // For between activities, check if gap is very small (less than 30 minutes)
  if (gapType === 'between') {
    if (!startTime || !endTime) return null
    const start = new Date(`2000-01-01T${startTime}`)
    const end = new Date(`2000-01-01T${endTime}`)
    if (end < start) end.setDate(end.getDate() + 1)
    const diffMinutes = Math.floor((end.getTime() - start.getTime()) / (1000 * 60))
    
    if (diffMinutes < 30) return null
  }
  
  // For morning/evening gaps, show if there's at least 1 hour available
  if (gapType === 'morning' || gapType === 'evening') {
    let gapMinutes = 0
    
    if (gapType === 'morning' && startTime && endTime) {
      gapMinutes = Math.floor((new Date(`2000-01-01T${endTime}`).getTime() - new Date(`2000-01-01T${startTime}`).getTime()) / (1000 * 60))
    } else if (gapType === 'evening' && startTime) {
      gapMinutes = Math.floor((new Date(`2000-01-01T22:00`).getTime() - new Date(`2000-01-01T${startTime}`).getTime()) / (1000 * 60))
    }
    
    if (gapMinutes < 60) return null
  }

  return (
    <div className={`flex flex-col items-center my-6 ${className}`}>
      <div className="w-full max-w-md bg-gray-50 border border-gray-200 rounded-lg p-4">
        {/* Time Gap Info */}
        <div className="flex items-center justify-between">
          <div className="flex items-center text-sm text-gray-600">
            <Clock className="h-4 w-4 mr-2" />
            <span className="font-medium">{gapLabel || `${timeGap} gap`}</span>
          </div>
          
          <button
            onClick={() => {
              let suggestedTime: string | undefined
              
              if (gapType === 'morning') {
                // Suggest 9:00 AM for morning activities
                suggestedTime = '09:00'
              } else if (gapType === 'evening') {
                // Suggest an hour after the last activity ends
                if (startTime) {
                  const start = new Date(`2000-01-01T${startTime}`)
                  start.setMinutes(start.getMinutes() + 60) // 1 hour buffer
                  suggestedTime = start.toTimeString().slice(0, 5)
                } else {
                  suggestedTime = '19:00' // Default evening time
                }
              } else {
                // Original logic for between activities
                if (startTime) {
                  const start = new Date(`2000-01-01T${startTime}`)
                  start.setMinutes(start.getMinutes() + 15) // 15 minute buffer
                  suggestedTime = start.toTimeString().slice(0, 5)
                }
              }
              
              onAddActivity(suggestedTime)
            }}
            className="flex items-center gap-2 px-3 py-1.5 bg-blue-500 text-white text-sm font-medium rounded-md hover:bg-blue-600 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Activity
          </button>
        </div>
      </div>
    </div>
  )
}