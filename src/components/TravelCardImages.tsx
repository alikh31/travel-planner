'use client'

import { useState, useEffect } from 'react'
import { Calendar, Compass } from 'lucide-react'
import { getPlacePhoto } from '@/lib/googleMaps'

interface Activity {
  title: string
  startTime?: string
  locationPlaceId?: string
}

interface TravelCardImagesProps {
  activities: Activity[]
  destination: string
  itineraryId: string
  totalActivities: number
}

export default function TravelCardImages({ activities, destination, itineraryId, totalActivities }: TravelCardImagesProps) {
  const [images, setImages] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadImages = async () => {
      const loadedImages: string[] = []
      
      // Get up to 4 activities with place IDs
      const activitiesWithPlaceIds = activities
        .filter(activity => activity.locationPlaceId)
        .slice(0, 4)

      // Try to get Google Place photos
      for (const activity of activitiesWithPlaceIds) {
        if (activity.locationPlaceId) {
          try {
            const photoUrl = await getPlacePhoto(activity.locationPlaceId)
            if (photoUrl) {
              loadedImages.push(photoUrl)
            }
          } catch (error) {
            console.warn('Error getting place photo for', activity.title, error)
          }
        }
      }

      // Fallback to destination-based placeholder if no Google photos available and there are activities
      if (loadedImages.length === 0 && totalActivities > 0) {
        const destinationQuery = encodeURIComponent(destination.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ','))
        loadedImages.push(`https://source.unsplash.com/400x300/?travel,${destinationQuery}&sig=${itineraryId.length}`)
      }

      setImages(loadedImages)
      setIsLoading(false)
    }

    loadImages()
  }, [activities, destination, itineraryId, totalActivities])

  if (isLoading) {
    return (
      <div className="h-48 bg-stone-gray-100 relative overflow-hidden animate-pulse">
        <div className="w-full h-full bg-stone-gray-200"></div>
      </div>
    )
  }

  // Show different placeholders based on the situation
  if (images.length === 0) {
    if (totalActivities === 0) {
      // No activities at all - show planning placeholder
      return (
        <div className="h-48 bg-gradient-to-br from-stone-gray-50 to-stone-gray-100 relative overflow-hidden flex items-center justify-center">
          <div className="text-stone-gray-400 text-center">
            <Calendar className="h-12 w-12 mx-auto mb-3 text-stone-gray-300" />
            <p className="text-sm font-medium mb-1">Planning in Progress</p>
            <p className="text-xs text-stone-gray-400">No activities added yet</p>
          </div>
        </div>
      )
    } else {
      // Has activities but no location data - show location placeholder
      return (
        <div className="h-48 bg-gradient-to-br from-ocean-blue-50 to-sky-aqua-50 relative overflow-hidden flex items-center justify-center">
          <div className="text-ocean-blue-400 text-center">
            <Compass className="h-12 w-12 mx-auto mb-3 text-ocean-blue-300" />
            <p className="text-sm font-medium mb-1">{destination}</p>
            <p className="text-xs text-ocean-blue-400">{totalActivities} activit{totalActivities !== 1 ? 'ies' : 'y'} planned</p>
          </div>
        </div>
      )
    }
  }

  return (
    <div className="h-48 bg-stone-gray-100 relative overflow-hidden">
      {images.length === 1 ? (
        // Single image - full width
        <img
          src={images[0]}
          alt={`${destination} travel`}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
          onError={(e) => {
            // Fallback to a gradient background
            const target = e.target as HTMLImageElement
            target.style.display = 'none'
          }}
        />
      ) : (
        // Multiple images layout: 1 central + 3 vertical on right
        <div className="flex h-full">
          {/* Main image - left side (2/3 width) */}
          <div className="flex-1 relative">
            <img
              src={images[0]}
              alt={`${destination} travel`}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
              onError={(e) => {
                const target = e.target as HTMLImageElement
                target.style.display = 'none'
              }}
            />
          </div>
          {/* Side images - right column (1/3 width) */}
          <div className="w-1/3 flex flex-col">
            {images.slice(1, 4).map((img, idx) => (
              <div key={idx} className="flex-1 relative border-l border-white">
                <img
                  src={img}
                  alt={`${destination} ${idx + 1}`}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement
                    target.style.display = 'none'
                  }}
                />
                {/* Separator line between vertical images */}
                {idx < images.slice(1, 4).length - 1 && (
                  <div className="absolute bottom-0 left-0 right-0 h-px bg-white" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}