'use client'

import { MapPin } from 'lucide-react'
import ActivitiesMap from './ActivitiesMap'

interface MapSectionProps {
  activities: Array<{
    id: string
    title: string
    location?: string
    locationLat?: number
    locationLng?: number
    startTime?: string
    duration?: number
  }>
  selectedDay: string | null
  hasSelectedDay: boolean
  accommodationLocation?: string
}

export default function MapSection({
  activities,
  selectedDay,
  hasSelectedDay,
  accommodationLocation
}: MapSectionProps) {
  return (
    <div className="h-full bg-white border-l border-gray-200">
      {activities.length > 0 ? (
        <ActivitiesMap
          key={selectedDay}
          activities={activities}
          selectedDay={selectedDay || undefined}
          className="h-full"
          accommodationLocation={accommodationLocation}
        />
      ) : (
        <div className="h-full flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <MapPin className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">
              {hasSelectedDay 
                ? 'No activities with location data for this day' 
                : 'Select a day to view activities on map'
              }
            </p>
          </div>
        </div>
      )}
    </div>
  )
}