'use client'

import { Plus, Clock } from 'lucide-react'

interface TimeGapProps {
  startTime?: string
  endTime?: string
  onAddActivity: () => void
  className?: string
}

export default function TimeGap({ 
  startTime, 
  endTime,
  onAddActivity,
  className = ""
}: TimeGapProps) {
  const calculateTimeGap = () => {
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
  
  // Don't show if no time gap or gap is very small (less than 30 minutes)
  if (!timeGap || !startTime || !endTime) return null
  
  const start = new Date(`2000-01-01T${startTime}`)
  const end = new Date(`2000-01-01T${endTime}`)
  if (end < start) end.setDate(end.getDate() + 1)
  const diffMinutes = Math.floor((end.getTime() - start.getTime()) / (1000 * 60))
  
  if (diffMinutes < 30) return null

  return (
    <div className={`flex flex-col items-center my-6 ${className}`}>
      <div className="w-full max-w-md bg-gray-50 border border-gray-200 rounded-lg p-4">
        {/* Time Gap Info */}
        <div className="flex items-center justify-between">
          <div className="flex items-center text-sm text-gray-600">
            <Clock className="h-4 w-4 mr-2" />
            <span className="font-medium">{timeGap} gap</span>
          </div>
          
          <button
            onClick={onAddActivity}
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