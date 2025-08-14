'use client'

import { useState, useEffect } from 'react'
import { MapPin } from 'lucide-react'
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
}

export default function TravelCardImages({ activities, destination, itineraryId }: TravelCardImagesProps) {
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

      // Fallback to destination-based placeholder if no Google photos available
      if (loadedImages.length === 0) {
        const destinationQuery = encodeURIComponent(destination.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ','))
        loadedImages.push(`https://source.unsplash.com/400x300/?travel,${destinationQuery}&sig=${itineraryId.length}`)
      }

      setImages(loadedImages)
      setIsLoading(false)
    }

    loadImages()
  }, [activities, destination, itineraryId])

  if (isLoading) {
    return (
      <div className="h-48 bg-stone-gray-100 relative overflow-hidden animate-pulse">
        <div className="w-full h-full bg-stone-gray-200"></div>
      </div>
    )
  }

  if (images.length === 0) {
    return (
      <div className="h-48 bg-stone-gray-100 relative overflow-hidden flex items-center justify-center">
        <div className="text-stone-gray-400 text-center">
          <MapPin className="h-8 w-8 mx-auto mb-2" />
          <p className="text-sm">No images available</p>
        </div>
      </div>
    )
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