'use client'

import { useState, useEffect } from 'react'
import { Hotel, MapPin, Users, Calendar, Star } from 'lucide-react'
import { getPlacePhoto } from '@/lib/googleMaps'

interface AccommodationCardProps {
  accommodation: any
  cardNumber?: number
  isStart?: boolean
  isEnd?: boolean
}

export default function AccommodationCard({
  accommodation,
  cardNumber,
  isStart = false,
  isEnd = false
}: AccommodationCardProps) {
  const [locationImage, setLocationImage] = useState<string | null>(null)
  const [imageLoading, setImageLoading] = useState(false)

  const openGoogleMaps = (location: string) => {
    const query = encodeURIComponent(location)
    window.open(`https://www.google.com/maps/search/${query}`, '_blank')
  }

  // Fetch location image when accommodation has a place ID
  useEffect(() => {
    if (accommodation.locationPlaceId && !locationImage && !imageLoading) {
      setImageLoading(true)
      getPlacePhoto(accommodation.locationPlaceId)
        .then((photoUrl) => {
          setLocationImage(photoUrl)
        })
        .catch((error) => {
          console.error('Error fetching place photo:', error)
        })
        .finally(() => {
          setImageLoading(false)
        })
    }
  }, [accommodation.locationPlaceId, locationImage, imageLoading])

  const getCardTitle = () => {
    if (isStart) return 'Start of Day - Accommodation'
    if (isEnd) return 'End of Day - Return to Accommodation'
    return 'Accommodation'
  }

  const getCardColor = () => {
    if (isStart) return 'bg-green-50 border-green-200'
    if (isEnd) return 'bg-purple-50 border-purple-200'
    return 'bg-blue-50 border-blue-200'
  }

  const getNumberColor = () => {
    if (isStart) return 'bg-green-600'
    if (isEnd) return 'bg-purple-600'
    return 'bg-blue-600'
  }

  return (
    <div className={`rounded-lg shadow-sm border p-4 ${getCardColor()}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-2">
            {cardNumber && (
              <div className={`flex-shrink-0 w-8 h-8 text-white rounded-full flex items-center justify-center text-sm font-bold ${getNumberColor()}`}>
                {cardNumber}
              </div>
            )}
            <div className="flex items-center space-x-2">
              <Hotel className="h-5 w-5 text-gray-600" />
              <h4 className="text-lg font-semibold text-gray-900">{getCardTitle()}</h4>
            </div>
          </div>

          <div className="ml-11">
            <div className="flex items-center space-x-2 mb-2">
              <h5 className="text-md font-medium text-gray-800">{accommodation.name}</h5>
              {accommodation.type && (
                <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full capitalize">
                  {accommodation.type}
                </span>
              )}
            </div>

            {/* Location Image */}
            {locationImage && (
              <div className="mb-3">
                <img
                  src={locationImage}
                  alt={accommodation.location || 'Accommodation'}
                  className="w-full h-40 object-cover rounded-lg"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                  }}
                />
              </div>
            )}

            {/* Loading state for image */}
            {imageLoading && accommodation.locationPlaceId && (
              <div className="mb-3 w-full h-40 bg-gray-200 rounded-lg flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            )}

            <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-3">
              {accommodation.location && (
                <button
                  onClick={() => openGoogleMaps(accommodation.location)}
                  className="flex items-center hover:text-blue-600 transition-colors"
                >
                  <MapPin className="h-4 w-4 mr-1" />
                  {accommodation.location}
                </button>
              )}
              
              {accommodation.guests && (
                <span className="flex items-center">
                  <Users className="h-4 w-4 mr-1" />
                  {accommodation.guests} guests
                </span>
              )}

              {accommodation.checkIn && accommodation.checkOut && (
                <span className="flex items-center">
                  <Calendar className="h-4 w-4 mr-1" />
                  {new Date(accommodation.checkIn).toLocaleDateString()} - {new Date(accommodation.checkOut).toLocaleDateString()}
                </span>
              )}

              {accommodation.pricePerNight && (
                <span className="font-medium text-green-600">
                  ${accommodation.pricePerNight}/night
                </span>
              )}
            </div>

            {/* Amenities */}
            {accommodation.amenities && accommodation.amenities.length > 0 && (
              <div className="mb-3">
                <div className="flex flex-wrap gap-1">
                  {accommodation.amenities.slice(0, 4).map((amenity: string) => (
                    <span key={amenity} className="px-2 py-1 bg-white bg-opacity-60 text-gray-700 text-xs rounded border">
                      {amenity.charAt(0).toUpperCase() + amenity.slice(1)}
                    </span>
                  ))}
                  {accommodation.amenities.length > 4 && (
                    <span className="px-2 py-1 bg-white bg-opacity-60 text-gray-700 text-xs rounded border">
                      +{accommodation.amenities.length - 4} more
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Notes */}
            {accommodation.notes && (
              <p className="text-sm text-gray-600 italic">
                "{accommodation.notes}"
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}