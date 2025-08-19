'use client'

import { useState, useEffect, useCallback } from 'react'
import LocationSearch from './LocationSearch'

interface WishlistItem {
  id: string
  placeId: string
  placeName: string
  placeVicinity?: string
  placeRating?: number
  placePhotoReference?: string
  itineraryId: string
  gptTimeframe?: string
  gptDuration?: number
  locationLat?: number
  locationLng?: number
  createdAt: string
}

interface NewActivity {
  title: string
  description: string
  location: string
  locationPlaceId: string
  locationLat: number | null
  locationLng: number | null
  placePhotoReference: string
  startTime: string
  duration: string
}

interface AddActivityModalProps {
  isOpen: boolean
  onClose: () => void
  newActivity: NewActivity
  setNewActivity: (updater: (prev: NewActivity) => NewActivity) => void
  onSubmit: (e: React.FormEvent) => void
  itineraryId: string
  suggestedStartTime?: string // Auto-calculated start time based on previous activity
  previousActivityLocation?: { lat: number; lng: number } // Location of previous activity for distance sorting
}

// Helper function to calculate distance between two points using Haversine formula
const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371 // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  return R * c // Distance in kilometers
}

// Helper function to check if an activity timeframe matches the current start time
const isTimeframeMatch = (gptTimeframe: string | undefined, startTime: string): boolean => {
  if (!gptTimeframe || !startTime) return false
  
  const [hours] = startTime.split(':').map(Number)
  
  switch (gptTimeframe.toLowerCase()) {
    case 'morning':
      return hours >= 6 && hours < 12
    case 'afternoon':
      return hours >= 12 && hours < 17
    case 'evening':
      return hours >= 17 && hours < 21
    case 'night':
      return hours >= 21 || hours < 6
    case 'anytime':
      return true
    default:
      return false
  }
}

export default function AddActivityModal({
  isOpen,
  onClose,
  newActivity,
  setNewActivity,
  onSubmit,
  itineraryId,
  suggestedStartTime,
  previousActivityLocation
}: AddActivityModalProps) {
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([])
  const [availableWishlistItems, setAvailableWishlistItems] = useState<WishlistItem[]>([])
  const [selectedWishlistItem, setSelectedWishlistItem] = useState<WishlistItem | null>(null)
  const [isManualLocation, setIsManualLocation] = useState(false)
  const [loading, setLoading] = useState(false)

  // Set default start time when modal opens if no suggested time and no current start time
  useEffect(() => {
    if (isOpen && !suggestedStartTime && !newActivity.startTime) {
      setNewActivity(prev => ({
        ...prev,
        startTime: '09:00' // Default day start time
      }))
    } else if (isOpen && suggestedStartTime && suggestedStartTime !== newActivity.startTime) {
      setNewActivity(prev => ({
        ...prev,
        startTime: suggestedStartTime
      }))
    }
  }, [isOpen, suggestedStartTime, newActivity.startTime, setNewActivity])

  // Fetch wishlist items and itinerary activities when modal opens
  useEffect(() => {
    if (isOpen && itineraryId) {
      fetchWishlistItems()
    }
  }, [isOpen, itineraryId, fetchWishlistItems])

  // Set suggested start time when modal opens
  useEffect(() => {
    if (isOpen && suggestedStartTime && !newActivity.startTime) {
      setNewActivity(prev => ({ ...prev, startTime: suggestedStartTime }))
    }
  }, [isOpen, suggestedStartTime, newActivity.startTime, setNewActivity])

  const fetchWishlistItems = useCallback(async () => {
    setLoading(true)
    try {
      // Fetch both wishlist items and itinerary data in parallel
      const [wishlistResponse, itineraryResponse] = await Promise.all([
        fetch(`/api/wishlist?itineraryId=${itineraryId}`),
        fetch(`/api/itineraries/${itineraryId}`)
      ])

      if (wishlistResponse.ok && itineraryResponse.ok) {
        const [wishlistData, itineraryData] = await Promise.all([
          wishlistResponse.json(),
          itineraryResponse.json()
        ])

        const allWishlistItems = wishlistData.items || []
        setWishlistItems(allWishlistItems)

        // Get all place IDs that are already in the itinerary
        const activitiesInItinerary = itineraryData.days?.flatMap((day: any) => 
          day.activities?.map((activity: any) => activity.locationPlaceId).filter(Boolean) || []
        ) || []

        // Filter out wishlist items that are already in the itinerary
        let availableItems = allWishlistItems.filter((item: WishlistItem) => 
          !activitiesInItinerary.includes(item.placeId)
        )

        // Sort items by time matching first, then by distance if available
        if (availableItems.length > 0) {
          // Separate items with and without coordinates
          const itemsWithCoords = availableItems.filter((item: WishlistItem) => item.locationLat && item.locationLng)
          const itemsWithoutCoords = availableItems.filter((item: WishlistItem) => !item.locationLat || !item.locationLng)
          
          // Sort items with coordinates
          if (itemsWithCoords.length > 0) {
            itemsWithCoords.sort((a: WishlistItem, b: WishlistItem) => {
              // First priority: time matching
              const aTimeMatch = isTimeframeMatch(a.gptTimeframe, newActivity.startTime)
              const bTimeMatch = isTimeframeMatch(b.gptTimeframe, newActivity.startTime)
              
              if (aTimeMatch && !bTimeMatch) return -1
              if (!aTimeMatch && bTimeMatch) return 1
              
              // Second priority: distance (if we have a reference location)
              if (previousActivityLocation) {
                const distanceA = calculateDistance(
                  previousActivityLocation.lat,
                  previousActivityLocation.lng,
                  a.locationLat!,
                  a.locationLng!
                )
                const distanceB = calculateDistance(
                  previousActivityLocation.lat,
                  previousActivityLocation.lng,
                  b.locationLat!,
                  b.locationLng!
                )
                return distanceA - distanceB
              }
              
              return 0 // No preference if no distance sorting
            })
          }
          
          // Sort items without coordinates by time matching only
          if (itemsWithoutCoords.length > 0) {
            itemsWithoutCoords.sort((a: WishlistItem, b: WishlistItem) => {
              const aTimeMatch = isTimeframeMatch(a.gptTimeframe, newActivity.startTime)
              const bTimeMatch = isTimeframeMatch(b.gptTimeframe, newActivity.startTime)
              
              if (aTimeMatch && !bTimeMatch) return -1
              if (!aTimeMatch && bTimeMatch) return 1
              return 0
            })
          }
          
          // Combine: items with coords first, then items without coords
          availableItems = [...itemsWithCoords, ...itemsWithoutCoords]
        }

        setAvailableWishlistItems(availableItems)
      }
    } catch (error) {
      console.error('Error fetching wishlist:', error)
    } finally {
      setLoading(false)
    }
  }, [itineraryId, newActivity.startTime, previousActivityLocation])

  const handleWishlistSelection = (item: WishlistItem) => {
    setSelectedWishlistItem(item)
    setIsManualLocation(false)
    
    // Create a comprehensive description from available data
    let description = ''
    if (item.placeVicinity) {
      description = `Located at: ${item.placeVicinity}`
    }
    
    setNewActivity(prev => ({
      ...prev,
      title: item.placeName,
      description: description, // Set a meaningful description
      location: item.placeVicinity || item.placeName,
      locationPlaceId: item.placeId,
      locationLat: item.locationLat || null,
      locationLng: item.locationLng || null,
      placePhotoReference: item.placePhotoReference || '',
      duration: item.gptDuration ? item.gptDuration.toString() : prev.duration
    }))
  }

  const handleManualLocation = () => {
    setSelectedWishlistItem(null)
    setIsManualLocation(true)
    // Clear location data and reset title/description for manual entry
    setNewActivity(prev => ({
      ...prev,
      location: '',
      locationPlaceId: '',
      locationLat: null,
      locationLng: null,
      placePhotoReference: '',
      title: '', // Reset title for manual entry
      description: '' // Reset description for manual entry
    }))
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center pt-8 p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Activity</h3>
        <form onSubmit={onSubmit} className="space-y-4">
          
          {/* Location Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
            
            {/* Location Source Selection */}
            <div className="flex gap-3 mb-3">
              <button
                type="button"
                onClick={handleManualLocation}
                className={`px-3 py-2 text-sm rounded-md border transition-colors ${
                  isManualLocation 
                    ? 'bg-sunset-coral-600 text-white border-sunset-coral-600' 
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                Manual Entry
              </button>
              <button
                type="button"
                onClick={() => setIsManualLocation(false)}
                className={`px-3 py-2 text-sm rounded-md border transition-colors ${
                  !isManualLocation 
                    ? 'bg-sunset-coral-600 text-white border-sunset-coral-600' 
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                From Wishlist ({availableWishlistItems.length})
              </button>
            </div>

            {/* Manual Location Entry */}
            {isManualLocation ? (
              <LocationSearch
                value={newActivity.location}
                onChange={(location, placeData) => {
                  setNewActivity(prev => ({
                    ...prev,
                    location,
                    locationPlaceId: placeData?.place_id || '',
                    locationLat: placeData?.geometry?.location?.lat || null,
                    locationLng: placeData?.geometry?.location?.lng || null,
                    placePhotoReference: '',
                    // Pre-fill title with place name if title is empty and place is selected
                    title: !prev.title.trim() && placeData?.name ? placeData.name : prev.title
                  }))
                }}
                placeholder="Search for a location..."
              />
            ) : (
              /* Wishlist Selection */
              <div className="max-h-48 overflow-y-auto border border-gray-300 rounded-md">
                {loading ? (
                  <div className="p-4 text-center text-gray-500">Loading wishlist...</div>
                ) : availableWishlistItems.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    {wishlistItems.length === 0 
                      ? "No wishlist items available" 
                      : "All wishlist items are already in your itinerary"
                    }
                  </div>
                ) : (
                  <div>
                    {(() => {
                      const hasTimeMatches = availableWishlistItems.some(item => 
                        isTimeframeMatch(item.gptTimeframe, newActivity.startTime)
                      )
                      const hasDistanceSorting = previousActivityLocation && availableWishlistItems.some(item => item.locationLat && item.locationLng)
                      
                      if (hasTimeMatches && hasDistanceSorting) {
                        return (
                          <div className="px-3 py-2 bg-blue-50 border-b border-blue-200 text-xs text-blue-700">
                            🕐 Sorted by time preference, then distance
                          </div>
                        )
                      } else if (hasTimeMatches) {
                        return (
                          <div className="px-3 py-2 bg-blue-50 border-b border-blue-200 text-xs text-blue-700">
                            🕐 Sorted by time preference
                          </div>
                        )
                      } else if (hasDistanceSorting) {
                        return (
                          <div className="px-3 py-2 bg-green-50 border-b border-green-200 text-xs text-green-700">
                            📍 Sorted by distance from your last activity
                          </div>
                        )
                      }
                      return null
                    })()}
                    <div className="space-y-1">
                    {availableWishlistItems.map((item) => {
                      // Calculate distance for display
                      let distance = null
                      if (previousActivityLocation && item.locationLat && item.locationLng) {
                        const distanceKm = calculateDistance(
                          previousActivityLocation.lat,
                          previousActivityLocation.lng,
                          item.locationLat,
                          item.locationLng
                        )
                        distance = distanceKm < 1 
                          ? `${Math.round(distanceKm * 1000)}m`
                          : `${distanceKm.toFixed(1)}km`
                      }

                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleWishlistSelection(item)}
                          className={`w-full text-left p-3 hover:bg-gray-50 border-b border-gray-100 transition-colors ${
                            selectedWishlistItem?.id === item.id ? 'bg-blue-50 border-blue-200' : ''
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <p className="font-medium text-gray-900 text-sm">{item.placeName}</p>
                              {item.placeVicinity && (
                                <p className="text-xs text-gray-600 mt-1">{item.placeVicinity}</p>
                              )}
                            </div>
                            <div className="flex flex-col items-end gap-1 ml-2">
                              {isTimeframeMatch(item.gptTimeframe, newActivity.startTime) && (
                                <span className="text-xs text-purple-600 bg-purple-100 px-2 py-1 rounded font-medium">
                                  🕐 Perfect time
                                </span>
                              )}
                              {distance && (
                                <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">
                                  {distance}
                                </span>
                              )}
                              {item.gptDuration && (
                                <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
                                  {item.gptDuration}min
                                </span>
                              )}
                            </div>
                          </div>
                        </button>
                      )
                    })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Title field - only show when using manual location */}
          {isManualLocation && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                type="text"
                value={newActivity.title}
                onChange={(e) => setNewActivity(prev => ({ ...prev, title: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          )}

          {/* Description field - only show when using manual location */}
          {isManualLocation && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={newActivity.description}
                onChange={(e) => setNewActivity(prev => ({ ...prev, description: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
              <input
                type="time"
                value={newActivity.startTime}
                onChange={(e) => setNewActivity(prev => ({ ...prev, startTime: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Duration (minutes)</label>
              <input
                type="number"
                value={newActivity.duration}
                onChange={(e) => setNewActivity(prev => ({ ...prev, duration: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="0"
              />
            </div>
          </div>


          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-sunset-coral-600 hover:bg-sunset-coral-700 text-white rounded-lg transition-colors"
            >
              Add Activity
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}