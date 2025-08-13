'use client'

import { useCallback } from 'react'
import { X } from 'lucide-react'
import LocationSearch from './LocationSearch'

interface NewAccommodation {
  name: string
  type: 'hotel' | 'hostel' | 'apartment' | 'bnb' | 'resort' | 'other'
  location: string
  locationPlaceId: string
  locationLat: number | null
  locationLng: number | null
  photoUrl: string
  checkIn: string
  nights: number
  guests: number
  amenities: string[]
  notes: string
}

interface AddAccommodationModalProps {
  isOpen: boolean
  onClose: () => void
  newAccommodation: NewAccommodation
  setNewAccommodation: (updater: (prev: NewAccommodation) => NewAccommodation) => void
  onSubmit: (e?: React.FormEvent) => void
}

export default function AddAccommodationModal({
  isOpen,
  onClose,
  newAccommodation,
  setNewAccommodation,
  onSubmit
}: AddAccommodationModalProps) {
  const fetchPlacePhoto = useCallback(async (placeId: string): Promise<string | null> => {
    if (!placeId) return null
    
    try {
      const { loadGoogleMaps } = await import('../lib/googleMaps')
      const google = await loadGoogleMaps()
      
      if (!google) {
        console.warn('Google Maps failed to load, photo fetching unavailable')
        return null
      }

      return new Promise((resolve) => {
        try {
          const service = new google.maps.places.PlacesService(document.createElement('div'))
          
          service.getDetails({
            placeId: placeId,
            fields: ['photos']
          }, (place: any, status: any) => {
            try {
              if (status === google.maps.places.PlacesServiceStatus.OK && place?.photos && place.photos.length > 0) {
                // Get the first photo URL with appropriate size
                const photoUrl = place.photos[0].getUrl({ maxWidth: 400, maxHeight: 300 })
                resolve(photoUrl)
              } else {
                if (status !== google.maps.places.PlacesServiceStatus.OK) {
                  console.warn('Places API request failed with status:', status)
                }
                resolve(null)
              }
            } catch (error) {
              console.warn('Error processing place details:', error)
              resolve(null)
            }
          })
        } catch (error) {
          console.warn('Error creating places service:', error)
          resolve(null)
        }
      })
    } catch (error) {
      console.warn('Error loading Google Maps for photo fetching:', error)
      return null
    }
  }, [])

  const toggleAmenity = (amenity: string) => {
    const updatedAmenities = newAccommodation.amenities.includes(amenity)
      ? newAccommodation.amenities.filter(a => a !== amenity)
      : [...newAccommodation.amenities, amenity]
    
    setNewAccommodation(prev => ({
      ...prev,
      amenities: updatedAmenities
    }))
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-60 flex items-start justify-center pt-8 p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[85vh] overflow-y-auto">
        <div className="sticky top-0 bg-white px-6 py-4 border-b border-gray-200 rounded-t-lg">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Add Accommodation</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        
        <div className="px-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location *</label>
              <LocationSearch
                value={newAccommodation.location}
                onChange={async (location, placeData) => {
                  const placeId = placeData?.place_id || ''
                  let photoUrl = ''

                  // Fetch photo if we have a place ID
                  if (placeId) {
                    const photo = await fetchPlacePhoto(placeId)
                    photoUrl = photo || ''
                  }

                  // Auto-populate name from place name if name is empty
                  const placeName = placeData?.name || ''

                  setNewAccommodation(prev => ({
                    ...prev,
                    location,
                    locationPlaceId: placeId,
                    locationLat: placeData?.geometry.location.lat || null,
                    locationLng: placeData?.geometry.location.lng || null,
                    photoUrl: photoUrl,
                    // Only populate name if it's currently empty
                    name: prev.name.trim() === '' ? placeName : prev.name,
                  }))
                }}
                placeholder="Search for accommodation location..."
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <input
                type="text"
                value={newAccommodation.name}
                onChange={(e) => setNewAccommodation(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Hotel California"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={newAccommodation.type}
                onChange={(e) => setNewAccommodation(prev => ({ ...prev, type: e.target.value as any }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="hotel">Hotel</option>
                <option value="hostel">Hostel</option>
                <option value="apartment">Apartment</option>
                <option value="bnb">B&B / Airbnb</option>
                <option value="resort">Resort</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Guests</label>
              <input
                type="number"
                min="1"
                value={newAccommodation.guests}
                onChange={(e) => setNewAccommodation(prev => ({ ...prev, guests: parseInt(e.target.value) || 1 }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Check-in</label>
              <input
                type="date"
                value={newAccommodation.checkIn}
                onChange={(e) => setNewAccommodation(prev => ({ ...prev, checkIn: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nights</label>
              <select
                value={newAccommodation.nights}
                onChange={(e) => setNewAccommodation(prev => ({ ...prev, nights: parseInt(e.target.value) }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {Array.from({ length: 30 }, (_, i) => i + 1).map(nights => (
                  <option key={nights} value={nights}>
                    {nights} night{nights !== 1 ? 's' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Amenities</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {[
                { value: 'wifi', label: 'WiFi' },
                { value: 'parking', label: 'Parking' },
                { value: 'breakfast', label: 'Breakfast' },
                { value: 'restaurant', label: 'Restaurant' },
                { value: 'pool', label: 'Pool' },
                { value: 'gym', label: 'Gym' },
                { value: 'spa', label: 'Spa' },
                { value: 'laundry', label: 'Laundry' }
              ].map(amenity => (
                <label key={amenity.value} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={newAccommodation.amenities.includes(amenity.value)}
                    onChange={() => toggleAmenity(amenity.value)}
                    className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                  <span>{amenity.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={newAccommodation.notes || ''}
              onChange={(e) => setNewAccommodation(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Special requests, booking reference, etc."
              rows={2}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>

        <div className="sticky bottom-0 bg-white px-6 py-4 border-t border-gray-200 rounded-b-lg">
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onSubmit}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
            >
              Add Accommodation
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}