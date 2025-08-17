'use client'

import { memo } from 'react'
import { MapPin, X } from 'lucide-react'
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
  isMobile?: boolean
  onClose?: () => void
}

const MapSection = memo(function MapSection({
  activities,
  selectedDay,
  hasSelectedDay,
  accommodationLocation,
  isMobile = false,
  onClose
}: MapSectionProps) {
  // For mobile, we'll use the modal mode with back button
  // For desktop, we'll use the embedded mode
  return (
    <>
      {isMobile ? (
        // Mobile: Full-screen modal with back button
        activities.length > 0 ? (
          <ActivitiesMap
            activities={activities}
            selectedDay={selectedDay || undefined}
            onClose={onClose}
            isModal={true}
            accommodationLocation={accommodationLocation}
          />
        ) : (
          // Mobile empty state with back button
          <div className="fixed inset-0 bg-white z-50 flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Activities Map</h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 flex items-center justify-center">
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
          </div>
        )
      ) : (
        // Desktop: Embedded in the layout
        <div className="h-full bg-white border-l border-gray-200">
          {activities.length > 0 ? (
            <ActivitiesMap
              activities={activities}
              selectedDay={selectedDay || undefined}
              className="h-full"
              accommodationLocation={accommodationLocation}
              isModal={false}
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
      )}
    </>
  )
})

export default MapSection