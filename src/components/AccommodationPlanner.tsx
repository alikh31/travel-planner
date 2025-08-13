'use client'

import { useState, useEffect } from 'react'
import { Hotel, ChevronDown, ChevronUp, MapPin, Star, DollarSign, Calendar, Users, Wifi, Car, Coffee, Utensils } from 'lucide-react'

interface AccommodationPlannerProps {
  itineraryId: string
  className?: string
  onAccommodationsChange?: () => void
  itineraryDays?: Array<{ id: string; date: string }> // Keep for compatibility
  memberCount?: number // Keep for compatibility  
  onAddAccommodation?: () => void
}

interface Accommodation {
  id?: string
  name: string
  type: 'hotel' | 'hostel' | 'apartment' | 'bnb' | 'resort' | 'other'
  location: string
  locationPlaceId?: string
  locationLat?: number
  locationLng?: number
  photoUrl?: string
  checkIn: string
  nights: number
  guests: number
  pricePerNight?: number
  totalPrice?: number
  rating?: number
  amenities: string[]
  notes?: string
  bookingReference?: string
  contactInfo?: string
}

const accommodationTypes = [
  { value: 'hotel', label: 'Hotel', icon: Hotel },
  { value: 'hostel', label: 'Hostel', icon: Hotel },
  { value: 'apartment', label: 'Apartment', icon: Hotel },
  { value: 'bnb', label: 'B&B / Airbnb', icon: Hotel },
  { value: 'resort', label: 'Resort', icon: Hotel },
  { value: 'other', label: 'Other', icon: Hotel }
]

const commonAmenities = [
  { value: 'wifi', label: 'WiFi', icon: Wifi },
  { value: 'parking', label: 'Parking', icon: Car },
  { value: 'breakfast', label: 'Breakfast', icon: Coffee },
  { value: 'restaurant', label: 'Restaurant', icon: Utensils },
  { value: 'pool', label: 'Pool', icon: Hotel },
  { value: 'gym', label: 'Gym', icon: Hotel },
  { value: 'spa', label: 'Spa', icon: Hotel },
  { value: 'laundry', label: 'Laundry', icon: Hotel }
]

export default function AccommodationPlanner({ 
  itineraryId, 
  className = "",
  onAccommodationsChange,
  onAddAccommodation
}: AccommodationPlannerProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [accommodations, setAccommodations] = useState<Accommodation[]>([])

  // Remember expansion state using localStorage
  const storageKey = `accommodation-expanded-${itineraryId}`

  useEffect(() => {
    // Load expansion state from localStorage
    const savedExpanded = localStorage.getItem(storageKey)
    if (savedExpanded !== null && savedExpanded !== undefined) {
      try {
        setIsExpanded(JSON.parse(savedExpanded))
      } catch (error) {
        // Invalid JSON, ignore and use default
        console.warn('Invalid JSON in localStorage for key:', storageKey)
      }
    }
    
    // Load accommodations for this itinerary
    loadAccommodations()
  }, [itineraryId])

  const toggleExpanded = () => {
    const newExpanded = !isExpanded
    setIsExpanded(newExpanded)
    localStorage.setItem(storageKey, JSON.stringify(newExpanded))
  }

  const loadAccommodations = async () => {
    // TODO: Implement API call to load accommodations
    // For now, use localStorage as mock storage
    try {
      const savedAccommodations = localStorage.getItem(`accommodations-${itineraryId}`)
      if (savedAccommodations) {
        setAccommodations(JSON.parse(savedAccommodations))
      }
    } catch (error) {
      console.error('Error loading accommodations:', error)
    }
  }

  const saveAccommodations = (updatedAccommodations: Accommodation[]) => {
    // TODO: Implement API call to save accommodations
    // For now, use localStorage as mock storage
    try {
      localStorage.setItem(`accommodations-${itineraryId}`, JSON.stringify(updatedAccommodations))
      setAccommodations(updatedAccommodations)
      onAccommodationsChange?.() // Notify parent of changes
    } catch (error) {
      console.error('Error saving accommodations:', error)
    }
  }

  const handleRemoveAccommodation = (id: string) => {
    const updatedAccommodations = accommodations.filter(acc => acc.id !== id)
    saveAccommodations(updatedAccommodations)
  }

  const getCheckOutDate = (checkIn: string, nights: number) => {
    if (!checkIn || !nights) return ''
    const checkInDate = new Date(checkIn)
    const checkOutDate = new Date(checkInDate.getTime() + nights * 24 * 60 * 60 * 1000)
    return checkOutDate.toISOString().split('T')[0]
  }



  return (
    <div className={`bg-white border border-gray-200 rounded-lg shadow-sm ${className}`}>
      {/* Header */}
      <button
        onClick={toggleExpanded}
        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-50 rounded-t-lg"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
            <Hotel className="h-4 w-4 text-purple-600" />
          </div>
          <div>
            <h3 className="font-medium text-gray-900">Accommodations</h3>
            <p className="text-sm text-gray-500">
              {accommodations.length === 0 
                ? 'Add hotels, hostels, or other stays'
                : `${accommodations.length} accommodation${accommodations.length !== 1 ? 's' : ''} planned`
              }
            </p>
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-5 w-5 text-gray-400" />
        ) : (
          <ChevronDown className="h-5 w-5 text-gray-400" />
        )}
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-gray-200 p-4 space-y-4">
          {/* Existing Accommodations */}
          {accommodations.map((accommodation) => (
            <div key={accommodation.id} className="border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
              <div className="p-4">
                <div className="flex items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Hotel className="h-4 w-4 text-purple-600" />
                      <h4 className="font-medium text-gray-900">{accommodation.name}</h4>
                      <span className="text-xs bg-purple-100 text-purple-600 px-2 py-1 rounded-full">
                        {accommodationTypes.find(t => t.value === accommodation.type)?.label}
                      </span>
                    </div>
                  
                  <div className="space-y-1 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3 w-3" />
                      <span>{accommodation.location}</span>
                    </div>
                    
                    {accommodation.checkIn && accommodation.nights && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3 w-3" />
                        <span>
                          {new Date(accommodation.checkIn).toLocaleDateString()} - {new Date(getCheckOutDate(accommodation.checkIn, accommodation.nights)).toLocaleDateString()}
                          <span className="text-gray-400 ml-1">
                            ({accommodation.nights} night{accommodation.nights !== 1 ? 's' : ''})
                          </span>
                        </span>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2">
                      <Users className="h-3 w-3" />
                      <span>{accommodation.guests} guest{accommodation.guests !== 1 ? 's' : ''}</span>
                    </div>
                    
                    {accommodation.rating && (
                      <div className="flex items-center gap-2">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        <span>{accommodation.rating}/5</span>
                      </div>
                    )}
                    
                    {accommodation.pricePerNight && (
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-3 w-3" />
                        <span>${accommodation.pricePerNight}/night</span>
                        {accommodation.totalPrice && (
                          <span className="text-gray-400">
                            (Total: ${accommodation.totalPrice})
                          </span>
                        )}
                      </div>
                    )}
                    
                    {accommodation.amenities.length > 0 && (
                      <div className="flex items-start gap-2">
                        <span className="text-xs">Amenities:</span>
                        <div className="flex flex-wrap gap-1">
                          {accommodation.amenities.map(amenity => (
                            <span key={amenity} className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded">
                              {commonAmenities.find(a => a.value === amenity)?.label || amenity}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {accommodation.notes && (
                      <div className="text-xs text-gray-500 italic">
                        {accommodation.notes}
                      </div>
                    )}
                    </div>
                  </div>
                  
                  {/* Accommodation Image on the right */}
                  <div className="flex flex-col gap-2 relative">
                    {accommodation.photoUrl ? (
                      <div className="relative h-32 w-48 bg-gray-200 rounded-md overflow-hidden flex-shrink-0 group">
                        <img
                          src={accommodation.photoUrl}
                          alt={accommodation.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            // Show placeholder if image fails to load
                            const target = e.target as HTMLImageElement
                            target.style.display = 'none'
                            const parent = target.parentElement
                            if (parent) {
                              parent.innerHTML = `
                                <div class="w-full h-full flex items-center justify-center bg-gray-100">
                                  <div class="text-center text-gray-400">
                                    <svg class="mx-auto h-8 w-8 text-gray-300" fill="currentColor" viewBox="0 0 24 24">
                                      <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5l4-8 2.03 2.71L14 10l5 9z"/>
                                    </svg>
                                    <p class="mt-1 text-xs">Image unavailable</p>
                                  </div>
                                </div>
                              `
                            }
                          }}
                        />
                        <button
                          onClick={() => accommodation.id && handleRemoveAccommodation(accommodation.id)}
                          className="absolute top-2 right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-xs font-bold shadow-lg"
                          title="Remove accommodation"
                        >
                          ×
                        </button>
                      </div>
                    ) : (
                      <div className="relative h-32 w-48 bg-gradient-to-r from-purple-100 to-blue-100 flex items-center justify-center rounded-md flex-shrink-0 group">
                        <div className="text-center text-gray-500">
                          <Hotel className="mx-auto h-8 w-8 text-gray-400" />
                          <p className="mt-1 text-xs">No image</p>
                        </div>
                        <button
                          onClick={() => accommodation.id && handleRemoveAccommodation(accommodation.id)}
                          className="absolute top-2 right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-xs font-bold shadow-lg"
                          title="Remove accommodation"
                        >
                          ×
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}

            {/* Add Accommodation Button */}
            <button
              onClick={onAddAccommodation}
              className="w-full border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-purple-400
 hover:bg-purple-50 transition-colors group"
            >
              <Hotel className="h-6 w-6 text-gray-400 group-hover:text-purple-500 mx-auto mb-2" />
              <span className="text-sm text-gray-600 group-hover:text-purple-600">
                Add Accommodation
              </span>
            </button>
        </div>
      )}
    </div>
  )
}